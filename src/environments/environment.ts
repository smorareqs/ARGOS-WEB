/** Entorno de producción.
 *  Regla de arquitectura: estas constantes NO se importan en las features.
 *  Se consumen vía InjectionToken (ver core/tokens/api.tokens.ts). */
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.argos.io',
  mocks: { auth: false, dashboard: false, properties: false, team: false, demoRequests: false },
  /** Logos de las empresas de demostración (DEMO_TENANT_LOGOS). */
  demoTenantLogos: false,
};
