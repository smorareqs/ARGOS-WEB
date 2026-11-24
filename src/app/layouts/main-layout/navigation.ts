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
 * `soon` marca módulos de fases siguientes.
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
      { label: 'Itinerario', icon: 'itinerary', route: '/itinerario', anyOf: ['tasks.read'] },
      { label: 'Inventario', icon: 'inventory', route: '/inventario', anyOf: ['inventory.read'] },
      { label: 'Mantenimiento', icon: 'maintenance', route: '/mantenimiento', anyOf: ['maintenance.read'] },
      { label: 'Reservas', icon: 'calendar-check', route: '/reservas', anyOf: ['reservations.read'], feature: 'reservations' },
      { label: 'Áreas comunes', icon: 'umbrella', route: '/areas-comunes', anyOf: ['shared_areas.read'], feature: 'shared_areas' },
      { label: 'Parqueos', icon: 'car', route: '/parqueos', anyOf: ['parking.read'], feature: 'parking' },
      { label: 'Chat', icon: 'chat', route: '/chat', anyOf: ['chat.internal', 'chat.guest'] },
    ],
  },
  {
    label: 'Equipo',
    items: [
      { label: 'Colaboradores', icon: 'employees', route: '/colaboradores', anyOf: ['users.read'] },
      { label: 'RRHH', icon: 'badge', route: '/rrhh', anyOf: ['hr.attendance.manage', 'hr.payroll.manage', 'hr.payroll.export', 'hr.disciplinary.manage'] },
      { label: 'Métricas', icon: 'metrics', route: '/metricas', anyOf: ['metrics.team', 'metrics.all'] },
    ],
  },
  {
    label: 'Control',
    items: [
      { label: 'Alertas', icon: 'bell', route: '/alertas', anyOf: ['alerts.read'] },
      { label: 'Bitácora', icon: 'logbook', route: '/bitacora', anyOf: ['audit.read'] },
      { label: 'Configuración', icon: 'settings', route: '/configuracion', anyOf: ['tenant.settings', 'tenant.billing'] },
    ],
  },
];

/** Consola de la administración de ARGOS (W-P1, W-P4): sin empresa activa. */
const PLATFORM_NAV: readonly SidebarSection[] = [
  {
    label: 'ARGOS',
    items: [
      { label: 'Empresas', icon: 'apartments', route: '/plataforma/empresas' },
      { label: 'Planes', icon: 'badge', route: '/plataforma/planes' },
      { label: 'Suscripciones', icon: 'settings', route: '/plataforma/suscripciones' },
      { label: 'Bitácora de plataforma', icon: 'logbook', route: '/plataforma/bitacora' },
    ],
  },
];

export function buildNav(
  can: (p: Permission) => boolean,
  hasFeature: (f: FeatureFlag) => boolean,
  platform = false,
): SidebarSection[] {
  if (platform) return PLATFORM_NAV.map((s) => ({ ...s, items: [...s.items] }));
  return NAV.map((g) => ({
    label: g.label,
    items: g.items
      .filter((i) => (!i.anyOf || i.anyOf.some(can)) && (!i.feature || hasFeature(i.feature)))
      .map((i) => ({ label: i.label, icon: i.icon, route: i.route, soon: i.soon })),
  })).filter((g) => g.items.length > 0);
}
