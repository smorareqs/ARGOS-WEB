import { SidebarItem } from '../../shared/organisms/sidebar/sidebar.component';

/**
 * Estructura de navegación de la web administradora.
 * Vive en la capa de layouts (infraestructura visual), no en una feature.
 * Ref: ArgosSidebar.dc.html.
 */
export const ADMIN_NAV: readonly SidebarItem[] = [
  { label: 'Inicio', icon: 'home', route: '/inicio' },
  { label: 'Apartamentos', icon: 'apartments', route: '/apartamentos' },
  { label: 'Empleados', icon: 'employees', route: '/empleados' },
  { label: 'Bitácora', icon: 'logbook', route: '/bitacora' },
  { label: 'Inventario', icon: 'inventory', route: '/inventario' },
  { label: 'Control de itinerario', icon: 'itinerary', route: '/itinerario' },
  { label: 'Métricas e incentivos', icon: 'metrics', route: '/metricas' },
  { label: 'Mantenimiento', icon: 'maintenance', route: '/mantenimiento', badge: 3 },
];
