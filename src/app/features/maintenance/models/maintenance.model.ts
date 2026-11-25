import { BadgeTone } from '../../../shared/atoms/badge/badge.component';
import { IconName } from '../../../shared/atoms/icon/icon.component';
import type { DimIconName } from '../../../shared/atoms/dim-icon/dim-icon.component';

/**
 * Contrato de mantenimiento (APP/docs/plans/fase03.md §5 y §4.1 "Contrato
 * implementado"): incidencias, activos, preventivos, proveedores e
 * indicadores. Fechas de día en AAAA-MM-DD; montos en GTQ.
 */

export type Urgency = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
export type AssetStatus = 'operational' | 'needs_attention' | 'in_repair' | 'out_of_service';
export type AssetCategory =
  | 'elevator' | 'camera' | 'water' | 'paint' | 'appliance' | 'plumbing'
  | 'electrical' | 'hvac' | 'hospitality' | 'furniture' | 'other';
export type DueState = 'ok' | 'upcoming' | 'overdue' | 'inactive';
export type TicketEventType = 'created' | 'updated' | 'assigned' | 'started' | 'resolved' | 'closed' | 'rejected' | 'reopened';

export interface Ticket {
  readonly id: string;
  readonly number: number;
  readonly property_id: string | null;
  readonly property_code: string | null;
  readonly property_name: string | null;
  readonly building_id: string | null;
  readonly building_name: string | null;
  readonly asset_id: string | null;
  readonly asset_name: string | null;
  readonly asset_category: AssetCategory | null;
  readonly plan_id: string | null;
  readonly plan_name: string | null;
  readonly title: string;
  readonly description: string;
  readonly urgency: Urgency;
  readonly status: TicketStatus;
  readonly reported_by_user_id: string | null;
  readonly reporter_name: string | null;
  readonly assigned_to: string | null;
  readonly assignee_name: string | null;
  readonly vendor_id: string | null;
  readonly vendor_name: string | null;
  readonly task_id: string | null;
  readonly resolution: string | null;
  readonly cost: number | null;
  readonly photos_count: number;
  readonly resolved_at: string | null;
  readonly closed_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface TicketEvent {
  readonly id: string;
  readonly type: TicketEventType;
  readonly actor_user_id: string | null;
  readonly actor_name: string | null;
  readonly data: Readonly<Record<string, unknown>>;
  readonly created_at: string;
}

export interface TicketPhoto {
  readonly file_id: string;
  readonly stage: 'report' | 'resolution';
  readonly url: string;
  readonly created_at: string;
}

export interface TicketDetail extends Ticket {
  readonly events: readonly TicketEvent[];
  readonly photos: readonly TicketPhoto[];
}

export interface TicketDraft {
  readonly property_id: string;
  readonly asset_id?: string | null;
  readonly title: string;
  readonly description?: string;
  readonly urgency: Urgency;
  readonly photo_file_ids?: readonly string[];
}

export interface TicketPatch {
  readonly title?: string;
  readonly description?: string;
  readonly urgency?: Urgency;
  readonly asset_id?: string | null;
  readonly cost?: number | null;
}

export interface AssignDraft {
  readonly assignee_id?: string | null;
  readonly vendor_id?: string | null;
  readonly note?: string;
}

export interface ResolveDraft {
  readonly resolution: string;
  readonly cost?: number | null;
  readonly photo_file_ids?: readonly string[];
  readonly asset_operational?: boolean;
}

export interface TicketQuery {
  readonly status?: string;
  readonly property_id?: string;
  readonly asset_id?: string;
  readonly vendor_id?: string;
  readonly q?: string;
}

export interface Assignable {
  readonly user_id: string;
  readonly full_name: string;
  readonly role_name: string;
  readonly open_tickets: number;
}

export interface Asset {
  readonly id: string;
  readonly property_id: string | null;
  readonly property_code: string | null;
  readonly property_name: string | null;
  readonly building_id: string | null;
  readonly building_name: string | null;
  readonly category: AssetCategory;
  readonly name: string;
  readonly brand: string | null;
  readonly model: string | null;
  readonly serial: string | null;
  readonly location: string | null;
  readonly installed_at: string | null;
  readonly warranty_until: string | null;
  readonly vendor_id: string | null;
  readonly vendor_name: string | null;
  readonly status: AssetStatus;
  readonly notes: string | null;
  readonly is_active: boolean;
  readonly open_tickets: number;
  readonly tickets_count: number;
  readonly cost_year: number;
  readonly next_due_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AssetDocument {
  readonly file_id: string;
  readonly name: string;
  readonly content_type: string;
  readonly size_bytes: number;
  readonly url: string;
  readonly created_at: string;
}

export interface AssetDetail extends Asset {
  readonly plans: readonly Plan[];
  readonly documents: readonly AssetDocument[];
  readonly tickets: readonly Ticket[];
}

export interface AssetDraft {
  readonly property_id?: string | null;
  readonly building_id?: string | null;
  readonly category: AssetCategory;
  readonly name: string;
  readonly brand?: string | null;
  readonly model?: string | null;
  readonly serial?: string | null;
  readonly location?: string | null;
  readonly installed_at?: string | null;
  readonly warranty_until?: string | null;
  readonly vendor_id?: string | null;
  readonly status?: AssetStatus;
  readonly notes?: string | null;
}

export type AssetPatch = Partial<AssetDraft> & { readonly is_active?: boolean };

export interface Plan {
  readonly id: string;
  readonly asset_id: string;
  readonly asset_name: string;
  readonly asset_category: AssetCategory;
  readonly property_id: string | null;
  readonly property_code: string | null;
  readonly building_name: string | null;
  readonly name: string;
  readonly frequency_days: number;
  readonly responsible_user_id: string | null;
  readonly responsible_name: string | null;
  readonly vendor_id: string | null;
  readonly vendor_name: string | null;
  readonly last_done_at: string | null;
  readonly next_due_at: string;
  readonly lead_days: number;
  readonly is_active: boolean;
  readonly due_state: DueState;
  readonly open_ticket_id: string | null;
  readonly open_ticket_number: number | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface PlanDraft {
  readonly name: string;
  readonly frequency_days: number;
  readonly responsible_user_id?: string | null;
  readonly vendor_id?: string | null;
  readonly last_done_at?: string | null;
  readonly next_due_at?: string | null;
  readonly lead_days?: number;
}

export type PlanPatch = Partial<PlanDraft> & { readonly is_active?: boolean };

export interface Vendor {
  readonly id: string;
  readonly name: string;
  readonly service_type: string | null;
  readonly contact_name: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly notes: string | null;
  readonly is_active: boolean;
  readonly assets_count: number;
  readonly open_tickets: number;
  readonly tickets_done: number;
  readonly spend_year: number;
  readonly avg_hours: number | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface VendorDraft {
  readonly name: string;
  readonly service_type?: string | null;
  readonly contact_name?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly notes?: string | null;
}

export type VendorPatch = Partial<VendorDraft> & { readonly is_active?: boolean };

export interface Metrics {
  readonly open: number;
  readonly urgent: number;
  readonly unassigned: number;
  readonly overdue_plans: number;
  readonly due_plans: number;
  readonly avg_hours: number | null;
  readonly cost_month: number;
  readonly cost_year: number;
  readonly open_by_place: readonly { kind: 'property' | 'building'; id: string; code: string | null; name: string; open: number }[];
  readonly resolution: readonly { month: string; hours: number | null; resolved: number }[];
  readonly cost_by_category: readonly { category: AssetCategory | 'none'; cost: number; tickets: number }[];
}

// --- Etiquetas -------------------------------------------------------------------

export const URGENCY_META: Record<Urgency, { label: string; tone: BadgeTone; dot: string }> = {
  low: { label: 'Baja', tone: 'muted', dot: 'var(--color-text-muted)' },
  medium: { label: 'Media', tone: 'info', dot: 'var(--color-teal-muted)' },
  high: { label: 'Alta', tone: 'warning', dot: 'var(--color-warning)' },
  critical: { label: 'Crítica', tone: 'danger', dot: 'var(--color-danger)' },
};

export const TICKET_STATUS: Record<TicketStatus, { label: string; column: string; tone: BadgeTone; color: string }> = {
  open: { label: 'Nueva', column: 'Nuevas', tone: 'danger', color: 'var(--color-danger)' },
  assigned: { label: 'Asignada', column: 'Asignadas', tone: 'info', color: 'var(--color-teal-muted)' },
  in_progress: { label: 'En curso', column: 'En curso', tone: 'warning', color: 'var(--color-secondary)' },
  resolved: { label: 'Resuelta', column: 'Resueltas', tone: 'success', color: 'var(--color-success)' },
  closed: { label: 'Cerrada', column: 'Cerradas', tone: 'muted', color: 'var(--color-text-muted)' },
  rejected: { label: 'Rechazada', column: 'Rechazadas', tone: 'muted', color: 'var(--color-text-muted)' },
};

export const ASSET_STATUS: Record<AssetStatus, { label: string; tone: BadgeTone; color: string; rank: number }> = {
  operational: { label: 'Operando', tone: 'success', color: '#5a8a6b', rank: 3 },
  needs_attention: { label: 'Necesita atención', tone: 'warning', color: '#d08a2e', rank: 1 },
  in_repair: { label: 'En reparación', tone: 'info', color: '#3a7f8c', rank: 2 },
  out_of_service: { label: 'Fuera de servicio', tone: 'danger', color: '#b8432f', rank: 0 },
};

/** Ícono de línea (filtros, gráficas), objeto con volumen y colores de su mosaico. */
export const CATEGORY_META: Record<AssetCategory | 'none', { label: string; icon: IconName; dim: DimIconName; bg: string; ink: string }> = {
  elevator: { label: 'Elevador', icon: 'building', dim: 'elevator', bg: '#e2edef', ink: '#2c5c64' },
  camera: { label: 'Cámaras', icon: 'eye', dim: 'camera', bg: '#e8edf0', ink: '#3d5560' },
  water: { label: 'Agua y bombas', icon: 'droplet', dim: 'water', bg: '#dcf0f4', ink: '#22677a' },
  paint: { label: 'Pintura', icon: 'brush', dim: 'paint', bg: '#f8e2d6', ink: '#93421f' },
  appliance: { label: 'Electrodoméstico', icon: 'plug', dim: 'appliance', bg: '#eceeea', ink: '#4e5e5c' },
  plumbing: { label: 'Plomería', icon: 'wrench', dim: 'plumbing', bg: '#e2edef', ink: '#2c5c64' },
  electrical: { label: 'Electricidad', icon: 'bolt', dim: 'electrical', bg: '#fbecd9', ink: '#93561a' },
  hvac: { label: 'Aire acondicionado', icon: 'wind', dim: 'hvac', bg: '#dcf0f4', ink: '#22677a' },
  hospitality: { label: 'Hotelería', icon: 'bed', dim: 'room', bg: '#f4ead0', ink: '#74560f' },
  furniture: { label: 'Mobiliario', icon: 'sofa', dim: 'furniture', bg: '#fbecd9', ink: '#93561a' },
  other: { label: 'Otro', icon: 'maintenance', dim: 'incident', bg: '#f6e1dc', ink: '#892f26' },
  none: { label: 'Sin activo', icon: 'maintenance', dim: 'incident', bg: '#f6e1dc', ink: '#892f26' },
};

export const CATEGORIES = Object.keys(CATEGORY_META).filter((k) => k !== 'none') as AssetCategory[];

export const DUE_META: Record<DueState, { label: string; tone: BadgeTone }> = {
  ok: { label: 'Al día', tone: 'neutral' },
  upcoming: { label: 'Toca pronto', tone: 'warning' },
  overdue: { label: 'Vencido', tone: 'danger' },
  inactive: { label: 'Pausado', tone: 'muted' },
};

/** Abiertas: en el tablero y en los contadores. */
export const ACTIVE_STATUSES: readonly TicketStatus[] = ['open', 'assigned', 'in_progress'];

/** Dónde está: código de la propiedad o nombre del edificio. */
export function placeOf(t: { property_code: string | null; building_name: string | null }): string {
  return t.property_code ?? t.building_name ?? 'Sin ubicación';
}

/** Frecuencia en palabras ("cada 30 días", "cada 3 meses"). */
export function frequencyLabel(days: number): string {
  if (days % 365 === 0) return days === 365 ? 'Cada año' : `Cada ${days / 365} años`;
  if (days % 30 === 0) return days === 30 ? 'Cada mes' : `Cada ${days / 30} meses`;
  if (days % 7 === 0) return days === 7 ? 'Cada semana' : `Cada ${days / 7} semanas`;
  return `Cada ${days} días`;
}
