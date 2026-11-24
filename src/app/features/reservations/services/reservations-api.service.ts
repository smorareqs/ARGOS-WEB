import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';
import { FilesApi } from '../../../core/http/files-api';
import {
  Channel, ChannelDraft, Deposit, DepositTxDraft, Feed, FindingDraft, Guest, GuestDetail, GuestDraft, GuestPatch,
  InspectionKind, Reservation, ReservationDetail, ReservationDraft, ReservationPatch, ReservationQuery, SyncResult, Today,
} from '../models/reservation.model';

interface Page<T> {
  readonly items: readonly T[];
  readonly next_cursor: string | null;
}

/** Pasos del ciclo sin cuerpo. */
export type ReservationMove = 'check-in' | 'check-out' | 'resend';
/** Pasos con motivo. */
export type ReservationStop = 'cancel' | 'no-show';

/** Lo que se registra de un huésped en la reserva: uno existente o uno nuevo. */
export interface GuestLinkDraft {
  readonly guest_id?: string;
  readonly guest?: GuestDraft;
  readonly is_primary?: boolean;
}

/**
 * Servicio puro de reservas (fase04.md §4.1). Sin estado. Las listas se piden
 * completas (hasta 500): calendario y tabla trabajan con la ventana cargada.
 */
export abstract class ReservationsApi {
  abstract reservations(q: ReservationQuery): Promise<readonly Reservation[]>;
  abstract today(): Promise<Today>;
  abstract reservation(id: string): Promise<ReservationDetail>;
  abstract create(d: ReservationDraft): Promise<ReservationDetail>;
  abstract update(id: string, p: ReservationPatch): Promise<ReservationDetail>;
  abstract confirm(id: string, sendEmail: boolean): Promise<ReservationDetail>;
  abstract stop(id: string, action: ReservationStop, reason: string): Promise<ReservationDetail>;
  abstract move(id: string, action: ReservationMove): Promise<ReservationDetail>;
  abstract addGuest(id: string, link: GuestLinkDraft): Promise<ReservationDetail>;
  abstract removeGuest(id: string, guestId: string): Promise<ReservationDetail>;
  abstract addDepositTx(id: string, tx: DepositTxDraft): Promise<Deposit>;
  abstract createInspection(id: string, kind: InspectionKind, notes: string | null, photos: readonly File[]): Promise<ReservationDetail>;
  abstract addFinding(inspectionId: string, d: FindingDraft, photos: readonly File[]): Promise<ReservationDetail>;
  abstract removeFinding(inspectionId: string, findingId: string): Promise<ReservationDetail>;

  abstract guests(q: string): Promise<readonly Guest[]>;
  abstract guest(id: string): Promise<GuestDetail>;
  abstract createGuest(d: GuestDraft): Promise<Guest>;
  abstract updateGuest(id: string, p: GuestPatch): Promise<Guest>;
  abstract attachDocument(guestId: string, kind: 'id_front' | 'id_back', file: File): Promise<GuestDetail>;
  /** URL firmada de la foto; cada consulta queda en la bitácora. */
  abstract documentUrl(guestId: string, fileId: string): Promise<string>;

  abstract channels(): Promise<readonly Channel[]>;
  abstract createChannel(d: ChannelDraft): Promise<Channel>;
  abstract updateChannel(id: string, p: Partial<ChannelDraft>): Promise<Channel>;
  abstract feeds(): Promise<readonly Feed[]>;
  abstract createFeed(propertyId: string, channelId: string, url: string): Promise<Feed>;
  abstract updateFeed(id: string, p: { url?: string; is_active?: boolean }): Promise<Feed>;
  abstract deleteFeed(id: string): Promise<void>;
  abstract sync(feedId?: string): Promise<readonly SyncResult[]>;
}

@Injectable()
export class HttpReservationsApi extends ReservationsApi {
  private readonly http = inject(ApiClient);
  private readonly files = inject(FilesApi);

  reservations(q: ReservationQuery): Promise<readonly Reservation[]> {
    return this.http.get<Page<Reservation>>('/reservations', { ...clean(q), limit: '500' }).then((p) => p.items);
  }
  today(): Promise<Today> {
    return this.http.get<Today>('/reservations/today');
  }
  reservation(id: string): Promise<ReservationDetail> {
    return this.http.get<ReservationDetail>(`/reservations/${id}`);
  }
  create(d: ReservationDraft): Promise<ReservationDetail> {
    const body = compact({ ...d, guest: d.guest ? compact(d.guest) : null });
    return this.http.post<ReservationDetail>('/reservations', body);
  }
  update(id: string, p: ReservationPatch): Promise<ReservationDetail> {
    return this.http.patch<ReservationDetail>(`/reservations/${id}`, p);
  }
  confirm(id: string, sendEmail: boolean): Promise<ReservationDetail> {
    return this.http.post<ReservationDetail>(`/reservations/${id}/confirm`, { send_email: sendEmail });
  }
  stop(id: string, action: ReservationStop, reason: string): Promise<ReservationDetail> {
    return this.http.post<ReservationDetail>(`/reservations/${id}/${action}`, { reason });
  }
  move(id: string, action: ReservationMove): Promise<ReservationDetail> {
    return this.http.post<ReservationDetail>(`/reservations/${id}/${action}`);
  }
  addGuest(id: string, link: GuestLinkDraft): Promise<ReservationDetail> {
    return this.http.post<ReservationDetail>(`/reservations/${id}/guests`, compact({ ...link, guest: link.guest ? compact(link.guest) : null }));
  }
  removeGuest(id: string, guestId: string): Promise<ReservationDetail> {
    return this.http.delete<ReservationDetail>(`/reservations/${id}/guests/${guestId}`);
  }
  addDepositTx(id: string, tx: DepositTxDraft): Promise<Deposit> {
    return this.http.post<Deposit>(`/reservations/${id}/deposit/transactions`, compact(tx));
  }
  async createInspection(id: string, kind: InspectionKind, notes: string | null, photos: readonly File[]): Promise<ReservationDetail> {
    const ids = await this.uploadAll(photos);
    return this.http.post<ReservationDetail>(`/reservations/${id}/inspections`, compact({ kind, notes, photo_file_ids: ids }));
  }
  async addFinding(inspectionId: string, d: FindingDraft, photos: readonly File[]): Promise<ReservationDetail> {
    const ids = await this.uploadAll(photos);
    return this.http.post<ReservationDetail>(`/inspections/${inspectionId}/findings`, compact({ ...d, photo_file_ids: ids }));
  }
  removeFinding(inspectionId: string, findingId: string): Promise<ReservationDetail> {
    return this.http.delete<ReservationDetail>(`/inspections/${inspectionId}/findings/${findingId}`);
  }

  guests(q: string): Promise<readonly Guest[]> {
    return this.http.get<Page<Guest>>('/guests', { ...clean({ q }), limit: '500' }).then((p) => p.items);
  }
  guest(id: string): Promise<GuestDetail> {
    return this.http.get<GuestDetail>(`/guests/${id}`);
  }
  createGuest(d: GuestDraft): Promise<Guest> {
    return this.http.post<Guest>('/guests', compact(d));
  }
  updateGuest(id: string, p: GuestPatch): Promise<Guest> {
    return this.http.patch<Guest>(`/guests/${id}`, p);
  }
  async attachDocument(guestId: string, kind: 'id_front' | 'id_back', file: File): Promise<GuestDetail> {
    const fileId = await this.files.upload(file, { module: 'guests', kind });
    return this.http.post<GuestDetail>(`/guests/${guestId}/documents`, { kind, file_id: fileId });
  }
  documentUrl(guestId: string, fileId: string): Promise<string> {
    return this.http.get<{ url: string }>(`/guests/${guestId}/documents/${fileId}/url`).then((r) => r.url);
  }

  channels(): Promise<readonly Channel[]> {
    return this.http.get<Page<Channel>>('/channels').then((p) => p.items);
  }
  createChannel(d: ChannelDraft): Promise<Channel> {
    return this.http.post<Channel>('/channels', compact(d));
  }
  updateChannel(id: string, p: Partial<ChannelDraft>): Promise<Channel> {
    return this.http.patch<Channel>(`/channels/${id}`, p);
  }
  feeds(): Promise<readonly Feed[]> {
    return this.http.get<Page<Feed>>('/ical-feeds').then((p) => p.items);
  }
  createFeed(propertyId: string, channelId: string, url: string): Promise<Feed> {
    return this.http.post<Feed>(`/properties/${propertyId}/ical-feeds`, { channel_id: channelId, url });
  }
  updateFeed(id: string, p: { url?: string; is_active?: boolean }): Promise<Feed> {
    return this.http.patch<Feed>(`/ical-feeds/${id}`, p);
  }
  deleteFeed(id: string): Promise<void> {
    return this.http.delete<void>(`/ical-feeds/${id}`);
  }
  sync(feedId?: string): Promise<readonly SyncResult[]> {
    return this.http.post<Page<SyncResult>>(feedId ? `/ical-feeds/${feedId}/sync` : '/ical-feeds/sync').then((p) => p.items);
  }

  private uploadAll(files: readonly File[]): Promise<string[]> {
    return Promise.all(files.map((f) => this.files.upload(f, { module: 'reservations', kind: 'inspection_photo' })));
  }
}

/** Quita null y undefined de un cuerpo POST (huma rechaza null en opcionales). */
function compact<T extends object>(body: T): Partial<T> {
  return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== null && v !== undefined)) as Partial<T>;
}

function clean(q: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(q)
      .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
      .map(([k, v]) => [k, String(v)]),
  );
}
