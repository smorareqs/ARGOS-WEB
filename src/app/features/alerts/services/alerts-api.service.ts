import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';

/**
 * Contrato de alertas (fase03.md §5, §4.1 "Contrato implementado"). Cada
 * causa tiene a lo más una alerta viva; el sistema las resuelve solas cuando
 * la causa desaparece (activo que vuelve a operar, stock repuesto).
 */

export type AlertType = 'asset_failure' | 'maintenance_overdue' | 'task_late' | 'low_stock' | 'discrepancy_open' | 'checkout_alarm_unattended';
export type Severity = 'high' | 'medium' | 'low';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  readonly id: string;
  readonly type: AlertType;
  readonly severity: Severity;
  readonly status: AlertStatus;
  /** asset, maintenance_plan, maintenance_ticket, task, inventory_item, inventory_discrepancy, reservation. */
  readonly entity_type: string;
  readonly entity_id: string;
  readonly property_id: string | null;
  readonly property_code: string | null;
  readonly property_name: string | null;
  readonly message: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly acknowledged_at: string | null;
  readonly acknowledged_by_name: string | null;
  readonly resolved_at: string | null;
  /** Vacío si se resolvió sola. */
  readonly resolved_by_name: string | null;
}

export interface AlertSummary {
  readonly open: number;
  readonly high: number;
  readonly fresh: number;
  readonly by_type: readonly { type: AlertType; open: number; high: number; fresh: number }[];
}

/** Servicio puro de alertas. Sin estado. */
export abstract class AlertsApi {
  /** Abiertas (activas y reconocidas) o resueltas (las 100 más recientes). */
  abstract list(status: 'open' | 'resolved'): Promise<readonly Alert[]>;
  abstract summary(): Promise<AlertSummary>;
  abstract acknowledge(id: string): Promise<Alert>;
  abstract resolve(id: string): Promise<Alert>;
}

@Injectable()
export class HttpAlertsApi extends AlertsApi {
  private readonly http = inject(ApiClient);

  list(status: 'open' | 'resolved'): Promise<readonly Alert[]> {
    return this.http.get<{ items: readonly Alert[] }>('/alerts', { status, limit: status === 'open' ? 500 : 100 }).then((p) => p.items);
  }
  summary(): Promise<AlertSummary> {
    return this.http.get<AlertSummary>('/alerts/summary');
  }
  acknowledge(id: string): Promise<Alert> {
    return this.http.post<Alert>(`/alerts/${id}/ack`);
  }
  resolve(id: string): Promise<Alert> {
    return this.http.post<Alert>(`/alerts/${id}/resolve`);
  }
}

/** A dónde lleva "Ver" según la causa de la alerta. */
export function alertLink(a: Pick<Alert, 'entity_type' | 'entity_id'>): { path: string; query: Record<string, string> } {
  switch (a.entity_type) {
    case 'asset':
      return { path: '/mantenimiento', query: { tab: 'activos', activo: a.entity_id } };
    case 'maintenance_plan':
      return { path: '/mantenimiento', query: { tab: 'preventivos' } };
    case 'maintenance_ticket':
      return { path: '/mantenimiento', query: { ver: a.entity_id } };
    case 'task':
      return { path: '/itinerario', query: { tarea: a.entity_id } };
    case 'inventory_discrepancy':
      return { path: '/inventario', query: { tab: 'discrepancias' } };
    case 'inventory_item':
      return { path: '/inventario', query: {} };
    case 'reservation':
      return { path: '/reservas', query: { ver: a.entity_id } };
    default:
      return { path: '/alertas', query: {} };
  }
}
