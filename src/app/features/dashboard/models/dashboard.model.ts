import { IconName } from '../../../shared/atoms/icon/icon.component';
import { BadgeTone } from '../../../shared/atoms/badge/badge.component';

/** Contrato de `GET /api/v1/dashboard` (W-B1, agregado del backend). */

export type AlertKind = 'incident' | 'maintenance' | 'late' | 'inventory';

export interface DashboardAlert {
  readonly id: string;
  readonly kind: AlertKind;
  readonly title: string;
  readonly meta: string;
  readonly action: string;
}

export interface DashboardStats {
  readonly cleaningsDone: number;
  readonly cleaningsTotal: number;
  readonly late: number;
  readonly incidentsOpen: number;
  readonly arrivals: number;
  readonly departures: number;
}

export interface Compliance {
  readonly done: number;
  readonly inProgress: number;
  readonly late: number;
  readonly pending: number;
}

export interface RankingRow {
  readonly name: string;
  readonly initials: string;
  readonly score: number;
  readonly progress: number;
}

export type PinStatus = 'ready' | 'cleaning' | 'occupied' | 'incident';

export interface MapPin {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: PinStatus;
  /** Posición en el mapa estilizado, en % del ancho y alto. */
  readonly x: number;
  readonly y: number;
}

export interface ActivityItem {
  readonly time: string;
  readonly title: string;
  readonly meta: string;
  readonly icon: IconName;
  readonly tone: 'primary' | 'gold' | 'success' | 'danger';
}

export interface UpcomingMaintenance {
  readonly id: string;
  readonly date: string;
  readonly property: string;
  readonly system: string;
  readonly tone: BadgeTone;
  readonly label: string;
}

export interface DashboardData {
  readonly teamsInField: number;
  readonly totalAlerts: number;
  readonly alerts: readonly DashboardAlert[];
  readonly stats: DashboardStats;
  readonly compliance: Compliance;
  readonly ranking: readonly RankingRow[];
  readonly pins: readonly MapPin[];
  readonly activity: readonly ActivityItem[];
  readonly upcoming: readonly UpcomingMaintenance[];
}
