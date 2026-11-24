import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';
import {
  DiscrepancyStatus,
  InventorySnapshot,
  Item,
  ItemDraft,
  RestockStatus,
  StockChange,
} from '../models/inventory.model';

/** Servicio puro de inventario (fase02.md §4). Sin estado. */
export abstract class InventoryApi {
  abstract snapshot(): Promise<InventorySnapshot>;
  abstract createItem(draft: ItemDraft): Promise<Item>;
  abstract changeStock(change: StockChange): Promise<void>;
  abstract returnCustody(personId: string, itemId: string): Promise<void>;
  abstract setDiscrepancy(id: string, status: DiscrepancyStatus, note: string | null): Promise<void>;
  abstract setRequest(id: string, status: RestockStatus, note: string | null): Promise<void>;
}

@Injectable()
export class HttpInventoryApi extends InventoryApi {
  private readonly http = inject(ApiClient);

  snapshot(): Promise<InventorySnapshot> {
    return this.http.get<InventorySnapshot>('/inventory/overview');
  }
  createItem(draft: ItemDraft): Promise<Item> {
    return this.http.post<Item>('/inventory/items', draft);
  }
  changeStock(change: StockChange): Promise<void> {
    return this.http.post<void>(`/inventory/movements`, change);
  }
  returnCustody(personId: string, itemId: string): Promise<void> {
    return this.http.post<void>(`/inventory/custody/${personId}/return`, { item_id: itemId });
  }
  setDiscrepancy(id: string, status: DiscrepancyStatus, note: string | null): Promise<void> {
    return this.http.patch<void>(`/inventory/discrepancies/${id}`, { status, note });
  }
  setRequest(id: string, status: RestockStatus, note: string | null): Promise<void> {
    return this.http.patch<void>(`/inventory/restock-requests/${id}`, { status, note });
  }
}
