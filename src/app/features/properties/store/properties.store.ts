import { Injectable, computed, inject, signal } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { ToastService } from '../../../core/services/toast.service';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { PropertiesApi } from '../services/properties-api.service';
import { AccessInfo, Building, Property, PropertyDraft, TodayStatus } from '../models/property.model';

export type StatusFilter = 'all' | TodayStatus | 'incident' | 'inactive';

export interface PropertyFilters {
  readonly q: string;
  readonly status: StatusFilter;
  readonly building: string;
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Tienda de Propiedades (W-C1). Vive con la pantalla. Los filtros viven en
 * la URL (ux-ui.md §3.2): la tienda solo sabe aplicarlos.
 */
@Injectable()
export class PropertiesStore {
  private readonly api = inject(PropertiesApi);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);

  private readonly _items = signal<readonly Property[]>([]);
  private readonly _buildings = signal<readonly Building[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _saving = signal(false);
  private readonly _saveError = signal<ApiError | null>(null);
  private readonly _justCreated = signal<string | null>(null);
  private readonly _access = signal<Readonly<Record<string, AccessInfo>>>({});
  private readonly _accessLoading = signal<string | null>(null);
  private readonly _accessError = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly buildings = this._buildings.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly saveError = this._saveError.asReadonly();
  readonly justCreated = this._justCreated.asReadonly();
  readonly access = this._access.asReadonly();
  readonly accessLoading = this._accessLoading.asReadonly();
  readonly accessError = this._accessError.asReadonly();

  readonly canManage = computed(() => this.session.can('properties.manage'));
  readonly canSeeAccess = computed(() => this.session.can('properties.access_info'));

  readonly summary = computed(() => {
    const items = this._items();
    return {
      total: items.length,
      active: items.filter((p) => p.is_active).length,
      buildings: this._buildings().length,
      withIncidents: items.filter((p) => p.open_incidents > 0).length,
    };
  });

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const [props, buildings] = await Promise.all([this.api.list(), this.api.buildings()]);
      this._items.set(props.items);
      this._buildings.set(buildings.items);
    } catch (err) {
      this._error.set(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }

  apply(f: PropertyFilters): Property[] {
    const q = norm(f.q.trim());
    return this._items().filter((p) => {
      if (f.building !== 'all' && p.building_id !== f.building) return false;
      if (!this.matchStatus(p, f.status)) return false;
      if (q.length < 2) return true;
      const hay = norm([p.code, p.name, p.building_name ?? '', p.zone, ...p.assigned.map((a) => a.name)].join(' '));
      return hay.includes(q);
    });
  }

  /** Conteo por chip respetando búsqueda y edificio (no el estado). */
  counts(f: PropertyFilters): Record<StatusFilter, number> {
    const base = this.apply({ ...f, status: 'all' });
    const keys: StatusFilter[] = ['all', 'ready', 'cleaning', 'pending', 'occupied', 'incident', 'inactive'];
    return Object.fromEntries(keys.map((k) => [k, base.filter((p) => this.matchStatus(p, k)).length])) as Record<
      StatusFilter,
      number
    >;
  }

  async create(draft: PropertyDraft): Promise<Property | null> {
    this._saving.set(true);
    this._saveError.set(null);
    try {
      const created = await this.api.create(draft);
      this._items.update((list) => [created, ...list]);
      this._justCreated.set(created.id);
      setTimeout(() => this._justCreated.set(null), 2600);
      this.toast.success(`Propiedad ${created.code} creada.`);
      return created;
    } catch (err) {
      this._saveError.set(toApiError(err));
      return null;
    } finally {
      this._saving.set(false);
    }
  }

  clearSaveError(): void {
    this._saveError.set(null);
  }

  /** La consulta queda registrada en la bitácora del backend. */
  async revealAccess(id: string): Promise<void> {
    if (this._access()[id] || this._accessLoading()) return;
    this._accessLoading.set(id);
    this._accessError.set(null);
    try {
      const info = await this.api.accessInfo(id);
      this._access.update((m) => ({ ...m, [id]: info }));
    } catch (err) {
      this._accessError.set(toApiError(err).detail);
    } finally {
      this._accessLoading.set(null);
    }
  }

  private matchStatus(p: Property, s: StatusFilter): boolean {
    if (s === 'all') return true;
    if (s === 'inactive') return !p.is_active;
    if (!p.is_active) return false;
    if (s === 'incident') return p.open_incidents > 0;
    return p.today_status === s;
  }
}
