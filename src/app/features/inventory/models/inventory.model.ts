/** Contrato de inventario (fase02.md §4 · módulo `inventory`, lo sirve Persona B). */

export type ItemCategory = 'linens' | 'amenities' | 'cleaning' | 'kitchen' | 'keys';
export type MovementType = 'entry' | 'checkout' | 'return' | 'transfer' | 'adjustment' | 'consumption';
export type DiscrepancyStatus = 'open' | 'justified' | 'closed';
export type RestockStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled';

export interface Item {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly category: ItemCategory;
  readonly unit: string;
  readonly min: number;
  /** Existencia sumada de todas las bodegas. */
  readonly total: number;
}

export interface Warehouse {
  readonly id: string;
  readonly name: string;
}

export interface StockRow {
  readonly item_id: string;
  readonly warehouse_id: string;
  readonly qty: number;
}

export interface Movement {
  readonly id: string;
  readonly at: string;
  readonly type: MovementType;
  readonly item_id: string;
  readonly item_name: string;
  readonly qty: number;
  readonly warehouse: string;
  readonly person: string | null;
  readonly task_number: number | null;
  readonly note: string | null;
}

export interface Custody {
  readonly person_id: string;
  readonly person_name: string;
  readonly item_id: string;
  readonly item_name: string;
  readonly unit: string;
  readonly qty: number;
  readonly since: string;
}

export interface Discrepancy {
  readonly id: string;
  readonly status: DiscrepancyStatus;
  readonly person_name: string;
  readonly item_name: string;
  readonly expected: number;
  readonly returned: number;
  readonly task_number: number;
  readonly property_code: string;
  readonly at: string;
  readonly note: string | null;
}

export interface RestockRequest {
  readonly id: string;
  readonly status: RestockStatus;
  readonly person_name: string;
  readonly property_code: string;
  readonly items: readonly { readonly item_id: string; readonly item_name: string; readonly qty: number }[];
  readonly at: string;
  readonly note: string | null;
}

export interface InventorySnapshot {
  readonly items: readonly Item[];
  readonly warehouses: readonly Warehouse[];
  readonly stock: readonly StockRow[];
  readonly movements: readonly Movement[];
  readonly custody: readonly Custody[];
  readonly discrepancies: readonly Discrepancy[];
  readonly requests: readonly RestockRequest[];
}

export interface StockChange {
  readonly kind: 'entry' | 'adjustment' | 'transfer';
  readonly item_id: string;
  readonly warehouse_id: string;
  readonly to_warehouse_id?: string;
  /** Positivo; en ajustes puede ser negativo. */
  readonly qty: number;
  readonly note: string | null;
}

export interface ItemDraft {
  readonly sku: string;
  readonly name: string;
  readonly category: ItemCategory;
  readonly unit: string;
  readonly min: number;
}

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  linens: 'Blancos',
  amenities: 'Amenidades',
  cleaning: 'Limpieza',
  kitchen: 'Cocina',
  keys: 'Llaves y controles',
};

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  entry: 'Entrada',
  checkout: 'Salida a custodia',
  return: 'Devolución',
  transfer: 'Traslado',
  adjustment: 'Ajuste',
  consumption: 'Consumo en tarea',
};
