/** Entorno de demostración: build optimizado con todo simulado (sin backend).
 *  Se usa en la imagen `web-demo` de docker-compose. */
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8000',
  mocks: { auth: true, dashboard: true, properties: true, team: true, demoRequests: true,
    itinerary: true, inventory: true, maintenance: true, reservations: true, sharedAreas: true, parking: true, hr: true, attendance: true, metrics: true, alerts: true, audit: true, settings: true, billing: true, notifications: true, chat: true },
  /** Logos de las empresas de demostración (DEMO_TENANT_LOGOS). */
  demoTenantLogos: true,
};
