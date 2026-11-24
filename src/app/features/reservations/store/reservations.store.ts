import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { SessionStore } from '../../../core/store/session.store';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { PropertiesApi } from '../../properties/services/properties-api.service';
import { addDays, dayKey, toDayKey } from '../../../shared/utils/time';
import { plural } from '../../../shared/utils/plural';
import { GuestLinkDraft, ReservationMove, ReservationStop, ReservationsApi } from '../services/reservations-api.service';
import {
  Channel, ChannelDraft, DepositTxDraft, Feed, FindingDraft, Guest, GuestDetail, GuestDraft, GuestPatch, InspectionKind,
  Reservation, ReservationDetail, ReservationDraft, ReservationPatch, SyncResult, Today,
} from '../models/reservation.model';

/** Ventana que se carga de una vez: 60 días atrás y 180 adelante. */
const BACK = 60;
const AHEAD = 180;

/**
 * Tienda de Reservas (W-H1–W-H6). Vive con la pantalla. Carga una ventana de
 * reservas para calendario y lista; la ficha, los huéspedes y los
 * calendarios iCal se piden al abrirlos.
 */
@Injectable()
export class ReservationsStore {
  private readonly api = inject(ReservationsApi);
  private readonly propertiesApi = inject(PropertiesApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);

  readonly reservations = signal<readonly Reservation[]>([]);
  readonly channels = signal<readonly Channel[]>([]);
  readonly properties = signal<readonly { id: string; code: string; name: string }[]>([]);
  readonly today = signal<Today | null>(null);
  readonly feeds = signal<readonly Feed[] | null>(null);
  readonly guests = signal<readonly Guest[] | null>(null);
  readonly detail = signal<ReservationDetail | null>(null);
  readonly guestDetail = signal<GuestDetail | null>(null);
  readonly lastSync = signal<readonly SyncResult[] | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal<string | null>(null);
  readonly saveError = signal<ApiError | null>(null);
  readonly range = signal({ from: dayKey(-BACK), to: dayKey(AHEAD) });

  readonly canManage = computed(() => this.session.can('reservations.manage'));
  readonly canCheckin = computed(() => this.session.can('reservations.checkin'));
  readonly canRegister = computed(() => this.session.canAny(['reservations.checkin', 'guests.manage']));
  readonly canGuests = computed(() => this.session.can('guests.read'));
  readonly canGuestsManage = computed(() => this.session.can('guests.manage'));
  readonly canDocuments = computed(() => this.session.can('guests.documents'));
  readonly canDepositsRead = computed(() => this.session.can('deposits.read'));
  readonly canDeposits = computed(() => this.session.can('deposits.manage'));
  readonly canInspect = computed(() => this.session.can('tasks.validate'));

  readonly activeChannels = computed(() => this.channels().filter((c) => c.is_active));
  readonly badFeeds = computed(() => (this.feeds() ?? []).filter((f) => f.is_active && !!f.last_error).length);

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [list, channels, props, today] = await Promise.all([
        this.api.reservations(this.range()),
        this.api.channels(),
        this.propertiesApi.list({ active: true }).catch(() => []),
        this.api.today().catch(() => null),
      ]);
      this.reservations.set(list);
      this.channels.set(channels);
      this.properties.set(props.map((p) => ({ id: p.id, code: p.code, name: p.name })).sort((a, b) => a.code.localeCompare(b.code)));
      this.today.set(today);
    } catch (err) {
      this.error.set(toApiError(err).detail);
    } finally {
      this.loading.set(false);
    }
  }

  /** Amplía la ventana si el calendario se mueve fuera de lo cargado. */
  async ensureRange(from: string, to: string): Promise<void> {
    const r = this.range();
    if (from >= r.from && to <= r.to) return;
    this.range.set({ from: from < r.from ? toDayKey(addDays(new Date(`${from}T12:00:00`), -30)) : r.from, to: to > r.to ? toDayKey(addDays(new Date(`${to}T12:00:00`), 60)) : r.to });
    await this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      const [list, today] = await Promise.all([this.api.reservations(this.range()), this.api.today().catch(() => null)]);
      this.reservations.set(list);
      this.today.set(today);
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    }
  }

  clearSaveError(): void {
    this.saveError.set(null);
  }

  // --- Ficha ------------------------------------------------------------------

  async open(id: string): Promise<void> {
    if (this.detail()?.id !== id) this.detail.set(null);
    try {
      this.detail.set(await this.api.reservation(id));
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    }
  }

  close(): void {
    this.detail.set(null);
  }

  async create(d: ReservationDraft): Promise<ReservationDetail | null> {
    const r = await this.save('create', () => this.api.create(d));
    if (r) this.toast.success(`Reserva ${r.code} creada${r.status === 'confirmed' ? ' y confirmada' : ' por confirmar'}.`);
    return r;
  }

  async update(id: string, p: ReservationPatch): Promise<ReservationDetail | null> {
    const r = await this.save('edit', () => this.api.update(id, p));
    if (r) this.toast.success('Reserva actualizada.');
    return r;
  }

  confirm(r: Reservation, sendEmail: boolean): Promise<boolean> {
    return this.step(r.id, () => this.api.confirm(r.id, sendEmail), `${r.code} confirmada${sendEmail && r.guest_email ? '; le enviamos el correo' : ''}.`);
  }

  stop(r: Reservation, action: ReservationStop, reason: string): Promise<boolean> {
    return this.step(r.id, () => this.api.stop(r.id, action, reason), action === 'cancel' ? `${r.code} cancelada.` : `${r.code} marcada como no llegó.`);
  }

  move(r: Reservation, action: ReservationMove): Promise<boolean> {
    const msg = { 'check-in': `Check-in de ${r.guest_name ?? r.code} registrado.`, 'check-out': 'Check-out registrado.', resend: 'Correo reenviado al huésped.' }[action];
    return this.step(r.id, () => this.api.move(r.id, action), msg);
  }

  addGuest(r: Reservation, link: GuestLinkDraft): Promise<boolean> {
    return this.step(r.id, () => this.api.addGuest(r.id, link), 'Huésped agregado.', true);
  }

  removeGuest(r: Reservation, guestId: string): Promise<boolean> {
    return this.step(r.id, () => this.api.removeGuest(r.id, guestId), 'Acompañante quitado.');
  }

  /** Registro del huésped: datos y fotos del documento. */
  async register(r: Reservation, guestId: string, patch: GuestPatch, front: File | null, back: File | null): Promise<boolean> {
    this.busy.set(`guest:${guestId}`);
    this.saveError.set(null);
    try {
      if (Object.keys(patch).length) await this.api.updateGuest(guestId, patch);
      if (front) await this.api.attachDocument(guestId, 'id_front', front);
      if (back) await this.api.attachDocument(guestId, 'id_back', back);
      this.detail.set(await this.api.reservation(r.id));
      this.toast.success('Registro guardado.');
      return true;
    } catch (err) {
      this.saveError.set(toApiError(err));
      return false;
    } finally {
      this.busy.set(null);
    }
  }

  /** Abre la foto del documento; la consulta queda en la bitácora. */
  async viewDocument(guestId: string, fileId: string): Promise<void> {
    this.busy.set(`doc:${fileId}`);
    // La pestaña se abre dentro del clic (si no, el navegador la bloquea) y
    // recibe la URL firmada cuando llega.
    const tab = window.open('about:blank', '_blank');
    try {
      const url = await this.api.documentUrl(guestId, fileId);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.assign(url);
      }
    } catch (err) {
      tab?.close();
      this.toast.error(toApiError(err).detail);
    } finally {
      this.busy.set(null);
    }
  }

  async depositTx(r: Reservation, tx: DepositTxDraft): Promise<boolean> {
    this.busy.set('deposit');
    this.saveError.set(null);
    try {
      await this.api.addDepositTx(r.id, tx);
      this.detail.set(await this.api.reservation(r.id));
      await this.refresh();
      this.toast.success({ received: 'Depósito registrado.', returned: 'Devolución registrada.', retained: 'Retención registrada.' }[tx.type]);
      return true;
    } catch (err) {
      this.saveError.set(toApiError(err));
      return false;
    } finally {
      this.busy.set(null);
    }
  }

  createInspection(r: Reservation, kind: InspectionKind, notes: string | null, photos: readonly File[]): Promise<boolean> {
    return this.step(r.id, () => this.api.createInspection(r.id, kind, notes, photos), 'Inspección registrada.', true, 'inspection');
  }

  addFinding(r: Reservation, inspectionId: string, d: FindingDraft, photos: readonly File[]): Promise<boolean> {
    return this.step(r.id, () => this.api.addFinding(inspectionId, d, photos), d.create_ticket ? 'Hallazgo registrado; abrimos su incidencia.' : 'Hallazgo registrado.', true, 'finding');
  }

  removeFinding(r: Reservation, inspectionId: string, findingId: string): Promise<boolean> {
    return this.step(r.id, () => this.api.removeFinding(inspectionId, findingId), 'Hallazgo quitado.');
  }

  // --- Huéspedes -------------------------------------------------------------

  async loadGuests(q = ''): Promise<void> {
    try {
      this.guests.set(await this.api.guests(q));
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    }
  }

  searchGuests(q: string): Promise<readonly Guest[]> {
    return this.api.guests(q).catch(() => []);
  }

  async openGuest(id: string): Promise<void> {
    if (this.guestDetail()?.id !== id) this.guestDetail.set(null);
    try {
      this.guestDetail.set(await this.api.guest(id));
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    }
  }

  async saveGuest(id: string | null, d: GuestPatch): Promise<Guest | null> {
    const g = await this.save('guest', () => (id ? this.api.updateGuest(id, d) : this.api.createGuest(d as GuestDraft)), false);
    if (!g) return null;
    this.toast.success(id ? 'Huésped actualizado.' : `${g.full_name} agregado al directorio.`);
    this.guests.update((list) => (list ? (id ? list.map((x) => (x.id === g.id ? g : x)) : [g, ...list]) : list));
    if (id) await this.openGuest(id);
    return g;
  }

  // --- Canales e iCal --------------------------------------------------------------

  async loadFeeds(): Promise<void> {
    try {
      const [feeds, channels] = await Promise.all([this.api.feeds(), this.api.channels()]);
      this.feeds.set(feeds);
      this.channels.set(channels);
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    }
  }

  async saveChannel(id: string | null, d: Partial<ChannelDraft>): Promise<boolean> {
    const c = await this.save('channel', () => (id ? this.api.updateChannel(id, d) : this.api.createChannel(d as ChannelDraft)), false);
    if (!c) return false;
    this.channels.update((list) => (id ? list.map((x) => (x.id === c.id ? c : x)) : [...list, c]));
    this.toast.success(id ? 'Canal actualizado.' : `Canal ${c.name} creado.`);
    return true;
  }

  async saveFeed(id: string | null, propertyId: string, channelId: string, url: string): Promise<boolean> {
    const f = await this.save('feed', () => (id ? this.api.updateFeed(id, { url }) : this.api.createFeed(propertyId, channelId, url)), false);
    if (!f) return false;
    await this.loadFeeds();
    this.toast.success(id ? 'Calendario actualizado.' : 'Calendario agregado. Sincronízalo para traer sus reservas.');
    return true;
  }

  async toggleFeed(f: Feed): Promise<void> {
    try {
      await this.api.updateFeed(f.id, { is_active: !f.is_active });
      await this.loadFeeds();
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    }
  }

  async deleteFeed(f: Feed): Promise<void> {
    try {
      await this.api.deleteFeed(f.id);
      this.feeds.update((list) => (list ?? []).filter((x) => x.id !== f.id));
      this.toast.success('Calendario quitado. Las reservas que importó se quedan.');
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    }
  }

  /** "Sincronizar iCal ahora": lee los calendarios y resume lo que cambió. */
  async sync(feedId?: string): Promise<void> {
    this.busy.set(feedId ? `sync:${feedId}` : 'sync');
    try {
      const res = await this.api.sync(feedId);
      this.lastSync.set(res);
      await Promise.all([this.refresh(), this.feeds() ? this.loadFeeds() : Promise.resolve()]);
      const created = res.reduce((n, r) => n + r.created, 0);
      const moved = res.reduce((n, r) => n + r.updated + r.cancelled, 0);
      const bad = res.filter((r) => !r.ok || r.conflicts.length).length;
      const parts = [created ? plural(created, 'reserva nueva por completar', 'reservas nuevas por completar') : '', moved ? plural(moved, 'cambio', 'cambios') : ''].filter(Boolean);
      const msg = `${parts.length ? `Sincronizado: ${parts.join(' y ')}` : 'Sincronizado: sin cambios'}${bad ? `. ${plural(bad, 'calendario necesita', 'calendarios necesitan')} revisión` : ''}.`;
      if (bad) this.toast.error(msg);
      else this.toast.success(msg);
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this.busy.set(null);
    }
  }

  // --- Ayudas -----------------------------------------------------------------------

  /** Corre un paso que devuelve la ficha; actualiza ficha y ventana. */
  private async step(id: string, fn: () => Promise<ReservationDetail>, ok: string, keepError = false, key = id): Promise<boolean> {
    this.busy.set(key);
    if (keepError) this.saveError.set(null);
    try {
      const r = await fn();
      this.detail.set(r);
      this.reservations.update((list) => (list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : list));
      void this.api.today().then((t) => this.today.set(t)).catch(() => undefined);
      this.toast.success(ok);
      return true;
    } catch (err) {
      const e = toApiError(err);
      if (keepError) this.saveError.set(e);
      else this.toast.error(e.detail);
      return false;
    } finally {
      this.busy.set(null);
    }
  }

  /** Guarda un formulario: errores por campo en saveError. */
  private async save<T>(key: string, fn: () => Promise<T>, reload = true): Promise<T | null> {
    this.busy.set(key);
    this.saveError.set(null);
    try {
      const out = await fn();
      if (reload) {
        this.detail.set(out as ReservationDetail);
        await this.refresh();
      }
      return out;
    } catch (err) {
      this.saveError.set(toApiError(err));
      return null;
    } finally {
      this.busy.set(null);
    }
  }
}
