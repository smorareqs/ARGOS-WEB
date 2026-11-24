import { PERMISSIONS, Permission } from '../../../core/auth/permissions';

/** Etiquetas en español de la matriz de permisos (W-O3), agrupadas por módulo. */
const LABELS: Record<Permission, string> = {
  'tenant.settings': 'Editar datos de la empresa',
  'tenant.billing': 'Ver y pagar la facturación',
  'users.read': 'Ver colaboradores',
  'users.manage': 'Invitar, suspender y cambiar roles',
  'roles.manage': 'Editar roles y permisos',
  'properties.read': 'Ver propiedades',
  'properties.manage': 'Crear y editar propiedades',
  'properties.access_info': 'Ver códigos y llaves de acceso',
  'tasks.read': 'Ver el itinerario',
  'tasks.manage': 'Crear y cancelar tareas',
  'tasks.assign': 'Asignar y reprogramar',
  'tasks.execute': 'Ejecutar tareas en la app',
  'tasks.validate': 'Validar o devolver tareas',
  'inventory.read': 'Ver inventario',
  'inventory.manage': 'Entradas, ajustes y artículos',
  'inventory.checkout': 'Sacar artículos a custodia',
  'inventory.reconcile': 'Conciliar discrepancias',
  'maintenance.read': 'Ver incidencias y activos',
  'maintenance.report': 'Reportar incidencias',
  'maintenance.manage': 'Gestionar activos y proveedores',
  'maintenance.assign': 'Asignar incidencias',
  'maintenance.execute': 'Resolver incidencias en la app',
  'reservations.read': 'Ver reservas',
  'reservations.manage': 'Crear, editar y cancelar reservas',
  'reservations.checkin': 'Registrar check-in y check-out',
  'guests.read': 'Ver huéspedes',
  'guests.manage': 'Editar huéspedes y lista negra',
  'guests.documents': 'Ver documentos de identidad',
  'deposits.read': 'Ver depósitos',
  'deposits.manage': 'Cobrar y devolver depósitos',
  'parking.read': 'Ver parqueos',
  'parking.manage': 'Asignar y bloquear espacios',
  'shared_areas.manage': 'Configurar áreas comunes',
  'shared_areas.book': 'Reservar áreas comunes',
  'shared_areas.read': 'Ver áreas comunes',
  'security.dashboard': 'Tablero de seguridad',
  'hr.attendance.own': 'Marcar su propia asistencia',
  'hr.attendance.manage': 'Ver y corregir asistencia',
  'hr.payroll.manage': 'Calcular y cerrar nómina',
  'hr.payroll.export': 'Descargar nómina y boletas',
  'hr.disciplinary.manage': 'Registrar acciones disciplinarias',
  'hr.disciplinary.own': 'Ver sus propias acciones',
  'metrics.own': 'Ver sus propias métricas',
  'metrics.team': 'Ver métricas de su equipo',
  'metrics.all': 'Ver todas las métricas',
  'alerts.read': 'Ver alertas',
  'alerts.manage': 'Reconocer y resolver alertas',
  'chat.internal': 'Chat interno',
  'chat.guest': 'Chat con huéspedes',
  'audit.read': 'Ver la bitácora',
  'reports.export': 'Exportar reportes',
};

const MODULES: Record<string, string> = {
  tenant: 'Empresa',
  users: 'Colaboradores',
  roles: 'Colaboradores',
  properties: 'Propiedades',
  tasks: 'Itinerario',
  inventory: 'Inventario',
  maintenance: 'Mantenimiento',
  reservations: 'Reservas',
  guests: 'Reservas',
  deposits: 'Reservas',
  parking: 'Parqueos y áreas comunes',
  shared_areas: 'Parqueos y áreas comunes',
  security: 'Seguridad',
  hr: 'RRHH',
  metrics: 'Métricas',
  alerts: 'Control',
  audit: 'Control',
  reports: 'Control',
  chat: 'Chat',
};

export interface PermissionGroup {
  readonly module: string;
  readonly items: readonly { readonly key: Permission; readonly label: string }[];
}

export const PERMISSION_GROUPS: readonly PermissionGroup[] = (() => {
  const out = new Map<string, { key: Permission; label: string }[]>();
  for (const p of PERMISSIONS) {
    const mod = MODULES[p.split('.')[0]] ?? 'Otros';
    out.set(mod, [...(out.get(mod) ?? []), { key: p, label: LABELS[p] }]);
  }
  return [...out].map(([module, items]) => ({ module, items }));
})();
