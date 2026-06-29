import { InjectionToken } from '@angular/core';

/**
 * URL base de la API de ARGOS.
 *
 * Regla de arquitectura (ARCHITECTURE.md §2 · Aislamiento de Entornos):
 * las features JAMÁS importan `environment` directamente. Consumen esta
 * URL inyectando el token, que se provee una sola vez en `app.config.ts`.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
