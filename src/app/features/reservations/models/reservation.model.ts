import { BadgeTone } from '../../../shared/atoms/badge/badge.component';

/**
 * Contrato de reservas (APP/docs/plans/fase04.md §4.1): canales, calendarios
 * iCal, huéspedes, reservas, depósito e inspecciones. Fechas `AAAA-MM-DD`
 * (la salida es exclusiva) y horas `HH:MM`, en la zona de la empresa.
 */

export type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
export type DepositStatus = 'none' | 'pending' | 'received' | 'returned' | 'retained_partial' | 'retained_full';
export type ChannelKind = 'direct' | 'booking' | 'airbnb' | 'agency' | 'other';
export type DocumentType = 'dpi' | 'passport';
export type Severity = 'low' | 'medium' | 'high';
export type InspectionKind = 'pre_arrival' | 'post_departure';
export type DepositTxType = 'received' | 'returned' | 'retained';
export type PayMethod = 'cash' | 'transfer' | 'card' | 'other';

export interface Channel {
  readonly id: string;
  readonly name: string;
  readonly kind: ChannelKind;
  readonly requires_deposit: boolean;
  readonly has_checkin: boolean;
  readonly default_deposit_amount: number | null;
  readonly is_active: boolean;
  readonly feeds_count: number;
  readonly upcoming_count: number;
}

export interface ChannelDraft {
  readonly name: string;
  readonly kind: ChannelKind;
  readonly requires_deposit: boolean;
  readonly has_checkin: boolean;
  readonly default_deposit_amount: number | null;
  readonly is_active?: boolean;
}

export interface Feed {
  readonly id: string;
  readonly property_id: string;
  readonly property_code: string;
  readonly property_name: string;
  readonly channel_id: string;
  readonly channel_name: string;
  readonly channel_kind: ChannelKind;
  readonly url: string;
  readonly is_active: boolean;
  readonly last_synced_at: string | null;
  readonly last_success_at: string | null;
  readonly last_error: string | null;
  readonly events_count: number | null;
}

export interface SyncResult {
  readonly feed_id: string;
  readonly property_code: string;
  readonly channel_name: string;
  readonly ok: boolean;
  readonly error: string | null;
  readonly events: number;
  readonly created: number;
  readonly updated: number;
  readonly cancelled: number;
  readonly conflicts: readonly string[];
}

export interface Guest {
  readonly id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly document_type: DocumentType | null;
  readonly document_number: string | null;
  readonly nationality: string | null;
  readonly notes: string | null;
  readonly blacklisted: boolean;
  readonly blacklist_reason: string | null;
  readonly stays: number;
  readonly last_stay: string | null;
  readonly next_stay: string | null;
}

export interface GuestDocument {
  readonly file_id: string;
  readonly kind: 'id_front' | 'id_back';
  readonly content_type: string;
  readonly size_bytes: number;
  readonly created_at: string;
  readonly expires_at: string | null;
}

export interface GuestDetail extends Guest {
  readonly reservations: readonly Reservation[];
  readonly documents: readonly GuestDocument[];
}

export interface GuestDraft {
  readonly full_name: string;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly document_type?: DocumentType | null;
  readonly document_number?: string | null;
  readonly nationality?: string | null;
  readonly notes?: string | null;
}

export type GuestPatch = Partial<GuestDraft> & { readonly blacklisted?: boolean; readonly blacklist_reason?: string | null };

export interface Reservation {
  readonly id: string;
  readonly code: string;
  readonly property_id: string;
  readonly property_code: string;
  readonly property_name: string;
  readonly channel_id: string;
  readonly channel_name: string;
  readonly channel_kind: ChannelKind;
  readonly requires_deposit: boolean;
  readonly has_checkin: boolean;
  readonly source: 'manual' | 'ical' | 'api';
  readonly external_ref: string | null;
  readonly external_summary: string | null;
  readonly primary_guest_id: string | null;
  readonly guest_name: string | null;
  readonly guest_email: string | null;
  readonly guests_count: number;
  readonly guests_pending: number;
  readonly status: ReservationStatus;
  readonly incomplete: boolean;
  readonly check_in_date: string;
  readonly check_out_date: string;
  readonly check_in_time: string;
  readonly check_out_time: string;
  readonly nights: number;
  readonly checked_in_at: string | null;
  readonly checked_out_at: string | null;
  readonly adults: number;
  readonly children: number;
  readonly total_amount: number | null;
  readonly currency: string;
  readonly deposit_amount: number | null;
  readonly deposit_status: DepositStatus;
  readonly notes: string | null;
  readonly cancelled_at: string | null;
  readonly cancel_reason: string | null;
  readonly created_at: string;
}

export interface ReservationGuest extends Guest {
  readonly is_primary: boolean;
  readonly registered: boolean;
  readonly missing: readonly ('email' | 'document' | 'id_front' | 'id_back')[];
  /** Fotos vigentes (vacío sin guests.read); la URL se pide con guests.documents. */
  readonly documents: readonly GuestDocument[];
}

export interface ResEvent {
  readonly id: string;
  readonly type: string;
  readonly actor_name: string | null;
  readonly data: Readonly<Record<string, unknown>>;
  readonly created_at: string;
}

export interface DepositTx {
  readonly id: string;
  readonly type: DepositTxType;
  readonly amount: number;
  readonly method: PayMethod;
  readonly reference: string | null;
  readonly notes: string | null;
  readonly registered_by_name: string | null;
  readonly created_at: string;
}

export interface Deposit {
  readonly available: boolean;
  readonly amount: number | null;
  readonly status: DepositStatus;
  readonly received: number;
  readonly returned: number;
  readonly retained: number;
  readonly balance: number;
  readonly charges: number;
  readonly inspection_required: boolean;
  readonly transactions: readonly DepositTx[];
}

export interface DepositTxDraft {
  readonly type: DepositTxType;
  readonly amount: number;
  readonly method: PayMethod;
  readonly reference?: string | null;
  readonly notes?: string | null;
}

export interface Photo {
  readonly file_id: string;
  readonly url: string;
  readonly created_at: string;
}

export interface Finding {
  readonly id: string;
  readonly area: string;
  readonly description: string;
  readonly severity: Severity;
  readonly estimated_cost: number | null;
  readonly charge_to_deposit: boolean;
  readonly ticket_id: string | null;
  readonly ticket_number: number | null;
  readonly photos: readonly Photo[];
}

export interface Inspection {
  readonly id: string;
  readonly kind: InspectionKind;
  readonly performed_by_name: string | null;
  readonly performed_at: string;
  readonly notes: string | null;
  readonly photos: readonly Photo[];
  readonly findings: readonly Finding[];
}

export interface FindingDraft {
  readonly area: string;
  readonly description: string;
  readonly severity: Severity;
  readonly estimated_cost?: number | null;
  readonly charge_to_deposit: boolean;
  readonly create_ticket: boolean;
  readonly photo_file_ids?: readonly string[];
}

export interface ReservationDetail extends Reservation {
  readonly guests: readonly ReservationGuest[];
  readonly events: readonly ResEvent[];
  readonly deposit: Deposit;
  readonly inspections: readonly Inspection[];
}

export interface ReservationDraft {
  readonly property_id: string;
  readonly channel_id: string;
  readonly check_in_date: string;
  readonly check_out_date: string;
  readonly check_in_time?: string | null;
  readonly check_out_time?: string | null;
  readonly adults: number;
  readonly children: number;
  readonly total_amount?: number | null;
  readonly deposit_amount?: number | null;
  readonly primary_guest_id?: string | null;
  readonly guest?: GuestDraft | null;
  readonly notes?: string | null;
  readonly send_email: boolean;
}

export interface ReservationPatch {
  readonly channel_id?: string;
  readonly check_in_date?: string;
  readonly check_out_date?: string;
  readonly check_in_time?: string;
  readonly check_out_time?: string;
  readonly adults?: number;
  readonly children?: number;
  readonly total_amount?: number | null;
  readonly deposit_amount?: number | null;
  readonly notes?: string | null;
}

export interface Today {
  readonly available: boolean;
  readonly arrivals: number;
  readonly departures: number;
  readonly in_house: number;
  readonly incomplete: number;
  readonly checkin_time: string;
}

export interface ReservationQuery {
  readonly from?: string;
  readonly to?: string;
  readonly property_id?: string;
  readonly guest_id?: string;
  readonly status?: string;
  readonly incomplete?: boolean;
  readonly q?: string;
}

// --- Presentación -------------------------------------------------------------

export const RES_STATUS: Record<ReservationStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Por confirmar', tone: 'warning' },
  confirmed: { label: 'Confirmada', tone: 'info' },
  checked_in: { label: 'En casa', tone: 'success' },
  checked_out: { label: 'Salió', tone: 'validated' },
  cancelled: { label: 'Cancelada', tone: 'muted' },
  no_show: { label: 'No llegó', tone: 'danger' },
};

export const DEPOSIT_STATUS: Record<DepositStatus, { label: string; tone: BadgeTone }> = {
  none: { label: 'Sin depósito', tone: 'muted' },
  pending: { label: 'Por cobrar', tone: 'warning' },
  received: { label: 'Recibido', tone: 'info' },
  returned: { label: 'Devuelto', tone: 'success' },
  retained_partial: { label: 'Retenido en parte', tone: 'warning' },
  retained_full: { label: 'Retenido', tone: 'danger' },
};

export const CHANNEL_KINDS: Record<ChannelKind, string> = {
  direct: 'Venta directa',
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  agency: 'Agencia',
  other: 'Otro canal',
};

/**
 * Color por tipo de canal: paleta categórica validada con la guía dataviz
 * (banda de luminosidad, croma, separación con daltonismo y contraste).
 */
const KIND_COLOR: Record<ChannelKind, string> = {
  airbnb: '#d0584a',
  booking: '#3a78c0',
  agency: '#b97a1f',
  direct: '#0f8a6a',
  other: '#7b6aa8',
};

export function channelColor(kind: ChannelKind | null | undefined): string {
  return kind ? KIND_COLOR[kind] : 'var(--color-teal-muted)';
}

export const PAY_METHOD: Record<PayMethod, string> = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta', other: 'Otro' };

export const SEVERITY: Record<Severity, { label: string; tone: BadgeTone }> = {
  low: { label: 'Leve', tone: 'muted' },
  medium: { label: 'Media', tone: 'warning' },
  high: { label: 'Grave', tone: 'danger' },
};

export const MISSING_LABEL: Record<ReservationGuest['missing'][number], string> = {
  email: 'correo',
  document: 'documento',
  id_front: 'foto del frente',
  id_back: 'foto del reverso',
};

/** Estancias vivas: ocupan el calendario. */
export function isLive(r: Pick<Reservation, 'status'>): boolean {
  return r.status !== 'cancelled' && r.status !== 'no_show';
}

/** Dos estancias se solapan si una entra antes de que la otra salga. */
export function overlaps(a: { check_in_date: string; check_out_date: string }, b: { check_in_date: string; check_out_date: string }): boolean {
  return a.check_in_date < b.check_out_date && b.check_in_date < a.check_out_date;
}

export function nightsBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000);
}

/** Nombre que se muestra: el huésped o el resumen de la importación. */
export function guestLabel(r: Pick<Reservation, 'guest_name' | 'incomplete'>): string {
  return r.guest_name ?? (r.incomplete ? 'Por completar' : 'Sin huésped');
}
