/** Desarrollo sin backend: todo simulado, con las cuentas de "Modo demo".
 *  `npm run start:mock`. */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000',
  mocks: { auth: true, dashboard: true, properties: true, team: true, demoRequests: true },
  /** Logos de las empresas de demostración (DEMO_TENANT_LOGOS). */
  demoTenantLogos: true,
};
