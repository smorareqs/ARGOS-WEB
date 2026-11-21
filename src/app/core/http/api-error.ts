import { HttpErrorResponse } from '@angular/common/http';

/** Error de campo en un 422 (RFC 9457, como responde el backend Go). */
export interface FieldError {
  readonly location: string;
  readonly message: string;
}

/**
 * Error de API normalizado. Las tiendas solo conocen este tipo: no importa si
 * vino del backend real (problem+json) o del mock.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly errors: readonly FieldError[] = [],
    readonly retryAfter: number | null = null,
  ) {
    super(detail);
  }

  /** Error del campo `location` (ej. "body.code"), si lo hay. */
  field(name: string): string | null {
    return this.errors.find((e) => e.location.endsWith(name))?.message ?? null;
  }
}

/** Convierte cualquier error (HTTP, red o mock) en ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return new ApiError(0, 'No hay conexión con el servidor. Revisa tu red e intenta de nuevo.');
    }
    const body = (err.error ?? {}) as { detail?: string; errors?: FieldError[] };
    const retry = Number(err.headers?.get('Retry-After'));
    return new ApiError(
      err.status,
      body.detail ?? 'Algo salió mal. Intenta de nuevo.',
      body.errors ?? [],
      Number.isFinite(retry) && retry > 0 ? retry : null,
    );
  }
  return new ApiError(500, 'Algo salió mal. Intenta de nuevo.');
}
