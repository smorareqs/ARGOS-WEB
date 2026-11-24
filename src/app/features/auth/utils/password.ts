/** Reglas de contraseña del backend (8 a 128 caracteres; fase01.md §3.7.1). */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Error para mostrar junto al campo, o null si la contraseña sirve. */
export function passwordError(value: string): string | null {
  if (!value) return 'Escribe una contraseña.';
  if (value.length < PASSWORD_MIN) return `Usa al menos ${PASSWORD_MIN} caracteres.`;
  if (value.length > PASSWORD_MAX) return `Usa como máximo ${PASSWORD_MAX} caracteres.`;
  return null;
}

/** Fuerza orientativa (0 a 3) para la barra bajo el campo. */
export function passwordStrength(value: string): 0 | 1 | 2 | 3 {
  if (value.length < PASSWORD_MIN) return 0;
  let score = 1;
  if (value.length >= 12) score++;
  if (/[a-záéíóúñ]/i.test(value) && /\d/.test(value) && /[^a-z0-9áéíóúñ]/i.test(value)) score++;
  return Math.min(score, 3) as 1 | 2 | 3;
}

export const STRENGTH_LABEL = ['Muy corta', 'Aceptable', 'Buena', 'Muy buena'] as const;

/** Quita el token de un enlace de la barra de direcciones (no queda en el historial). */
export function stripTokenFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('token')) return;
    url.searchParams.delete('token');
    history.replaceState(history.state, '', url.pathname + (url.search ? url.search : '') + url.hash);
  } catch {
    /* sin History API: el token sigue en la URL, pero ya se leyó */
  }
}
