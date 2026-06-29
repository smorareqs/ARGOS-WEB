import { IconName } from '../../../shared/atoms/icon/icon.component';
import { BadgeStatus } from '../../../shared/atoms/badge/badge.component';

/** Alerta de prioridad alta del hero. */
export interface PriorityAlert {
  readonly icon: IconName;
  readonly title: string;
  readonly meta: string;
  readonly action: string;
}

/** Resumen de cumplimiento del día (donut + desglose). */
export interface Compliance {
  readonly percent: number;
  readonly done: number;
  readonly total: number;
  readonly inProgress: number;
  readonly pending: number;
}

/** Tipo de pin del mapa de propiedades. */
export type MapPinKind = 'in-progress' | 'finished' | 'incident';

export interface MapPin {
  readonly kind: MapPinKind;
  readonly left: number; // %
  readonly top: number; // %
}

/** Fila del ranking del equipo. */
export interface RankingRow {
  readonly position: number;
  readonly nombre: string;
  readonly iniciales: string;
  readonly score: number;
  readonly progress: number; // %
  readonly leader: boolean;
}

/** Estado de mantenimiento de una propiedad. */
export interface MaintenanceRow {
  readonly property: string;
  readonly system: string;
  readonly status: BadgeStatus;
  readonly statusLabel: string;
}

/** Modelo agregado del dashboard de Inicio. */
export interface DashboardData {
  readonly greetingName: string;
  readonly teamsInField: number;
  readonly highPriorityCount: number;
  readonly totalAlerts: number;
  readonly alerts: readonly PriorityAlert[];
  readonly compliance: Compliance;
  readonly mapPins: readonly MapPin[];
  readonly mapActiveCount: number;
  readonly ranking: readonly RankingRow[];
  readonly maintenance: readonly MaintenanceRow[];
}
