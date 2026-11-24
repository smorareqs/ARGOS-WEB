import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { SessionStore } from '../../../core/store/session.store';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { dayKey } from '../../../shared/utils/time';
import { AssignableStay, AssignmentDraft, ParkingApi, ParkingAssignment, ParkingSpace } from '../services/parking-api.service';

/** Tienda de Parqueos (W-I1). Vive con la pantalla. */
@Injectable()
export class ParkingStore {
  private readonly api = inject(ParkingApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);

  private readonly _spaces = signal<readonly ParkingSpace[]>([]);
  private readonly _assignments = signal<readonly ParkingAssignment[]>([]);
  private readonly _stays = signal<readonly AssignableStay[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _busy = signal<string | null>(null);
  private readonly _saveError = signal<ApiError | null>(null);

  readonly spaces = this._spaces.asReadonly();
  readonly assignments = this._assignments.asReadonly();
  readonly stays = this._stays.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly saveError = this._saveError.asReadonly();

  readonly canManage = computed(() => this.session.can('parking.manage'));

  /** Asignación vigente hoy por espacio. */
  readonly today = computed(() => {
    const k = dayKey();
    const map = new Map<string, ParkingAssignment>();
    for (const a of this._assignments()) if (a.from <= k && a.to > k) map.set(a.space_id, a);
    return map;
  });

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const [spaces, assignments, stays] = await Promise.all([this.api.spaces(), this.api.assignments(dayKey(-1), dayKey(8)), this.api.stays()]);
      this._spaces.set(spaces);
      this._assignments.set(assignments);
      this._stays.set(stays);
    } catch (err) {
      this._error.set(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }

  clearSaveError(): void {
    this._saveError.set(null);
  }

  async assign(d: AssignmentDraft): Promise<boolean> {
    this._busy.set('assign');
    this._saveError.set(null);
    try {
      const a = await this.api.assign(d);
      this._assignments.update((l) => [...l, a]);
      this._stays.update((l) => l.filter((s) => s.reservation_code !== a.reservation_code));
      this.toast.success(`Espacio asignado a ${a.guest_name} · placa ${a.plate}. Seguridad ya lo ve.`);
      return true;
    } catch (err) {
      this._saveError.set(toApiError(err));
      return false;
    } finally {
      this._busy.set(null);
    }
  }

  async release(a: ParkingAssignment): Promise<void> {
    this._busy.set(a.id);
    try {
      await this.api.release(a.id);
      this._assignments.update((l) => l.filter((x) => x.id !== a.id));
      this.toast.success(`Espacio liberado (${a.plate}).`);
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this._busy.set(null);
    }
  }

  async toggleBlocked(s: ParkingSpace): Promise<void> {
    this._busy.set(s.id);
    try {
      await this.api.setBlocked(s.id, !s.blocked);
      this._spaces.update((l) => l.map((x) => (x.id === s.id ? { ...x, blocked: !s.blocked } : x)));
      this.toast.success(s.blocked ? `${s.code} disponible otra vez.` : `${s.code} bloqueado.`);
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this._busy.set(null);
    }
  }
}
