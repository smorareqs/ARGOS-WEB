import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';
import { AuditRecord, auditPhrase } from '../../../core/http/audit-api';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { IconName } from '../../../shared/atoms/icon/icon.component';
import { BadgeTone } from '../../../shared/atoms/badge/badge.component';
import { Alert, alertLink } from '../../alerts/services/alerts-api.service';
import { Plan } from '../../maintenance/models/maintenance.model';
import { sampleOps } from './dashboard-api.mock';
import { projectPins } from './map-projection';
import { ActivityItem, AlertKind, DashboardAlert, DashboardData, PinStatus, UpcomingMaintenance } from '../models/dashboard.model';

/** Servicio puro del Inicio (ARCHITECTURE.md §7). Rechaza con ApiError. */
export abstract class DashboardApi {
  abstract get(): Promise<DashboardData>;
  /** Reconoce una alerta (`POST /alerts/{id}/ack`). */
  abstract acknowledge(alertId: string): Promise<void>;
}

/** Respuesta de `GET /dashboard` (fase03.md §4.1). */
interface RawDashboard {
  readonly date: string;
  readonly alerts: { readonly open: number; readonly high: number; readonly fresh: number };
  readonly top_alerts: readonly Alert[];
  readonly incidents: { readonly open: number; readonly urgent: number; readonly unassigned: number };
  readonly upcoming: readonly Plan[];
  readonly pins: readonly {
    id: string; code: string; name: string; type?: string; building?: string | null; zone: string | null;
    lat: number | null; lng: number | null; open_tickets?: number; status: string;
  }[];
  readonly activity: readonly AuditRecord[];
  readonly tasks: {
    readonly available: boolean; readonly done: number; readonly total: number; readonly in_progress: number; readonly late: number;
    readonly pending: number; readonly in_field: number;
    readonly ranking: readonly { user_id: string; full_name: string; done: number; total: number; score: number | null }[];
  };
  readonly reservations: {
    readonly available: boolean; readonly arrivals: number; readonly departures: number; readonly in_house: number;
    readonly incomplete: number; readonly checkin_time: string;
  };
}

const KIND: Record<Alert['type'], { kind: AlertKind; action: string }> = {
  asset_failure: { kind: 'maintenance', action: 'Ver activo' },
  maintenance_overdue: { kind: 'maintenance', action: 'Programar' },
  task_late: { kind: 'late', action: 'Reasignar' },
  low_stock: { kind: 'inventory', action: 'Revisar' },
  discrepancy_open: { kind: 'inventory', action: 'Revisar' },
  checkout_alarm_unattended: { kind: 'late', action: 'Atender' },
};

/**
 * Inicio con la API real. Lo de tareas (limpiezas, cumplimiento, ranking,
 * equipos en campo) sigue con datos de muestra y marcado como simulado hasta
 * que exista esa API; las llegadas son reales si la empresa tiene reservas.
 */
@Injectable()
export class HttpDashboardApi extends DashboardApi {
  private readonly http = inject(ApiClient);
  private readonly session = inject(SessionStore);

  async get(): Promise<DashboardData> {
    const raw = await this.http.get<RawDashboard>('/dashboard');
    const sample = sampleOps(mockTenantKey(this.session.tenant()));
    const t = raw.tasks;
    const res = raw.reservations;
    return {
      teamsInField: t.available ? t.in_field : sample.teamsInField,
      totalAlerts: raw.alerts.open,
      highAlerts: raw.alerts.high,
      alerts: raw.top_alerts.map(toAlert),
      stats: {
        cleaningsDone: t.available ? t.done : sample.stats.cleaningsDone,
        cleaningsTotal: t.available ? t.total : sample.stats.cleaningsTotal,
        late: t.available ? t.late : sample.stats.late,
        incidentsOpen: raw.incidents.open,
        incidentsUnassigned: raw.incidents.unassigned,
        arrivals: res?.available ? res.arrivals : sample.stats.arrivals,
        departures: res?.available ? res.departures : sample.stats.departures,
        checkinTime: res?.available ? res.checkin_time : undefined,
        inHouse: res?.available ? res.in_house : undefined,
      },
      compliance: t.available ? { done: t.done, inProgress: t.in_progress, late: t.late, pending: t.pending } : sample.compliance,
      ranking: t.available
        ? t.ranking.map((r) => ({ name: r.full_name, initials: '', score: r.done, progress: r.total ? Math.round((r.done / r.total) * 100) : 0 }))
        : sample.ranking,
      pins: projectPins(raw.pins.map((p) => ({ ...p, status: pinStatus(p.status) }))),
      activity: raw.activity.map(toActivity),
      upcoming: raw.upcoming.map(toUpcoming),
      simulated: { tasks: !t.available, reservations: !res?.available },
    };
  }

  async acknowledge(alertId: string): Promise<void> {
    await this.http.post(`/alerts/${alertId}/ack`);
  }
}

function toAlert(a: Alert): DashboardAlert {
  const k = KIND[a.type] ?? { kind: 'maintenance' as AlertKind, action: 'Ver' };
  const place = a.property_name ?? 'Toda la empresa';
  return { id: a.id, kind: k.kind, title: a.message, meta: `${place} · ${ago(a.created_at)}`, action: k.action, link: alertLink(a) };
}

function pinStatus(s: string): PinStatus {
  if (s === 'incident') return 'incident';
  if (s === 'cleaning' || s === 'late') return 'cleaning';
  if (s === 'occupied') return 'occupied';
  return 'ready';
}

const ENTITY_ICON: Record<string, IconName> = {
  maintenance_ticket: 'maintenance', asset: 'maintenance', maintenance_plan: 'calendar-check', vendor: 'building', alert: 'alert',
  property: 'apartments', building: 'building', employee: 'employees', membership: 'employees', invitation: 'user-plus',
  reservation: 'door', guest: 'guests', booking_channel: 'calendar-check', ical_feed: 'calendar-check',
};

function toActivity(r: AuditRecord): ActivityItem {
  const time = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Guatemala' }).format(new Date(r.created_at));
  const tone: ActivityItem['tone'] =
    r.action === 'ticket.created' || r.action === 'asset.status_changed' ? 'danger'
      : r.action.endsWith('.resolved') || r.action.endsWith('.closed') ? 'success'
        : r.action.endsWith('.assigned') || r.action.endsWith('.started') ? 'gold' : 'primary';
  const meta = [r.actor_name ?? 'El sistema', r.property_code].filter(Boolean).join(' · ');
  return { time, title: auditPhrase(r), meta, icon: ENTITY_ICON[r.entity] ?? 'logbook', tone };
}

function toUpcoming(p: Plan): UpcomingMaintenance {
  const meta: Record<Plan['due_state'], { tone: BadgeTone; label: string }> = {
    overdue: { tone: 'danger', label: 'Vencido' },
    upcoming: { tone: 'warning', label: 'Toca pronto' },
    ok: { tone: 'info', label: 'Programado' },
    inactive: { tone: 'muted', label: 'Pausado' },
  };
  return {
    id: p.id, date: p.next_due_at, property: p.property_code ?? p.building_name ?? 'Sin ubicación',
    system: `${p.asset_name} · ${p.name}`, ...meta[p.due_state],
  };
}

/** "hace 12 min", "hace 3 h", "hace 2 d". */
function ago(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}
