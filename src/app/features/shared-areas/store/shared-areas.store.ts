import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { SessionStore } from '../../../core/store/session.store';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { dayKey } from '../../../shared/utils/time';
import { AreaBooking, BookingDraft, InHouseGuest, SharedArea, SharedAreasApi } from '../services/shared-areas-api.service';

/** Tienda de Áreas comunes (W-I2). Vive con la pantalla. */
@Injectable()
export class SharedAreasStore {
  private readonly api = inject(SharedAreasApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);

  private readonly _areas = signal<readonly SharedArea[]>([]);
  private readonly _bookings = signal<readonly AreaBooking[]>([]);
  private readonly _guests = signal<readonly InHouseGuest[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _busy = signal<string | null>(null);
  private readonly _saveError = signal<ApiError | null>(null);

  readonly areas = this._areas.asReadonly();
  readonly bookings = this._bookings.asReadonly();
  readonly guests = this._guests.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly saveError = this._saveError.asReadonly();

  readonly canManage = computed(() => this.session.can('shared_areas.manage'));
  readonly canBook = computed(() => this.session.canAny(['shared_areas.book', 'shared_areas.manage']));

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const [areas, bookings, guests] = await Promise.all([this.api.areas(), this.api.bookings(dayKey(), dayKey(6)), this.api.guests()]);
      this._areas.set(areas);
      this._bookings.set(bookings);
      this._guests.set(guests);
    } catch (err) {
      this._error.set(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }

  clearSaveError(): void {
    this._saveError.set(null);
  }

  async book(d: BookingDraft): Promise<boolean> {
    this._busy.set('book');
    this._saveError.set(null);
    try {
      const b = await this.api.book(d);
      this._bookings.update((l) => [...l, b]);
      this.toast.success(`Reservado para ${b.guest_name}, ${b.start}–${b.end}. Le llega el aviso en la app.`);
      return true;
    } catch (err) {
      this._saveError.set(toApiError(err));
      return false;
    } finally {
      this._busy.set(null);
    }
  }

  async cancel(b: AreaBooking): Promise<void> {
    this._busy.set(b.id);
    try {
      await this.api.cancel(b.id);
      this._bookings.update((l) => l.filter((x) => x.id !== b.id));
      this.toast.success(`Reserva de ${b.guest_name} cancelada.`);
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this._busy.set(null);
    }
  }

  async saveArea(a: SharedArea): Promise<boolean> {
    this._busy.set('area');
    this._saveError.set(null);
    try {
      const saved = await this.api.saveArea(a);
      this._areas.update((l) => l.map((x) => (x.id === saved.id ? saved : x)));
      this.toast.success(`${saved.name} actualizada.`);
      return true;
    } catch (err) {
      this._saveError.set(toApiError(err));
      return false;
    } finally {
      this._busy.set(null);
    }
  }
}
