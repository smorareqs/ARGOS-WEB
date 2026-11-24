import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../tokens/api.tokens';
import { toApiError } from './api-error';

type Params = Record<string, string | number | boolean | readonly string[]>;

/** Archivo descargado de la API. */
export interface DownloadedFile {
  readonly name: string;
  readonly blob: Blob;
}

/** Con responseType blob, el error JSON también llega como Blob: se lee. */
async function blobError(e: unknown): Promise<unknown> {
  if (e instanceof HttpErrorResponse && e.error instanceof Blob) {
    try {
      const error = JSON.parse(await e.error.text());
      return new HttpErrorResponse({ error, status: e.status, statusText: e.statusText, headers: e.headers, url: e.url ?? undefined });
    } catch {
      return e;
    }
  }
  return e;
}

/**
 * Cliente de `/api/v1` para los servicios HTTP de módulo (`Http*Api`): arma la
 * URL, convierte el Observable en Promise y normaliza errores a `ApiError`.
 * Cada servicio solo declara sus rutas (contratos en faseNN.md).
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api/v1`;

  get<T>(path: string, params?: Params): Promise<T> {
    return this.run(this.http.get<T>(this.url(path), { params: this.params(params) }));
  }

  post<T>(path: string, body: unknown = {}): Promise<T> {
    return this.run(this.http.post<T>(this.url(path), body));
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.run(this.http.patch<T>(this.url(path), body));
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.run(this.http.put<T>(this.url(path), body));
  }

  delete<T>(path: string): Promise<T> {
    return this.run(this.http.delete<T>(this.url(path)));
  }

  /**
   * Descarga un archivo generado por la API (Excel, PDF) con la sesión
   * actual. El nombre sale de Content-Disposition; si no viene, `fallback`.
   */
  async blob(path: string, fallback: string): Promise<DownloadedFile> {
    try {
      const res = await firstValueFrom(this.http.get(this.url(path), { responseType: 'blob', observe: 'response' }));
      const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? fallback;
      return { name, blob: res.body ?? new Blob() };
    } catch (e) {
      throw toApiError(await blobError(e));
    }
  }

  private url(path: string): string {
    return `${this.base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private params(p?: Params): HttpParams | undefined {
    if (!p) return undefined;
    let hp = new HttpParams();
    for (const [k, v] of Object.entries(p)) {
      if (Array.isArray(v)) {
        for (const x of v) hp = hp.append(k, x);
      } else {
        hp = hp.set(k, String(v));
      }
    }
    return hp;
  }

  private async run<T>(req: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(req);
    } catch (e) {
      throw toApiError(e);
    }
  }
}
