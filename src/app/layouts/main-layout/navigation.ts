import { FeatureFlag, Permission } from '../../core/auth/permissions';
import { SidebarSection } from '../../shared/organisms/sidebar/sidebar.component';
import { IconName } from '../../shared/atoms/icon/icon.component';

interface NavEntry {
  readonly label: string;
  readonly icon: IconName;
  readonly route: string;
  /** Basta con uno de estos permisos. */
  readonly anyOf?: readonly Permission[];
  readonly feature?: FeatureFlag;
  readonly soon?: boolean;
}

interface NavGroup {
  readonly label: string | null;
  readonly items: readonly NavEntry[];
}

/**
 * Navegación del portal (ux-ui.md §4.2): orden fijo y cada entrada aparece
 * solo si el rol tiene el permiso y la bandera del tenant está activa.
 * `soon` marca módulos de fases siguientes (ruta "Próximamente").
 */
const NAV: readonly NavGroup[] = [
  {
    label: null,
    items: [{ label: 'Inicio', icon: 'home', route: '/inicio' }],
  },
  {
    label: 'Operación',
    items: [
      { label: 'Propiedades', icon: 'building', route: '/propiedades', anyOf: ['properties.read'] },
      { label: 'Itinerario', icon: 'itinerary', route: '/itinerario', anyOf: ['tasks.read'], soon: true },
      { label: 'Inventario', icon: 'inventory', route: '/inventario', anyOf: ['inventory.read'], soon: true },
      { label: 'Mantenimiento', icon: 'maintenance', route: '/mantenimiento', anyOf: ['maintenance.read'], soon: true },
      { label: 'Reservas', icon: 'calendar-check', route: '/reservas', anyOf: ['reservations.read'], feature: 'reservations', soon: true },
      { label: 'Áreas comunes', icon: 'umbrella', route: '/areas-comunes', anyOf: ['shared_areas.read'], feature: 'shared_areas', soon: true },
      { label: 'Parqueos', icon: 'car', route: '/parqueos', anyOf: ['parking.read'], feature: 'parking', soon: true },
    ],
  },
  {
    label: 'Equipo',
    items: [
      { label: 'Colaboradores', icon: 'employees', route: '/colaboradores', anyOf: ['users.read'] },
      { label: 'RRHH', icon: 'badge', route: '/rrhh', anyOf: ['hr.attendance.manage', 'hr.payroll.manage'], soon: true },
      { label: 'Métricas', icon: 'metrics', route: '/metricas', anyOf: ['metrics.team', 'metrics.all'], soon: true },
    ],
  },
  {
    label: 'Control',
    items: [
      { label: 'Alertas', icon: 'bell', route: '/alertas', anyOf: ['alerts.read'], soon: true },
      { label: 'Bitácora', icon: 'logbook', route: '/bitacora', anyOf: ['audit.read'], soon: true },
      { label: 'Configuración', icon: 'settings', route: '/configuracion', anyOf: ['tenant.settings'], soon: true },
    ],
  },
];

export function buildNav(
  can: (p: Permission) => boolean,
  hasFeature: (f: FeatureFlag) => boolean,
): SidebarSection[] {
  return NAV.map((g) => ({
    label: g.label,
    items: g.items
      .filter((i) => (!i.anyOf || i.anyOf.some(can)) && (!i.feature || hasFeature(i.feature)))
      .map((i) => ({ label: i.label, icon: i.icon, route: i.route, soon: i.soon })),
  })).filter((g) => g.items.length > 0);
}
