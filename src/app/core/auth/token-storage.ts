import { Device } from './auth.models';

/**
 * Persistencia del refresh token (fase01.md §5): en `localStorage` con
 * `device_id` cuando el usuario marca "Recordarme en este equipo" (sesión de
 * 30 días); si no, en `sessionStorage` y se pierde al cerrar el navegador.
 * El access token nunca se persiste: vive en memoria (SessionStore).
 */
const REFRESH_KEY = 'argos.refresh_token';
const DEVICE_KEY = 'argos.device_id';

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export const TokenStorage = {
  readRefresh(): string | null {
    return safe(
      () => localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY),
      null,
    );
  },

  writeRefresh(token: string, remember: boolean): void {
    safe(() => {
      (remember ? localStorage : sessionStorage).setItem(REFRESH_KEY, token);
      (remember ? sessionStorage : localStorage).removeItem(REFRESH_KEY);
    }, undefined);
  },

  /** Reemplaza el token rotado en el mismo almacenamiento donde estaba. */
  rotateRefresh(token: string): void {
    safe(() => {
      const remembered = localStorage.getItem(REFRESH_KEY) !== null;
      (remembered ? localStorage : sessionStorage).setItem(REFRESH_KEY, token);
    }, undefined);
  },

  clearRefresh(): void {
    safe(() => {
      localStorage.removeItem(REFRESH_KEY);
      sessionStorage.removeItem(REFRESH_KEY);
    }, undefined);
  },

  device(): Device {
    let id = safe(() => localStorage.getItem(DEVICE_KEY), null);
    if (!id) {
      id = crypto.randomUUID();
      safe(() => localStorage.setItem(DEVICE_KEY, id!), undefined);
    }
    return { id, name: browserName(), platform: 'web' };
  },
};

function browserName(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Navegador';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} en ${os}` : browser;
}
