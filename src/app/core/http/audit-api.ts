import { Injectable, inject } from '@angular/core';
import { ApiClient } from './http-api';
import { Page } from './page';

/**
 * Bitácora de la empresa (`GET /audit`, permiso `audit.read`; fase02.md §4).
 * La usan la pantalla Bitácora (W-N1), el historial de la ficha de propiedad
 * (W-C2) y la ficha del colaborador (W-D2).
 */
export interface AuditRecord {
  readonly id: string;
  readonly actor_id: string | null;
  /** null = lo hizo el sistema. */
  readonly actor_name: string | null;
  readonly actor_email: string | null;
  readonly actor_role: string | null;
  /** `<entidad>.<verbo>`, p. ej. `property.updated`. */
  readonly action: string;
  readonly entity: string;
  readonly entity_id: string | null;
  /** Nombre legible de la entidad (código, nombre o correo). */
  readonly entity_label: string | null;
  readonly property_id: string | null;
  readonly property_code: string | null;
  readonly property_name: string | null;
  readonly before: Readonly<Record<string, unknown>> | null;
  readonly after: Readonly<Record<string, unknown>> | null;
  readonly ip: string | null;
  readonly user_agent: string | null;
  readonly created_at: string;
}

export interface AuditQuery {
  readonly entity?: string;
  readonly entity_id?: string;
  readonly property_id?: string;
  readonly actor_id?: string;
  /** Prefijo de la acción (`property.`). */
  readonly action?: string;
  /** RFC 3339; `to` es excluyente. */
  readonly from?: string;
  readonly to?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

/** Se elige en app.config: API real o mock del modo demo (MOCK_MODULES.audit). */
export abstract class AuditApi {
  abstract page(q: AuditQuery): Promise<Page<AuditRecord>>;

  /** Sigue el cursor hasta `max` filas. */
  async all(q: AuditQuery, max = 1000): Promise<AuditRecord[]> {
    const out: AuditRecord[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.page({ ...q, cursor, limit: 500 });
      out.push(...page.items);
      cursor = page.next_cursor ?? undefined;
    } while (cursor && out.length < max);
    return out;
  }
}

@Injectable()
export class HttpAuditApi extends AuditApi {
  private readonly http = inject(ApiClient);

  page(q: AuditQuery): Promise<Page<AuditRecord>> {
    const params: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined && v !== null && v !== '') params[k] = v as string | number;
    }
    return this.http.get<Page<AuditRecord>>('/audit', params);
  }
}

const VERBS: Record<string, string> = {
  'property.created': 'Dio de alta la propiedad',
  'property.updated': 'Editó la propiedad',
  'property.deleted': 'Borró la propiedad',
  'property.access_viewed': 'Consultó el acceso de',
  'property.assignments_changed': 'Cambió los asignados de',
  'property.owners_changed': 'Cambió los propietarios de',
  'building.created': 'Dio de alta el edificio',
  'building.updated': 'Editó el edificio',
  'building.deleted': 'Borró el edificio',
  'checklist_template.created': 'Creó la plantilla',
  'checklist_template.updated': 'Editó la plantilla',
  'checklist_template.deleted': 'Borró la plantilla',
  'employee.created': 'Creó la ficha laboral de',
  'employee.updated': 'Editó la ficha laboral de',
  'employee.schedule_changed': 'Cambió el horario de',
  'member.role_changed': 'Cambió el rol de',
  'member.suspended': 'Suspendió a',
  'member.reactivated': 'Reactivó a',
  'member.sessions_revoked': 'Cerró las sesiones de',
  'invitation.created': 'Invitó a',
  'invitation.resent': 'Reenvió la invitación a',
  'invitation.revoked': 'Canceló la invitación de',
  'invitation.accepted': 'Aceptó la invitación',
  'role.created': 'Creó el rol',
  'role.updated': 'Editó el rol',
  'role.deleted': 'Borró el rol',
  'tenant.created': 'Creó la empresa',
  'tenant.settings_updated': 'Cambió la configuración de la empresa',
  // Fase 3: mantenimiento y alertas.
  'vendor.created': 'Dio de alta al proveedor',
  'vendor.updated': 'Editó al proveedor',
  'asset.created': 'Dio de alta el activo',
  'asset.updated': 'Editó el activo',
  'asset.status_changed': 'Cambió el estado de',
  'asset.document_added': 'Adjuntó un documento a',
  'asset.document_removed': 'Quitó un documento de',
  'maintenance_plan.created': 'Creó el preventivo',
  'maintenance_plan.updated': 'Editó el preventivo',
  'ticket.created': 'Reportó la incidencia',
  'ticket.updated': 'Corrigió la incidencia',
  'ticket.assigned': 'Asignó la incidencia',
  'ticket.started': 'Inició la incidencia',
  'ticket.resolved': 'Resolvió la incidencia',
  'ticket.closed': 'Cerró la incidencia',
  'ticket.rejected': 'Rechazó la incidencia',
  'ticket.reopened': 'Reabrió la incidencia',
  'alert.acknowledged': 'Reconoció la alerta',
  'alert.resolved': 'Resolvió la alerta',
  'reservation.created': 'Creó la reserva',
  'reservation.updated': 'Editó la reserva',
  'reservation.confirmed': 'Confirmó la reserva',
  'reservation.cancelled': 'Canceló la reserva',
  'reservation.no_show': 'Marcó que no llegó el huésped de',
  'reservation.checked_in': 'Registró el check-in de',
  'reservation.checked_out': 'Registró el check-out de',
  'deposit.received': 'Registró el depósito de',
  'deposit.returned': 'Devolvió el depósito de',
  'deposit.retained': 'Retuvo parte del depósito de',
  'inspection.created': 'Registró la inspección de',
  'guest.created': 'Agregó al huésped',
  'guest.updated': 'Editó al huésped',
  'guest.blacklist_changed': 'Cambió la lista negra de',
  'guest.document_added': 'Registró el documento de',
  'guest.document_viewed': 'Vio el documento de',
  'channel.created': 'Creó el canal',
  'channel.updated': 'Editó el canal',
  'ical_feed.created': 'Agregó el calendario iCal',
  'ical_feed.updated': 'Editó el calendario iCal',
  'ical_feed.deleted': 'Quitó el calendario iCal',
  'payroll.period_created': 'Creó el período de nómina',
  'payroll.period_computed': 'Calculó la nómina de',
  'payroll.period_reviewed': 'Pasó a revisión',
  'payroll.period_reopened': 'Volvió a borrador',
  'payroll.period_closed': 'Cerró la nómina de',
  'payroll.period_deleted': 'Borró el período de nómina',
  'payroll.entry_updated': 'Corrigió la línea de nómina de',
  'payroll.settings_updated': 'Cambió la',
  'disciplinary.created': 'Registró una acción disciplinaria a',
  'disciplinary.acknowledged': 'Dio acuse de su acción disciplinaria:',
};

/** Las acciones sobre personas cuando el cambio de asignaciones es por persona. */
const USER_VERBS: Record<string, string> = {
  'property.assignments_changed': 'Cambió las propiedades asignadas a',
  'property.owners_changed': 'Cambió las propiedades de',
};

/** Frase legible de una fila ("Editó la propiedad TB-504"). */
export function auditPhrase(r: AuditRecord): string {
  const verb = (r.entity === 'user' ? USER_VERBS[r.action] : undefined) ?? VERBS[r.action];
  if (!verb) return r.action;
  if (r.action === 'invitation.accepted' || r.action === 'tenant.settings_updated') return verb;
  const label = r.entity_label ?? r.property_code;
  return label ? `${verb} ${label}` : verb;
}

/** Navegador y sistema a partir del agente de usuario ("Chrome · Windows"). */
export function deviceOf(ua: string | null): string {
  if (!ua) return 'Desconocido';
  if (/^Go-http-client|^curl/i.test(ua)) return 'Script';
  if (/dart|okhttp|argos-app/i.test(ua)) return 'App ARGOS';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const os = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} · ${os}` : browser;
}
