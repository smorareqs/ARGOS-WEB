/**
 * Logos de las empresas de demostración (seed `demo-tenant` del backend y
 * visuales de la landing). Son marcas inventadas para ARGOS, no de empresas
 * reales. Mientras no exista la subida de logos a S3 (fase01.md §3.8) la API
 * devuelve `logo_url: null`; fuera de producción la web usa estos archivos para
 * esas empresas (token DEMO_TENANT_LOGOS).
 */
export const DEMO_LOGOS = {
  garrent: 'images/empresas/garrent.svg',
  costaLimpia: 'images/empresas/costa-limpia.svg',
  lagoStays: 'images/empresas/lago-stays.svg',
} as const;

const BY_NAME: readonly (readonly [string, string])[] = [
  ['garrent', DEMO_LOGOS.garrent],
  ['costa limpia', DEMO_LOGOS.costaLimpia],
  ['lago stays', DEMO_LOGOS.lagoStays],
];

/** Logo de demostración para una empresa del seed, o null. */
export function demoLogo(tenantName: string): string | null {
  const name = tenantName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
  return BY_NAME.find(([prefix]) => name.startsWith(prefix))?.[1] ?? null;
}
