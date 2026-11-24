import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { SessionStore } from '../../../core/store/session.store';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { InventoryApi } from '../services/inventory-api.service';
import {
  Custody,
  DiscrepancyStatus,
  InventorySnapshot,
  ItemDraft,
  RestockStatus,
  StockChange,
} from '../models/inventory.model';

export interface CustodyGroup {
  readonly person_id: string;
  readonly person_name: string;
  readonly lines: readonly Custody[];
  readonly units: number;
}

/** Tienda de Inventario (W-F1–W-F6). Vive con la pantalla. */
@Injectable()
export class InventoryStore {
  private readonly api = inject(InventoryApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);

  private readonly _data = signal<InventorySnapshot | null>(null);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _busy = signal<string | null>(null);
  private readonly _saveError = signal<ApiError | null>(null);

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly saveError = this._saveError.asReadonly();

  readonly canManage = computed(() => this.session.can('inventory.manage'));
  readonly canReconcile = computed(() => this.session.canAny(['inventory.reconcile', 'inventory.manage']));

  readonly items = computed(() => this._data()?.items ?? []);
  readonly warehouses = computed(() => this._data()?.warehouses ?? []);
  readonly low = computed(() => this.items().filter((i) => i.min > 0 && i.total < i.min));
  readonly openDiscrepancies = computed(() => (this._data()?.discrepancies ?? []).filter((d) => d.status === 'open'));
  readonly pendingRequests = computed(() => (this._data()?.requests ?? []).filter((r) => r.status === 'pending' || r.status === 'approved'));
  readonly custody = computed<CustodyGroup[]>(() => {
    const map = new Map<string, Custody[]>();
    for (const c of this._data()?.custody ?? []) map.set(c.person_id, [...(map.get(c.person_id) ?? []), c]);
    return [...map.values()].map((lines) => ({ person_id: lines[0].person_id, person_name: lines[0].person_name, lines, units: lines.reduce((a, l) => a + l.qty, 0) }));
  });
  readonly custodyUnits = computed(() => this.custody().reduce((a, g) => a + g.units, 0));

  qty(itemId: string, warehouseId: string): number {
    return this._data()?.stock.find((r) => r.item_id === itemId && r.warehouse_id === warehouseId)?.qty ?? 0;
  }

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      this._data.set(await this.api.snapshot());
    } catch (err) {
      this._error.set(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }

  clearSaveError(): void {
    this._saveError.set(null);
  }

  async createItem(d: ItemDraft): Promise<boolean> {
    return this.save('item', () => this.api.createItem(d), `Artículo ${d.sku.toUpperCase()} creado.`);
  }

  async changeStock(c: StockChange): Promise<boolean> {
    const verb = c.kind === 'entry' ? 'Entrada registrada' : c.kind === 'transfer' ? 'Traslado registrado' : 'Ajuste registrado';
    return this.save('stock', () => this.api.changeStock(c), `${verb}.`);
  }

  async returnCustody(c: Custody): Promise<boolean> {
    return this.run(`${c.person_id}|${c.item_id}`, () => this.api.returnCustody(c.person_id, c.item_id), `${c.qty} ${c.unit} de ${c.item_name} volvieron a bodega.`);
  }

  async setDiscrepancy(id: string, status: DiscrepancyStatus, note: string | null): Promise<boolean> {
    return this.run(id, () => this.api.setDiscrepancy(id, status, note), status === 'closed' ? 'Discrepancia cerrada.' : 'Justificación guardada.');
  }

  async setRequest(id: string, status: RestockStatus, note: string | null = null): Promise<boolean> {
    const msg: Record<RestockStatus, string> = { approved: 'Solicitud aprobada.', rejected: 'Solicitud rechazada.', fulfilled: 'Solicitud surtida: salió de bodega.', pending: '' };
    return this.run(id, () => this.api.setRequest(id, status, note), msg[status]);
  }

  private async save(key: string, fn: () => Promise<unknown>, ok: string): Promise<boolean> {
    this._busy.set(key);
    this._saveError.set(null);
    try {
      await fn();
      this._data.set(await this.api.snapshot());
      this.toast.success(ok);
      return true;
    } catch (err) {
      this._saveError.set(toApiError(err));
      return false;
    } finally {
      this._busy.set(null);
    }
  }

  private async run(key: string, fn: () => Promise<unknown>, ok: string): Promise<boolean> {
    this._busy.set(key);
    try {
      await fn();
      this._data.set(await this.api.snapshot());
      this.toast.success(ok);
      return true;
    } catch (err) {
      this.toast.error(toApiError(err).detail);
      return false;
    } finally {
      this._busy.set(null);
    }
  }
}
