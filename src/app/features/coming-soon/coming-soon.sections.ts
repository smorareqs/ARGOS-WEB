import { IconName } from '../../shared/atoms/icon/icon.component';

/** Secciones planificadas que aún no se construyen (ux-ui.md §10). */
export interface SoonSection {
  readonly path: string;
  readonly title: string;
  readonly phase: number;
  readonly icon: IconName;
  readonly summary: string;
  readonly bullets: readonly string[];
}

export const SOON_SECTIONS: readonly SoonSection[] = [
  {
    path: 'itinerario',
    title: 'Itinerario',
    phase: 2,
    icon: 'itinerary',
    summary: 'El calendario semanal es la vista central de la operación: quién limpia qué, cuándo y en qué estado.',
    bullets: ['Calendario por colaborador o por propiedad', 'Arrastrar para reasignar o reprogramar', 'Tablero del día con retrasos', 'Evidencias y línea de tiempo por tarea'],
  },
  {
    path: 'inventario',
    title: 'Inventario',
    phase: 2,
    icon: 'inventory',
    summary: 'Artículos, bodegas y custodia de cada colaborador, con conciliación al cerrar cada limpieza.',
    bullets: ['Existencias con alerta de mínimo', 'Movimientos y traslados', 'Custodias y discrepancias', 'Solicitudes de reposición'],
  },
  {
    path: 'mantenimiento',
    title: 'Mantenimiento',
    phase: 3,
    icon: 'maintenance',
    summary: 'Incidencias en tablero, activos con preventivos y proveedores, e indicadores de resolución.',
    bullets: ['Tablero kanban de incidencias', 'Activos y planes preventivos', 'Proveedores', 'Indicadores de costo y tiempo'],
  },
  {
    path: 'reservas',
    title: 'Reservas',
    phase: 4,
    icon: 'calendar-check',
    summary: 'Ocupación por propiedad y día, huéspedes, depósitos y sincronización iCal con Airbnb y Booking.',
    bullets: ['Calendario de ocupación', 'Ficha de reserva y check-in', 'Registro de huéspedes', 'Canales e iCal'],
  },
  {
    path: 'areas-comunes',
    title: 'Áreas comunes',
    phase: 4,
    icon: 'umbrella',
    summary: 'Piscinas, salones y terrazas reservables por los huéspedes con cupo y horario.',
    bullets: ['Configuración de áreas', 'Calendario del día y la semana', 'Reservar en nombre de un huésped'],
  },
  {
    path: 'parqueos',
    title: 'Parqueos',
    phase: 4,
    icon: 'car',
    summary: 'Espacios por edificio asignados a reservas con placa.',
    bullets: ['Espacios por edificio', 'Ocupación por espacio', 'Asignación a reserva'],
  },
  {
    path: 'rrhh',
    title: 'RRHH',
    phase: 5,
    icon: 'badge',
    summary: 'Asistencia con GPS, nómina con Bono 14, aguinaldo e IGSS, y registro disciplinario.',
    bullets: ['Asistencia del mes', 'Períodos de nómina y boletas', 'Disciplina'],
  },
  {
    path: 'metricas',
    title: 'Métricas',
    phase: 5,
    icon: 'metrics',
    summary: 'Cumplimiento, tiempos y retrasos por colaborador y propiedad, con metas e incentivos.',
    bullets: ['Tablero por período', 'Ranking del equipo', 'Metas e incentivos'],
  },
  {
    path: 'alertas',
    title: 'Alertas',
    phase: 3,
    icon: 'bell',
    summary: 'Todo lo que requiere atención, agrupado por tipo y severidad.',
    bullets: ['Reconocer y resolver', 'Filtros por tipo y propiedad', 'Enlace a la entidad'],
  },
  {
    path: 'bitacora',
    title: 'Bitácora',
    phase: 2,
    icon: 'logbook',
    summary: 'Quién hizo qué, cuándo y desde dónde, con el antes y el después de cada cambio.',
    bullets: ['Filtros por actor, entidad y fecha', 'Detalle antes / después', 'Exportar'],
  },
  {
    path: 'configuracion',
    title: 'Configuración',
    phase: 1,
    icon: 'settings',
    summary: 'Datos de la empresa, roles y permisos, y facturación.',
    bullets: ['Empresa y banderas', 'Roles y matriz de permisos', 'Facturación (fase 6)'],
  },
];
