import { FeatureFlag, Permission } from '../../core/auth/permissions';
import { SidebarSection } from '../../shared/organisms/sidebar/sidebar.component';
import { IconName } from '../../shared/atoms/icon/icon.component';
import { DimIconName } from '../../shared/atoms/dim-icon/dim-icon.component';

interface NavEntry {
  readonly label: string;
  readonly icon: IconName;
  /** Ícono con volumen y color de la sección (barra de secciones y menú). */
  readonly dim: DimIconName;
  readonly tint: string;
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
    items: [{ label: 'Inicio', icon: 'home', dim: 'sun', tint: '#fdecc8', route: '/inicio' }],
  },
  {
    label: 'Operación',
    items: [
      { label: 'Propiedades', icon: 'building', dim: 'house', tint: '#f9dfcf', route: '/propiedades', anyOf: ['properties.read'] },
      { label: 'Itinerario', icon: 'itinerary', dim: 'calendar', tint: '#fbe1d8', route: '/itinerario', anyOf: ['tasks.read'] },
      { label: 'Inventario', icon: 'inventory', dim: 'box', tint: '#f5e6cc', route: '/inventario', anyOf: ['inventory.read'] },
      { label: 'Mantenimiento', icon: 'maintenance', dim: 'incident', tint: '#f7d9d4', route: '/mantenimiento', anyOf: ['maintenance.read'] },
      { label: 'Reservas', icon: 'calendar-check', dim: 'arrivals', tint: '#fbe0d0', route: '/reservas', anyOf: ['reservations.read'], feature: 'reservations' },
      { label: 'Áreas comunes', icon: 'umbrella', dim: 'pool', tint: '#d6eef0', route: '/areas-comunes', anyOf: ['shared_areas.read'], feature: 'shared_areas' },
      { label: 'Parqueos', icon: 'car', dim: 'car', tint: '#f8dccf', route: '/parqueos', anyOf: ['parking.read'], feature: 'parking' },
      { label: 'Chat', icon: 'chat', dim: 'chat', tint: '#d7ebec', route: '/chat', anyOf: ['chat.internal', 'chat.guest'] },
    ],
  },
  {
    label: 'Equipo',
    items: [
      { label: 'Colaboradores', icon: 'employees', dim: 'team', tint: '#dcece5', route: '/colaboradores', anyOf: ['users.read'] },
      { label: 'RRHH', icon: 'badge', dim: 'wallet', tint: '#d9eedf', route: '/rrhh', anyOf: ['hr.attendance.manage', 'hr.payroll.manage', 'hr.payroll.export', 'hr.disciplinary.manage'] },
      { label: 'Métricas', icon: 'metrics', dim: 'chart', tint: '#dbe9ec', route: '/metricas', anyOf: ['metrics.team', 'metrics.all'] },
    ],
  },
  {
    label: 'Control',
    items: [
      { label: 'Alertas', icon: 'bell', dim: 'bell', tint: '#fdeccb', route: '/alertas', anyOf: ['alerts.read'] },
      { label: 'Bitácora', icon: 'logbook', dim: 'logbook', tint: '#d8e7e9', route: '/bitacora', anyOf: ['audit.read'] },
      { label: 'Configuración', icon: 'settings', dim: 'gear', tint: '#e4e9e8', route: '/configuracion', anyOf: ['tenant.settings', 'tenant.billing'] },
    ],
  },
];

/** Consola de la administración de ARGOS (W-P1, W-P4): sin empresa activa. */
const PLATFORM_NAV: readonly SidebarSection[] = [
  {
    label: 'ARGOS',
    items: [
      { label: 'Empresas', icon: 'apartments', dim: 'building', tint: '#f5e6cc', route: '/plataforma/empresas' },
      { label: 'Planes', icon: 'badge', dim: 'done', tint: '#dcece5', route: '/plataforma/planes' },
      { label: 'Suscripciones', icon: 'settings', dim: 'wallet', tint: '#d9eedf', route: '/plataforma/suscripciones' },
      { label: 'Bitácora de plataforma', icon: 'logbook', dim: 'logbook', tint: '#d8e7e9', route: '/plataforma/bitacora' },
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
      .map((i) => ({ label: i.label, icon: i.icon, dim: i.dim, tint: i.tint, route: i.route, soon: i.soon })),
  })).filter((g) => g.items.length > 0);
}
