import { Membership } from '../auth/auth.models';
import { FeatureFlag, PERMISSIONS, Permission, ROLE_NAMES, RoleKey } from '../auth/permissions';

/**
 * Semilla de identidad del backend simulado. Refleja `argos seed demo-tenant`
 * (fase01.md §3) para que la web se pruebe sin backend.
 *
 * Cuentas de prueba (solo modo mock). Todas usan DEMO_PASSWORD.
 */
export const DEMO_PASSWORD = 'Argos.2026';
/** Código TOTP aceptado por el mock para la cuenta con 2FA. */
export const DEMO_TOTP_CODE = '246810';

export interface DemoTenant {
  readonly id: string;
  readonly name: string;
  readonly features: Record<FeatureFlag, boolean>;
}

export interface DemoUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly totp: boolean;
  readonly memberships: readonly { tenantId: string; role: RoleKey }[];
  /** Texto corto para el panel de cuentas demo del login. */
  readonly hint: string;
}

export const DEMO_TENANTS: readonly DemoTenant[] = [
  {
    id: 'tn_garrent',
    name: 'Garrent',
    features: { reservations: true, parking: false, shared_areas: true, guest_chat: false, payroll: true },
  },
  {
    id: 'tn_costa',
    name: 'Costa Limpia S.A.',
    features: { reservations: false, parking: false, shared_areas: false, guest_chat: false, payroll: false },
  },
];

export const DEMO_USERS: readonly DemoUser[] = [
  {
    id: 'us_ana',
    email: 'ana.lopez@garrent.gt',
    fullName: 'Ana López',
    totp: false,
    memberships: [{ tenantId: 'tn_garrent', role: 'admin' }],
    hint: 'Administradora · una empresa',
  },
  {
    id: 'us_jorge',
    email: 'jorge.pena@garrent.gt',
    fullName: 'Jorge Peña',
    totp: false,
    memberships: [{ tenantId: 'tn_garrent', role: 'supervisor' }],
    hint: 'Supervisor · menú reducido',
  },
  {
    id: 'us_carlos',
    email: 'carlos.ruiz@argos.gt',
    fullName: 'Carlos Ruiz',
    totp: false,
    memberships: [
      { tenantId: 'tn_garrent', role: 'admin' },
      { tenantId: 'tn_costa', role: 'supervisor' },
    ],
    hint: 'Dos empresas · elige al entrar',
  },
  {
    id: 'us_marta',
    email: 'marta.diaz@garrent.gt',
    fullName: 'Marta Díaz',
    totp: true,
    memberships: [{ tenantId: 'tn_garrent', role: 'admin' }],
    hint: `Con 2FA · código ${DEMO_TOTP_CODE}`,
  },
];

const ALL = [...PERMISSIONS] as Permission[];

/** Matriz de roles por defecto (PRD §3.4). La fuente de verdad es el backend. */
export const ROLE_PERMISSIONS: Record<RoleKey, readonly Permission[]> = {
  admin: ALL,
  supervisor: ALL.filter(
    (p) =>
      ![
        'tenant.settings',
        'tenant.billing',
        'users.manage',
        'roles.manage',
        'properties.manage',
        'guests.manage',
        'guests.documents',
        'deposits.manage',
        'shared_areas.manage',
        'hr.attendance.manage',
        'hr.payroll.manage',
        'hr.payroll.export',
        'hr.disciplinary.manage',
        'metrics.all',
      ].includes(p),
  ),
  cleaner: [
    'properties.read',
    'properties.access_info',
    'tasks.read',
    'tasks.execute',
    'inventory.read',
    'inventory.checkout',
    'maintenance.read',
    'maintenance.report',
    'hr.attendance.own',
    'hr.disciplinary.own',
    'metrics.own',
    'chat.internal',
  ],
  maintenance: [
    'properties.read',
    'properties.access_info',
    'tasks.read',
    'tasks.execute',
    'inventory.read',
    'inventory.checkout',
    'maintenance.read',
    'maintenance.report',
    'maintenance.execute',
    'hr.attendance.own',
    'hr.disciplinary.own',
    'metrics.own',
    'alerts.read',
    'chat.internal',
  ],
  security: [
    'properties.read',
    'properties.access_info',
    'maintenance.report',
    'reservations.read',
    'guests.read',
    'parking.read',
    'shared_areas.read',
    'security.dashboard',
    'hr.attendance.own',
    'hr.disciplinary.own',
    'metrics.own',
    'alerts.read',
    'chat.internal',
  ],
  owner: [
    'properties.read',
    'tasks.read',
    'maintenance.read',
    'maintenance.report',
    'reservations.read',
    'deposits.read',
    'metrics.all',
    'reports.export',
  ],
  guest: ['properties.read', 'maintenance.report', 'reservations.read', 'parking.read', 'shared_areas.read', 'shared_areas.book', 'chat.guest'],
};

export function tenantById(id: string): DemoTenant {
  return DEMO_TENANTS.find((t) => t.id === id) ?? DEMO_TENANTS[0];
}

export function membershipsOf(user: DemoUser): Membership[] {
  return user.memberships.map((m) => ({
    tenant_id: m.tenantId,
    tenant_name: tenantById(m.tenantId).name,
    tenant_logo_url: null,
    role_key: m.role,
    role_name: ROLE_NAMES[m.role],
  }));
}

/**
 * Clave de datos simulados para una empresa. Con el acceso real (API), las
 * empresas llegan con uuid: se emparejan por nombre con las de la semilla
 * (Garrent, Costa Limpia) para que los módulos aún simulados muestren datos.
 */
export function mockTenantKey(tenant: { readonly id: string; readonly name: string } | null): string {
  if (!tenant) return DEMO_TENANTS[0].id;
  if (DEMO_TENANTS.some((t) => t.id === tenant.id)) return tenant.id;
  const byName = DEMO_TENANTS.find((t) => t.name.toLowerCase() === tenant.name.trim().toLowerCase());
  return byName?.id ?? DEMO_TENANTS[0].id;
}
