import { InjectionToken } from '@angular/core';

/**
 * URL base de la API de ARGOS (sin el prefijo /api/v1).
 *
 * Regla de arquitectura (ARCHITECTURE.md §2 · Aislamiento de Entornos):
 * las features JAMÁS importan `environment` directamente. Consumen esta
 * URL inyectando el token, que se provee una sola vez en `app.config.ts`.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/** Módulos con implementación mock de su `*-api.service.ts`. */
export type MockModule = 'auth' | 'dashboard' | 'properties' | 'team' | 'demoRequests';

/** true = el módulo usa su mock; false = usa la API real. */
export type MockModules = Readonly<Record<MockModule, boolean>>;

/**
 * Mocks por módulo (reparto.md §3 regla 1): cada `*-api.service.ts` tiene una
 * implementación mock que se usa hasta que su endpoint real esté en `main`. Se
 * decide por módulo para mezclar lo que ya existe en la API (acceso) con lo
 * que todavía no (inicio, propiedades, colaboradores).
 */
export const MOCK_MODULES = new InjectionToken<MockModules>('MOCK_MODULES');

/**
 * true = las empresas de demostración (Garrent, Costa Limpia, Lago Stays) usan
 * los logos de `shared/media/demo-brands.ts` mientras la API no tenga logos
 * (fase01.md §3.8). Apagado en producción.
 */
export const DEMO_TENANT_LOGOS = new InjectionToken<boolean>('DEMO_TENANT_LOGOS', {
  providedIn: 'root',
  factory: () => false,
});
