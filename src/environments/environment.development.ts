/** Entorno de desarrollo: acceso contra la API real (Docker con el backend en
 *  :8000); los módulos que aún no existen en la API siguen simulados. */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000',
  /** true → ese módulo usa su mock (reparto.md §3.1). */
  mocks: { auth: false, dashboard: false, properties: false, team: false, demoRequests: true,
    itinerary: true, inventory: true, maintenance: false, reservations: false, sharedAreas: true, parking: true, hr: false, attendance: false, metrics: false, alerts: false, audit: false, settings: false, billing: false, notifications: true, chat: false },
  /** Logos de las empresas de demostración (DEMO_TENANT_LOGOS). */
  demoTenantLogos: true,
};
