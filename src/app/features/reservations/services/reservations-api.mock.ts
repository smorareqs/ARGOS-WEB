import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, latency, uid } from '../../../core/mocks/mock-utils';
import { opsProperties } from '../../../core/mocks/demo-ops';
import { ApiError } from '../../../core/http/api-error';
import { dayKey } from '../../../shared/utils/time';
import { GuestLinkDraft, ReservationMove, ReservationStop, ReservationsApi } from './reservations-api.service';
import {
  Channel, ChannelDraft, Deposit, DepositStatus, DepositTxDraft, Feed, FindingDraft, Guest, GuestDetail, GuestDocument, GuestDraft,
  GuestPatch, InspectionKind, Photo, Reservation, ReservationDetail, ReservationDraft, ReservationPatch, ReservationQuery,
  ReservationStatus, SyncResult, Today, isLive, nightsBetween, overlaps,
} from '../models/reservation.model';

/**
 * Reservas simuladas (solo el build de demostración): misma forma que la API
 * de fase04.md §4.1, con las reglas principales (cruces, registro y depósito
 * para el check-in, inspección para liquidar el depósito). Las fotos viven en
 * memoria del navegador.
 */
interface State {
  channels: Channel[];
  guests: (Guest & { docs: GuestDocument[] })[];
  reservations: ReservationDetail[];
  feeds: Feed[];
}

const GUESTS: readonly [string, string, string | null, string][] = [
  ['Lucía Pérez', 'lucia.perez@correo.gt', '2456789010101', 'GT'],
  ['Emily Carter', 'emily.carter@mail.com', 'P568901234', 'US'],
  ['Andrés Molina', 'andres.molina@correo.gt', '1987654320101', 'GT'],
  ['Hans Müller', 'hans.mueller@mail.de', 'C4R7T2K9', 'DE'],
  ['Carlos Mendoza', 'carlos.mendoza@correo.gt', '3012457890101', 'GT'],
  ['Sophie Martin', 'sophie.martin@mail.fr', null, 'FR'],
  ['Mario Ruiz', 'mario.ruiz@correo.gt', null, 'GT'],
  ['Ana Gómez', 'ana.gomez@correo.sv', 'A12345678', 'SV'],
  ['James Wilson', 'james.wilson@mail.com', null, 'US'],
  ['Laura Castillo', 'laura.castillo@correo.gt', '2987123450101', 'GT'],
];

/** [propiedad, canal, huésped, desde, hasta, estado] relativos a hoy. */
const STAYS: readonly [number, Channel['kind'], number | null, number, number, ReservationStatus][] = [
  [0, 'direct', 0, -12, -8, 'checked_out'], [1, 'airbnb', 1, -9, -5, 'checked_out'], [2, 'direct', 4, -2, 2, 'checked_in'],
  [3, 'booking', 3, -3, 1, 'checked_in'], [0, 'direct', 6, 0, 3, 'confirmed'], [4, 'airbnb', 8, 0, 5, 'confirmed'],
  [5, 'agency', 7, 2, 5, 'confirmed'], [1, 'booking', null, 3, 7, 'pending'], [2, 'airbnb', 5, 5, 9, 'confirmed'],
  [6, 'direct', 9, 8, 12, 'confirmed'], [3, 'direct', 2, 10, 13, 'cancelled'],
];

@Injectable()
export class MockReservationsApi extends ReservationsApi {
  private readonly session = inject(SessionStore);
  private readonly blobs = new Map<string, string>();

  private table(): MockTable<State> {
    const t = mockTenantKey(this.session.tenant());
    return new MockTable<State>(`reservations_v4_${t}`, () => [seed(t)]);
  }
  private read(): State {
    return this.table().all()[0];
  }
  private write(s: State): void {
    this.table().save([s]);
  }

  async reservations(q: ReservationQuery): Promise<readonly Reservation[]> {
    await latency();
    const term = (q.q ?? '').toLowerCase();
    return this.read().reservations.filter((r) =>
      (!q.from || r.check_out_date > q.from) && (!q.to || r.check_in_date < q.to) && (!q.property_id || r.property_id === q.property_id) &&
      (!q.guest_id || r.guests.some((g) => g.id === q.guest_id)) && (!q.incomplete || r.incomplete) &&
      (!term || `${r.code} ${r.guest_name ?? ''} ${r.property_code}`.toLowerCase().includes(term)));
  }

  async today(): Promise<Today> {
    const k = dayKey();
    const live = this.read().reservations.filter(isLive);
    return {
      available: true, checkin_time: '15:00',
      arrivals: live.filter((r) => r.check_in_date === k && r.status !== 'pending').length,
      departures: live.filter((r) => r.check_out_date === k).length,
      in_house: live.filter((r) => r.status === 'checked_in').length,
      incomplete: live.filter((r) => r.incomplete && r.check_out_date > k).length,
    };
  }

  async reservation(id: string): Promise<ReservationDetail> {
    await latency(150, 300);
    return this.find(this.read(), id);
  }

  async create(d: ReservationDraft): Promise<ReservationDetail> {
    await latency();
    const s = this.read();
    this.checkOverlap(s, d.property_id, d.check_in_date, d.check_out_date, null);
    const p = opsProperties(mockTenantKey(this.session.tenant())).find((x) => x.id === d.property_id);
    const c = s.channels.find((x) => x.id === d.channel_id);
    if (!p || !c) throw new ApiError(422, 'Revisa la propiedad y el canal.');
    let guestId = d.primary_guest_id ?? null;
    if (d.guest) guestId = this.newGuest(s, d.guest).id;
    const deposit = d.deposit_amount ?? (c.requires_deposit ? c.default_deposit_amount : null);
    const r = build(s, {
      property: p, channel: c, guestId, from: d.check_in_date, to: d.check_out_date, status: guestId ? 'confirmed' : 'pending',
      deposit, total: d.total_amount ?? null, adults: d.adults, children: d.children, notes: d.notes ?? null, source: 'manual',
    });
    s.reservations.push(r);
    this.write(s);
    return this.find(s, r.id);
  }

  async update(id: string, p: ReservationPatch): Promise<ReservationDetail> {
    await latency();
    const s = this.read();
    const r = this.find(s, id);
    const from = p.check_in_date ?? r.check_in_date;
    const to = p.check_out_date ?? r.check_out_date;
    if (to <= from) throw new ApiError(422, 'Revisa las fechas.', [{ location: 'body.check_out_date', message: 'La salida debe ser después de la entrada.' }]);
    this.checkOverlap(s, r.property_id, from, to, r.id);
    return this.save(s, { ...r, ...stripNulls(p), check_in_date: from, check_out_date: to, nights: nightsBetween(from, to), total_amount: p.total_amount !== undefined ? p.total_amount : r.total_amount, deposit_amount: p.deposit_amount !== undefined ? p.deposit_amount : r.deposit_amount, notes: p.notes !== undefined ? p.notes : r.notes }, 'updated', {});
  }

  async confirm(id: string, sendEmail: boolean): Promise<ReservationDetail> {
    await latency();
    const s = this.read();
    const r = this.find(s, id);
    if (!r.primary_guest_id) throw new ApiError(422, 'Indica el huésped principal.');
    return this.save(s, { ...r, status: 'confirmed' }, 'confirmed', { email_sent: sendEmail && !!r.guest_email });
  }

  async stop(id: string, action: ReservationStop, reason: string): Promise<ReservationDetail> {
    await latency();
    const s = this.read();
    const r = this.find(s, id);
    const status = action === 'cancel' ? 'cancelled' : 'no_show';
    return this.save(s, { ...r, status, cancel_reason: reason, deposit_status: r.deposit_status === 'pending' ? 'none' : r.deposit_status }, status, { reason });
  }

  async move(id: string, action: ReservationMove): Promise<ReservationDetail> {
    await latency();
    const s = this.read();
    const r = this.find(s, id);
    if (action === 'resend') return this.save(s, r, 'email_sent', { template: 'confirmation' });
    if (action === 'check-in') {
      const missing = r.guests.filter((g) => !g.registered).map((g) => g.full_name);
      if (r.has_checkin && (missing.length || !r.guests.length)) throw new ApiError(422, `Faltan datos de huéspedes para el check-in${missing.length ? ': ' + missing.join(', ') : ''}.`);
      if (r.requires_deposit && (r.deposit_amount ?? 0) > 0 && r.deposit_status !== 'received') throw new ApiError(422, 'Registra el depósito antes del check-in.');
      return this.save(s, { ...r, status: 'checked_in', checked_in_at: new Date().toISOString() }, 'checked_in', {});
    }
    return this.save(s, { ...r, status: 'checked_out', checked_out_at: new Date().toISOString() }, 'checked_out', {});
  }

  async addGuest(id: string, link: GuestLinkDraft): Promise<ReservationDetail> {
    await latency();
    const s = this.read();
    const r = this.find(s, id);
    const g = link.guest_id ? s.guests.find((x) => x.id === link.guest_id) : this.newGuest(s, link.guest!);
    if (!g) throw new ApiError(404, 'El huésped no existe.');
    const primary = !!link.is_primary || !r.primary_guest_id;
    const ids = [...new Set([...(primary ? [g.id] : []), ...r.guests.map((x) => x.id).filter((x) => x !== g.id), ...(primary ? [] : [g.id])])];
    return this.save(s, { ...r, primary_guest_id: primary ? g.id : r.primary_guest_id, guestIds: ids } as ReservationDetail & { guestIds: string[] }, 'guest_added', { guest_name: g.full_name, primary });
  }

  async removeGuest(id: string, guestId: string): Promise<ReservationDetail> {
    await latency();
    const s = this.read();
    const r = this.find(s, id);
    return this.save(s, { ...r, guestIds: r.guests.map((g) => g.id).filter((x) => x !== guestId) } as ReservationDetail & { guestIds: string[] }, 'guest_removed', { guest_name: r.guests.find((g) => g.id === guestId)?.full_name ?? '' });
  }

  async addDepositTx(id: string, tx: DepositTxDraft): Promise<Deposit> {
    await latency();
    const s = this.read();
    const r = this.find(s, id);
    const d = r.deposit;
    if (tx.type === 'received' && d.received + tx.amount > (r.deposit_amount ?? 0) + 0.001) throw new ApiError(422, 'Revisa el monto.', [{ location: 'body.amount', message: 'El monto supera lo que queda del depósito.' }]);
    if (tx.type !== 'received' && tx.amount > d.balance + 0.001) throw new ApiError(422, 'Revisa el monto.', [{ location: 'body.amount', message: 'El monto supera lo que queda del depósito.' }]);
    if (tx.type !== 'received' && isLive(r) && d.inspection_required) throw new ApiError(422, 'Primero registra la inspección de salida.');
    const t = { id: uid('dtx'), type: tx.type, amount: tx.amount, method: tx.method, reference: tx.reference ?? null, notes: tx.notes ?? null, registered_by_name: this.session.user()?.nombre ?? null, created_at: new Date().toISOString() };
    const saved = this.save(s, { ...r, deposit: { ...d, transactions: [...d.transactions, t] } }, `deposit_${tx.type}`, { amount: tx.amount });
    return saved.deposit;
  }

  async createInspection(id: string, kind: InspectionKind, notes: string | null, photos: readonly File[]): Promise<ReservationDetail> {
    await latency();
    const s = this.read();
    const r = this.find(s, id);
    if (r.inspections.some((i) => i.kind === kind)) throw new ApiError(422, 'Esta reserva ya tiene esa inspección.');
    const insp = { id: uid('insp'), kind, performed_by_name: this.session.user()?.nombre ?? null, performed_at: new Date().toISOString(), notes, photos: this.photos(photos), findings: [] };
    return this.save(s, { ...r, inspections: [...r.inspections, insp] }, 'inspection', { kind });
  }

  async addFinding(inspectionId: string, d: FindingDraft, photos: readonly File[]): Promise<ReservationDetail> {
    await latency();
    const s = this.read();
    const r = s.reservations.find((x) => x.inspections.some((i) => i.id === inspectionId));
    if (!r) throw new ApiError(404, 'La inspección no existe.');
    const f = { id: uid('fnd'), area: d.area, description: d.description, severity: d.severity, estimated_cost: d.estimated_cost ?? null, charge_to_deposit: d.charge_to_deposit, ticket_id: null, ticket_number: d.create_ticket ? 100 + Math.floor(Math.random() * 50) : null, photos: this.photos(photos) };
    const inspections = r.inspections.map((i) => (i.id === inspectionId ? { ...i, findings: [...i.findings, f] } : i));
    return this.save(s, { ...r, inspections }, 'finding', { area: d.area, ticket: d.create_ticket });
  }

  async removeFinding(inspectionId: string, findingId: string): Promise<ReservationDetail> {
    await latency();
    const s = this.read();
    const r = s.reservations.find((x) => x.inspections.some((i) => i.id === inspectionId));
    if (!r) throw new ApiError(404, 'La inspección no existe.');
    const inspections = r.inspections.map((i) => (i.id === inspectionId ? { ...i, findings: i.findings.filter((f) => f.id !== findingId) } : i));
    return this.save(s, { ...r, inspections }, 'finding_removed', {});
  }

  async guests(q: string): Promise<readonly Guest[]> {
    await latency(150, 300);
    const term = q.toLowerCase();
    return this.read().guests.filter((g) => !term || `${g.full_name} ${g.email ?? ''} ${g.document_number ?? ''}`.toLowerCase().includes(term)).map(publicGuest);
  }

  async guest(id: string): Promise<GuestDetail> {
    await latency(150, 300);
    const s = this.read();
    const g = s.guests.find((x) => x.id === id);
    if (!g) throw new ApiError(404, 'El huésped no existe.');
    return { ...publicGuest(g), documents: g.docs, reservations: s.reservations.filter((r) => r.guests.some((x) => x.id === id)) };
  }

  async createGuest(d: GuestDraft): Promise<Guest> {
    await latency();
    const s = this.read();
    const g = this.newGuest(s, d);
    this.write(s);
    return publicGuest(g);
  }

  async updateGuest(id: string, p: GuestPatch): Promise<Guest> {
    await latency();
    const s = this.read();
    const i = s.guests.findIndex((x) => x.id === id);
    if (i < 0) throw new ApiError(404, 'El huésped no existe.');
    s.guests[i] = { ...s.guests[i], ...(p as Partial<Guest>) };
    s.reservations = s.reservations.map((r) => refresh(s, r));
    this.write(s);
    return publicGuest(s.guests[i]);
  }

  async attachDocument(guestId: string, kind: 'id_front' | 'id_back', file: File): Promise<GuestDetail> {
    const s = this.read();
    const g = s.guests.find((x) => x.id === guestId);
    if (!g) throw new ApiError(404, 'El huésped no existe.');
    const fileId = uid('file');
    this.blobs.set(fileId, URL.createObjectURL(file));
    const expires = new Date(Date.now() + 90 * 86400000).toISOString();
    g.docs = [...g.docs.filter((d) => d.kind !== kind), { file_id: fileId, kind, content_type: file.type, size_bytes: file.size, created_at: new Date().toISOString(), expires_at: expires }];
    s.reservations = s.reservations.map((r) => refresh(s, r));
    this.write(s);
    return this.guest(guestId);
  }

  async documentUrl(_guestId: string, fileId: string): Promise<string> {
    await latency(150, 300);
    return this.blobs.get(fileId) ?? DEMO_CARD;
  }

  async channels(): Promise<readonly Channel[]> {
    return this.read().channels;
  }
  async createChannel(d: ChannelDraft): Promise<Channel> {
    await latency();
    const s = this.read();
    const c: Channel = { id: uid('ch'), name: d.name, kind: d.kind, requires_deposit: d.requires_deposit, has_checkin: d.has_checkin, default_deposit_amount: d.default_deposit_amount, is_active: true, feeds_count: 0, upcoming_count: 0 };
    s.channels.push(c);
    this.write(s);
    return c;
  }
  async updateChannel(id: string, p: Partial<ChannelDraft>): Promise<Channel> {
    await latency();
    const s = this.read();
    s.channels = s.channels.map((c) => (c.id === id ? { ...c, ...p } : c));
    this.write(s);
    return s.channels.find((c) => c.id === id)!;
  }
  async feeds(): Promise<readonly Feed[]> {
    await latency(150, 300);
    return this.read().feeds;
  }
  async createFeed(propertyId: string, channelId: string, url: string): Promise<Feed> {
    await latency();
    if (!/^https:\/\//i.test(url)) throw new ApiError(422, 'Revisa la URL.', [{ location: 'body.url', message: 'Pega la dirección https:// que te da el canal para exportar el calendario.' }]);
    const s = this.read();
    const p = opsProperties(mockTenantKey(this.session.tenant())).find((x) => x.id === propertyId)!;
    const c = s.channels.find((x) => x.id === channelId)!;
    const f: Feed = { id: uid('feed'), property_id: p.id, property_code: p.code, property_name: p.name, channel_id: c.id, channel_name: c.name, channel_kind: c.kind, url, is_active: true, last_synced_at: null, last_success_at: null, last_error: null, events_count: null };
    s.feeds.push(f);
    this.write(s);
    return f;
  }
  async updateFeed(id: string, p: { url?: string; is_active?: boolean }): Promise<Feed> {
    await latency();
    const s = this.read();
    s.feeds = s.feeds.map((f) => (f.id === id ? { ...f, ...p } : f));
    this.write(s);
    return s.feeds.find((f) => f.id === id)!;
  }
  async deleteFeed(id: string): Promise<void> {
    await latency();
    const s = this.read();
    s.feeds = s.feeds.filter((f) => f.id !== id);
    this.write(s);
  }
  async sync(feedId?: string): Promise<readonly SyncResult[]> {
    await latency(600, 1100);
    const s = this.read();
    const now = new Date().toISOString();
    const out: SyncResult[] = [];
    s.feeds = s.feeds.map((f) => {
      if ((feedId && f.id !== feedId) || (!feedId && !f.is_active)) return f;
      const bad = f.url.includes('no-existe');
      out.push({ feed_id: f.id, property_code: f.property_code, channel_name: f.channel_name, ok: !bad, error: bad ? 'El canal respondió 404.' : null, events: bad ? 0 : 2, created: 0, updated: 0, cancelled: 0, conflicts: [] });
      return { ...f, last_synced_at: now, last_success_at: bad ? f.last_success_at : now, last_error: bad ? 'El canal respondió 404.' : null, events_count: bad ? f.events_count : 2 };
    });
    this.write(s);
    return out;
  }

  // --- Ayudas -------------------------------------------------------------------

  private find(s: State, id: string): ReservationDetail {
    const r = s.reservations.find((x) => x.id === id);
    if (!r) throw new ApiError(404, 'La reserva no existe.');
    return refresh(s, r);
  }

  private save(s: State, r: ReservationDetail & { guestIds?: string[] }, event: string, data: Record<string, unknown>): ReservationDetail {
    const ev = { id: uid('ev'), type: event, actor_name: this.session.user()?.nombre ?? null, data, created_at: new Date().toISOString() };
    const next = refresh(s, { ...r, events: [...r.events, ev] }, r.guestIds);
    s.reservations = s.reservations.map((x) => (x.id === r.id ? next : x));
    this.write(s);
    return next;
  }

  private checkOverlap(s: State, propertyId: string, from: string, to: string, except: string | null): void {
    const hit = s.reservations.find((r) => r.id !== except && r.property_id === propertyId && isLive(r) && overlaps(r, { check_in_date: from, check_out_date: to }));
    if (hit) throw new ApiError(422, 'Las fechas se cruzan.', [{ location: 'body.check_in_date', message: `Se cruza con ${hit.code}${hit.guest_name ? ` de ${hit.guest_name}` : ''}.` }]);
  }

  private newGuest(s: State, d: GuestDraft): State['guests'][number] {
    const g = { ...blankGuest(uid('g'), d.full_name), email: d.email ?? null, phone: d.phone ?? null, document_type: d.document_type ?? null, document_number: d.document_number ?? null, nationality: d.nationality ?? null };
    s.guests.push(g);
    return g;
  }

  private photos(files: readonly File[]): Photo[] {
    return files.map((f) => ({ file_id: uid('file'), url: URL.createObjectURL(f), created_at: new Date().toISOString() }));
  }
}

// --- Semilla y derivados ---------------------------------------------------------

const DEMO_CARD = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#f1efe8"/><rect width="640" height="64" fill="#0b4f58"/><rect x="32" y="96" width="176" height="220" fill="#c9cfcd"/><rect x="240" y="110" width="300" height="14" fill="#9aa3a2"/><rect x="240" y="150" width="240" height="14" fill="#9aa3a2"/><rect x="240" y="190" width="280" height="14" fill="#9aa3a2"/></svg>')}`;

function blankGuest(id: string, name: string): State['guests'][number] {
  return { id, full_name: name, email: null, phone: null, document_type: null, document_number: null, nationality: null, notes: null, blacklisted: false, blacklist_reason: null, stays: 0, last_stay: null, next_stay: null, docs: [] };
}

function publicGuest(g: State['guests'][number]): Guest {
  const { docs: _docs, ...rest } = g;
  return rest;
}

function stripNulls<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

interface BuildArgs {
  property: { id: string; code: string; name: string };
  channel: Channel;
  guestId: string | null;
  from: string;
  to: string;
  status: ReservationStatus;
  deposit: number | null;
  total: number | null;
  adults: number;
  children: number;
  notes: string | null;
  source: Reservation['source'];
}

let seq = 0;

function build(s: State, a: BuildArgs): ReservationDetail {
  const code = `ARG-${(Date.now() + seq++).toString(36).toUpperCase().slice(-6)}`;
  const base = {
    id: uid('res'), code, property_id: a.property.id, property_code: a.property.code, property_name: a.property.name,
    channel_id: a.channel.id, channel_name: a.channel.name, channel_kind: a.channel.kind, requires_deposit: a.channel.requires_deposit,
    has_checkin: a.channel.has_checkin, source: a.source, external_ref: null, external_summary: a.source === 'ical' ? 'CLOSED - Not available' : null,
    primary_guest_id: a.guestId, guest_name: null, guest_email: null, guests_count: 0, guests_pending: 0, status: a.status, incomplete: false,
    check_in_date: a.from, check_out_date: a.to, check_in_time: '15:00', check_out_time: '11:00', nights: nightsBetween(a.from, a.to),
    checked_in_at: null, checked_out_at: null, adults: a.adults, children: a.children, total_amount: a.total, currency: 'GTQ',
    deposit_amount: a.deposit, deposit_status: 'none' as DepositStatus, notes: a.notes, cancelled_at: null, cancel_reason: null,
    created_at: new Date().toISOString(), guests: [], events: [{ id: uid('ev'), type: 'created', actor_name: null, data: {}, created_at: new Date().toISOString() }],
    deposit: { available: true, amount: a.deposit, status: 'none' as DepositStatus, received: 0, returned: 0, retained: 0, balance: 0, charges: 0, inspection_required: true, transactions: [] },
    inspections: [],
  } satisfies ReservationDetail;
  return refresh(s, base, a.guestId ? [a.guestId] : []);
}

/** Recalcula huéspedes, depósito y banderas de una reserva. */
function refresh(s: State, r: ReservationDetail, guestIds?: readonly string[]): ReservationDetail {
  const ids = guestIds ?? r.guests.map((g) => g.id);
  const guests = ids.map((id) => s.guests.find((g) => g.id === id)).filter((g): g is State['guests'][number] => !!g).map((g) => {
    const missing = [
      ...(g.email ? [] : ['email' as const]), ...(g.document_number ? [] : ['document' as const]),
      ...(g.docs.some((d) => d.kind === 'id_front') ? [] : ['id_front' as const]), ...(g.docs.some((d) => d.kind === 'id_back') ? [] : ['id_back' as const]),
    ];
    return { ...publicGuest(g), is_primary: g.id === r.primary_guest_id, registered: !missing.length, missing, documents: g.docs };
  });
  const tx = r.deposit.transactions;
  const sum = (t: string) => tx.filter((x) => x.type === t).reduce((n, x) => n + x.amount, 0);
  const received = sum('received'), returned = sum('returned'), retained = sum('retained');
  const balance = Math.round((received - returned - retained) * 100) / 100;
  const post = r.inspections.find((i) => i.kind === 'post_departure');
  const charges = (post?.findings ?? []).filter((f) => f.charge_to_deposit).reduce((n, f) => n + (f.estimated_cost ?? 0), 0);
  const status: DepositStatus = !received ? (r.deposit_amount && isLive(r) ? 'pending' : 'none') : retained >= received ? 'retained_full' : retained > 0 ? 'retained_partial' : balance === 0 ? 'returned' : 'received';
  const primary = guests.find((g) => g.is_primary) ?? null;
  return {
    ...r, guests, guests_count: guests.length, guests_pending: guests.filter((g) => !g.registered).length,
    guest_name: primary?.full_name ?? null, guest_email: primary?.email ?? null, incomplete: !primary && isLive(r),
    deposit_status: status, deposit: { ...r.deposit, amount: r.deposit_amount, status, received, returned, retained, balance, charges, inspection_required: !post },
  };
}

function seed(tenant: string): State {
  const props = opsProperties(tenant).slice(0, 7);
  const channels: Channel[] = [
    { id: 'ch_direct', name: 'Directo', kind: 'direct', requires_deposit: true, has_checkin: true, default_deposit_amount: 1200, is_active: true, feeds_count: 0, upcoming_count: 0 },
    { id: 'ch_booking', name: 'Booking.com', kind: 'booking', requires_deposit: false, has_checkin: false, default_deposit_amount: null, is_active: true, feeds_count: 1, upcoming_count: 0 },
    { id: 'ch_airbnb', name: 'Airbnb', kind: 'airbnb', requires_deposit: false, has_checkin: false, default_deposit_amount: null, is_active: true, feeds_count: 2, upcoming_count: 0 },
    { id: 'ch_agency', name: 'Maya Tours', kind: 'agency', requires_deposit: false, has_checkin: false, default_deposit_amount: null, is_active: true, feeds_count: 0, upcoming_count: 0 },
  ];
  const guests = GUESTS.map(([name, email, doc, nat], i) => {
    const g = { ...blankGuest(`g_${i}`, name), email, nationality: nat, document_number: doc, document_type: doc ? (/^\d{13}$/.test(doc) ? 'dpi' as const : 'passport' as const) : null };
    if (doc) g.docs = (['id_front', 'id_back'] as const).map((kind) => ({ file_id: `doc_${i}_${kind}`, kind, content_type: 'image/jpeg', size_bytes: 48000, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 90 * 86400000).toISOString() }));
    return g;
  });
  const s: State = { channels, guests, reservations: [], feeds: [] };
  if (!props.length) return s;
  for (const [pi, kind, gi, from, to, status] of STAYS) {
    const p = props[pi % props.length];
    const c = channels.find((x) => x.kind === kind)!;
    const r = build(s, {
      property: p, channel: c, guestId: gi === null ? null : guests[gi].id, from: dayKey(from), to: dayKey(to), status,
      deposit: c.requires_deposit ? 1200 : null, total: 900 * nightsBetween(dayKey(from), dayKey(to)), adults: 2, children: 0, notes: null,
      source: gi === null ? 'ical' : 'manual',
    });
    const paid = c.requires_deposit && (status === 'checked_in' || status === 'checked_out');
    const tx = paid ? [{ id: uid('dtx'), type: 'received' as const, amount: 1200, method: 'cash' as const, reference: null, notes: null, registered_by_name: 'Administración', created_at: new Date().toISOString() }] : [];
    s.reservations.push(refresh(s, { ...r, deposit: { ...r.deposit, transactions: tx } }));
  }
  s.feeds = [
    { id: 'feed_1', property_id: props[1 % props.length].id, property_code: props[1 % props.length].code, property_name: props[1 % props.length].name, channel_id: 'ch_booking', channel_name: 'Booking.com', channel_kind: 'booking', url: 'https://admin.booking.com/hotel/hoteladmin/ical.html?t=demo', is_active: true, last_synced_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_error: null, events_count: 2 },
    { id: 'feed_2', property_id: props[4 % props.length].id, property_code: props[4 % props.length].code, property_name: props[4 % props.length].name, channel_id: 'ch_airbnb', channel_name: 'Airbnb', channel_kind: 'airbnb', url: 'https://www.airbnb.com/calendar/ical/demo.ics', is_active: true, last_synced_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_error: null, events_count: 1 },
    { id: 'feed_3', property_id: props[2 % props.length].id, property_code: props[2 % props.length].code, property_name: props[2 % props.length].name, channel_id: 'ch_airbnb', channel_name: 'Airbnb', channel_kind: 'airbnb', url: 'https://www.airbnb.com/calendar/ical/no-existe.ics', is_active: true, last_synced_at: new Date().toISOString(), last_success_at: null, last_error: 'El canal respondió 404.', events_count: null },
  ];
  return s;
}
