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
  /** Pantalla donde se atiende (API real). */
  readonly link?: { readonly path: string; readonly query: Readonly<Record<string, string>> };
}

export interface DashboardStats {
  readonly cleaningsDone: number;
  readonly cleaningsTotal: number;
  readonly late: number;
  readonly incidentsOpen: number;
  readonly incidentsUnassigned?: number;
  readonly arrivals: number;
  readonly departures: number;
  /** Hora de entrada por defecto de la empresa (API de reservas). */
  readonly checkinTime?: string;
  /** Estancias en curso (API de reservas). */
  readonly inHouse?: number;
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

export type PinType = 'apartment' | 'house' | 'room' | 'other';

export interface MapPin {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: PinStatus;
  readonly type: PinType;
  readonly building: string | null;
  readonly zone: string | null;
  readonly openTickets: number;
  /** Coordenadas reales (las de la propiedad, su edificio o su zona). */
  readonly lat: number;
  readonly lng: number;
  /** Posición en el lienzo del mapa ilustrado (600 × 340, ver region-geo.ts). */
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
  /** Alertas abiertas de severidad alta (el número grande del hero). */
  readonly highAlerts?: number;
  /** Bloques con datos de muestra porque su API aún no existe (tareas: Persona B; reservas: fase 4). */
  readonly simulated?: { readonly tasks: boolean; readonly reservations: boolean };
  readonly alerts: readonly DashboardAlert[];
  readonly stats: DashboardStats;
  readonly compliance: Compliance;
  readonly ranking: readonly RankingRow[];
  readonly pins: readonly MapPin[];
  readonly activity: readonly ActivityItem[];
  readonly upcoming: readonly UpcomingMaintenance[];
}
