/**
 * Catálogo fijo de permisos (PRD §3.3). Debe coincidir con
 * `BACKEND/internal/modules/authz/permissions.go`.
 */
export const PERMISSIONS = [
  'tenant.settings',
  'tenant.billing',
  'users.read',
  'users.manage',
  'roles.manage',
  'properties.read',
  'properties.manage',
  'properties.access_info',
  'tasks.read',
  'tasks.manage',
  'tasks.assign',
  'tasks.execute',
  'tasks.validate',
  'inventory.read',
  'inventory.manage',
  'inventory.checkout',
  'inventory.reconcile',
  'maintenance.read',
  'maintenance.report',
  'maintenance.manage',
  'maintenance.assign',
  'maintenance.execute',
  'reservations.read',
  'reservations.manage',
  'reservations.checkin',
  'guests.read',
  'guests.manage',
  'guests.documents',
  'deposits.read',
  'deposits.manage',
  'parking.read',
  'parking.manage',
  'shared_areas.manage',
  'shared_areas.book',
  'shared_areas.read',
  'security.dashboard',
  'hr.attendance.own',
  'hr.attendance.manage',
  'hr.payroll.manage',
  'hr.payroll.export',
  'hr.disciplinary.manage',
  'hr.disciplinary.own',
  'metrics.own',
  'metrics.team',
  'metrics.all',
  'alerts.read',
  'alerts.manage',
  'chat.internal',
  'chat.guest',
  'audit.read',
  'reports.export',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Banderas de funcionalidad por tenant (PRD §5.1). */
export type FeatureFlag = 'reservations' | 'parking' | 'shared_areas' | 'guest_chat' | 'payroll';

/** Claves de los roles sembrados por defecto (PRD §3.2). */
export type RoleKey =
  | 'admin'
  | 'supervisor'
  | 'cleaner'
  | 'maintenance'
  | 'security'
  | 'owner'
  | 'guest';

export const ROLE_NAMES: Record<RoleKey, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  cleaner: 'Colaborador de limpieza',
  maintenance: 'Mantenimiento',
  security: 'Seguridad',
  owner: 'Propietario',
  guest: 'Huésped',
};
