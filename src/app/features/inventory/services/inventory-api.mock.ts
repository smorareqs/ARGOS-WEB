import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, isoFromToday, latency, uid } from '../../../core/mocks/mock-utils';
import { opsPeople, opsProperties, pick, seeded } from '../../../core/mocks/demo-ops';
import { ApiError } from '../../../core/http/api-error';
import { InventoryApi } from './inventory-api.service';
import {
  Custody,
  Discrepancy,
  DiscrepancyStatus,
  InventorySnapshot,
  Item,
  ItemCategory,
  ItemDraft,
  Movement,
  RestockRequest,
  RestockStatus,
  StockChange,
  StockRow,
} from '../models/inventory.model';

const CATALOG: readonly [string, string, ItemCategory, string, number][] = [
  ['BL-TOA', 'Juego de toallas', 'linens', 'juegos', 40],
  ['BL-SAB', 'Juego de sábanas queen', 'linens', 'juegos', 30],
  ['BL-ALM', 'Funda de almohada', 'linens', 'unidades', 60],
  ['BL-MAN', 'Mantel de piscina', 'linens', 'unidades', 20],
  ['AM-JAB', 'Jabón de manos', 'amenities', 'unidades', 80],
  ['AM-SHA', 'Shampoo 30 ml', 'amenities', 'unidades', 120],
  ['AM-PAP', 'Papel higiénico', 'amenities', 'rollos', 150],
  ['AM-CAF', 'Café de Antigua 250 g', 'kitchen', 'bolsas', 25],
  ['LI-DES', 'Desinfectante multiusos', 'cleaning', 'litros', 24],
  ['LI-VID', 'Limpiavidrios', 'cleaning', 'litros', 12],
  ['LI-BOL', 'Bolsas de basura', 'cleaning', 'paquetes', 30],
  ['CO-ESP', 'Esponjas de cocina', 'kitchen', 'unidades', 40],
  ['LL-LLA', 'Llaves de propiedad', 'keys', 'llaves', 0],
  ['LL-CTR', 'Control de portón', 'keys', 'unidades', 0],
];

/** Mock del inventario por empresa, persistido en localStorage. */
@Injectable()
export class MockInventoryApi extends InventoryApi {
  private readonly session = inject(SessionStore);

  private table(): MockTable<InventorySnapshot> {
    const t = mockTenantKey(this.session.tenant());
    return new MockTable<InventorySnapshot>(`inventory_${t}`, () => [seed(t)]);
  }

  private read(): InventorySnapshot {
    return this.table().all()[0];
  }

  private write(fn: (s: InventorySnapshot) => InventorySnapshot): void {
    this.table().update((rows) => [withTotals(fn(rows[0]))]);
  }

  private me(): string {
    return this.session.user()?.nombre ?? 'Tú';
  }

  async snapshot(): Promise<InventorySnapshot> {
    await latency(500, 850);
    return this.read();
  }

  async createItem(d: ItemDraft): Promise<Item> {
    await latency(500, 800);
    const sku = d.sku.trim().toUpperCase();
    if (this.read().items.some((i) => i.sku === sku)) {
      throw new ApiError(422, 'Revisa los datos marcados.', [{ location: 'body.sku', message: 'Ya existe un artículo con ese SKU.' }]);
    }
    const item: Item = { id: uid('it'), sku, name: d.name.trim(), category: d.category, unit: d.unit.trim() || 'unidades', min: d.min, total: 0 };
    this.write((s) => ({ ...s, items: [...s.items, item] }));
    return item;
  }

  async changeStock(c: StockChange): Promise<void> {
    await latency(450, 750);
    const s = this.read();
    const item = s.items.find((i) => i.id === c.item_id);
    const from = s.warehouses.find((w) => w.id === c.warehouse_id);
    if (!item || !from) throw new ApiError(404, 'El artículo o la bodega ya no existe.');
    const have = s.stock.find((r) => r.item_id === c.item_id && r.warehouse_id === c.warehouse_id)?.qty ?? 0;
    const out = c.kind === 'transfer' || (c.kind === 'adjustment' && c.qty < 0);
    if (out && have < Math.abs(c.qty)) {
      throw new ApiError(422, 'Revisa los datos marcados.', [{ location: 'body.qty', message: `Solo hay ${have} ${item.unit} en ${from.name}.` }]);
    }
    const to = c.to_warehouse_id ? s.warehouses.find((w) => w.id === c.to_warehouse_id) : null;
    const bump = (rows: StockRow[], wh: string, delta: number) => {
      const exists = rows.some((r) => r.item_id === c.item_id && r.warehouse_id === wh);
      return exists
        ? rows.map((r) => (r.item_id === c.item_id && r.warehouse_id === wh ? { ...r, qty: r.qty + delta } : r))
        : [...rows, { item_id: c.item_id, warehouse_id: wh, qty: delta }];
    };
    let stock = [...s.stock];
    if (c.kind === 'transfer' && to) {
      stock = bump(bump(stock, from.id, -c.qty), to.id, c.qty);
    } else {
      stock = bump(stock, from.id, c.qty);
    }
    const mv: Movement = {
      id: uid('mv'),
      at: new Date().toISOString(),
      type: c.kind,
      item_id: item.id,
      item_name: item.name,
      qty: c.qty,
      warehouse: to ? `${from.name} → ${to.name}` : from.name,
      person: this.me(),
      task_number: null,
      note: c.note,
    };
    this.write((x) => ({ ...x, stock, movements: [mv, ...x.movements] }));
  }

  async returnCustody(personId: string, itemId: string): Promise<void> {
    await latency(400, 700);
    const s = this.read();
    const c = s.custody.find((x) => x.person_id === personId && x.item_id === itemId);
    if (!c) throw new ApiError(404, 'Esa custodia ya se devolvió.');
    const wh = s.warehouses[0];
    const exists = s.stock.some((r) => r.item_id === itemId && r.warehouse_id === wh.id);
    const stock = exists
      ? s.stock.map((r) => (r.item_id === itemId && r.warehouse_id === wh.id ? { ...r, qty: r.qty + c.qty } : r))
      : [...s.stock, { item_id: itemId, warehouse_id: wh.id, qty: c.qty }];
    const mv: Movement = { id: uid('mv'), at: new Date().toISOString(), type: 'return', item_id: itemId, item_name: c.item_name, qty: c.qty, warehouse: wh.name, person: c.person_name, task_number: null, note: `Registrada por ${this.me()}` };
    this.write((x) => ({ ...x, stock, custody: x.custody.filter((k) => k !== c && !(k.person_id === personId && k.item_id === itemId)), movements: [mv, ...x.movements] }));
  }

  async setDiscrepancy(id: string, status: DiscrepancyStatus, note: string | null): Promise<void> {
    await latency(300, 550);
    this.write((s) => ({ ...s, discrepancies: s.discrepancies.map((d) => (d.id === id ? { ...d, status, note: note ?? d.note } : d)) }));
  }

  async setRequest(id: string, status: RestockStatus, note: string | null): Promise<void> {
    await latency(350, 650);
    const s = this.read();
    const req = s.requests.find((r) => r.id === id);
    if (!req) throw new ApiError(404, 'La solicitud ya no existe.');
    let stock = s.stock;
    let movements = s.movements;
    if (status === 'fulfilled') {
      const wh = s.warehouses[0];
      for (const it of req.items) {
        const have = stock.find((r) => r.item_id === it.item_id && r.warehouse_id === wh.id)?.qty ?? 0;
        if (have < it.qty) {
          throw new ApiError(422, `No alcanza: hay ${have} de "${it.item_name}" en ${wh.name}. Registra una entrada primero.`);
        }
      }
      stock = stock.map((r) => {
        const it = req.items.find((x) => x.item_id === r.item_id);
        return it && r.warehouse_id === wh.id ? { ...r, qty: r.qty - it.qty } : r;
      });
      movements = [
        ...req.items.map((it) => ({ id: uid('mv'), at: new Date().toISOString(), type: 'checkout' as const, item_id: it.item_id, item_name: it.item_name, qty: -it.qty, warehouse: wh.name, person: req.person_name, task_number: null, note: `Reposición para ${req.property_code}` })),
        ...movements,
      ];
    }
    this.write((x) => ({ ...x, stock, movements, requests: x.requests.map((r) => (r.id === id ? { ...r, status, note: note ?? r.note } : r)) }));
  }
}

function withTotals(s: InventorySnapshot): InventorySnapshot {
  return { ...s, items: s.items.map((i) => ({ ...i, total: s.stock.filter((r) => r.item_id === i.id).reduce((a, r) => a + r.qty, 0) })) };
}

function seed(tenant: string): InventorySnapshot {
  const rnd = seeded(`inv-${tenant}`);
  const small = tenant !== 'tn_garrent';
  const warehouses = small
    ? [{ id: 'wh_mar', name: 'Bodega Marbella' }]
    : [
        { id: 'wh_central', name: 'Bodega central · Zona 10' },
        { id: 'wh_antigua', name: 'Bodega Antigua' },
      ];
  const items: Item[] = CATALOG.map(([sku, name, category, unit, min], i) => ({ id: `it_${i + 1}`, sku, name, category, unit, min: small ? Math.ceil(min / 3) : min, total: 0 }));
  const low = new Set(['AM-SHA', 'BL-SAB', 'LI-VID']);
  const stock: StockRow[] = [];
  for (const it of items) {
    warehouses.forEach((w, wi) => {
      const base = it.min === 0 ? 6 + Math.floor(rnd() * 8) : it.min * (low.has(it.sku) ? 0.35 : 0.8 + rnd() * 1.2);
      stock.push({ item_id: it.id, warehouse_id: w.id, qty: Math.max(0, Math.round(base * (wi === 0 ? 0.7 : 0.3))) });
    });
  }
  const people = opsPeople(tenant, ['cleaner', 'maintenance']);
  const props = opsProperties(tenant);
  const custody: Custody[] = [];
  for (const p of people) {
    for (const sku of ['BL-TOA', 'AM-PAP', 'LI-DES', 'LL-LLA']) {
      if (rnd() < 0.3) continue;
      const it = items.find((i) => i.sku === sku)!;
      custody.push({ person_id: p.id, person_name: p.name, item_id: it.id, item_name: it.name, unit: it.unit, qty: 1 + Math.floor(rnd() * (sku === 'AM-PAP' ? 12 : 5)), since: isoFromToday(-Math.floor(rnd() * 3), 8, 10) });
    }
  }
  const kinds: Movement['type'][] = ['consumption', 'checkout', 'return', 'entry', 'consumption', 'transfer', 'adjustment'];
  const movements: Movement[] = Array.from({ length: 34 }, (_, i) => {
    const type = pick(rnd, kinds);
    const it = pick(rnd, items.filter((x) => x.category !== 'keys'));
    const person = pick(rnd, people);
    const qty = type === 'entry' ? 20 + Math.floor(rnd() * 60) : 1 + Math.floor(rnd() * 6);
    return {
      id: `mv_${i}`,
      at: isoFromToday(-Math.floor(i / 4), 17 - (i % 4) * 2, (i * 13) % 60),
      type,
      item_id: it.id,
      item_name: it.name,
      qty: type === 'consumption' || type === 'checkout' ? -qty : type === 'adjustment' ? -1 : qty,
      warehouse: type === 'transfer' && warehouses.length > 1 ? `${warehouses[0].name} → ${warehouses[1].name}` : warehouses[0].name,
      person: type === 'entry' || type === 'transfer' || type === 'adjustment' ? 'Jorge Peña' : person.name,
      task_number: type === 'consumption' ? 1040 + Math.floor(rnd() * 60) : null,
      note: type === 'adjustment' ? 'Conteo físico: faltaba 1' : type === 'entry' ? 'Compra a Distribuidora La Económica' : null,
    };
  });
  const discrepancies: Discrepancy[] = people.slice(0, small ? 1 : 3).map((p, i) => ({
    id: `dc_${i}`,
    status: i === 2 ? 'justified' : 'open',
    person_name: p.name,
    item_name: ['Juego de toallas', 'Llaves de propiedad', 'Control de portón'][i],
    expected: [5, 2, 1][i],
    returned: [4, 1, 0][i],
    task_number: 1050 + i * 7,
    property_code: props[(i * 3) % props.length].code,
    at: isoFromToday(-i, 15, 20),
    note: i === 2 ? 'El control quedó con el huésped; lo devuelve el lunes.' : null,
  }));
  const reqItems = (skus: [string, number][]) => skus.map(([sku, qty]) => {
    const it = items.find((x) => x.sku === sku)!;
    return { item_id: it.id, item_name: it.name, qty };
  });
  const requests: RestockRequest[] = [
    { id: 'rq_1', status: 'pending', person_name: people[0]?.name ?? '—', property_code: props[0].code, items: reqItems([['AM-SHA', 12], ['AM-JAB', 6]]), at: isoFromToday(0, 9, 40), note: 'Para las llegadas del fin de semana.' },
    { id: 'rq_2', status: 'pending', person_name: people[1 % people.length]?.name ?? '—', property_code: props[Math.min(2, props.length - 1)].code, items: reqItems([['BL-SAB', 4]]), at: isoFromToday(-1, 16, 5), note: null },
    { id: 'rq_3', status: 'approved', person_name: people[0]?.name ?? '—', property_code: props[1 % props.length].code, items: reqItems([['AM-PAP', 24], ['LI-BOL', 2]]), at: isoFromToday(-1, 11, 30), note: null },
    { id: 'rq_4', status: 'fulfilled', person_name: people[1 % people.length]?.name ?? '—', property_code: props[0].code, items: reqItems([['BL-TOA', 6]]), at: isoFromToday(-3, 10, 0), note: null },
  ];
  return withTotals({ items, warehouses, stock, movements, custody, discrepancies, requests });
}
