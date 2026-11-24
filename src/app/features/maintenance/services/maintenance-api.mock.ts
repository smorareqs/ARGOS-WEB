import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, isoFromToday, latency, uid } from '../../../core/mocks/mock-utils';
import { OpsProperty, opsPeople, opsProperties } from '../../../core/mocks/demo-ops';
import { ApiError } from '../../../core/http/api-error';
import { addDays, dayKey, toDayKey } from '../../../shared/utils/time';
import { MaintenanceApi, TicketAction } from './maintenance-api.service';
import {
  ACTIVE_STATUSES, Asset, AssetCategory, AssetDetail, AssetDocument, AssetDraft, AssetPatch, AssignDraft, Assignable, Metrics,
  Plan, PlanDraft, PlanPatch, ResolveDraft, Ticket, TicketDetail, TicketDraft, TicketEvent, TicketPatch, TicketQuery,
  TicketStatus, Urgency, Vendor, VendorDraft, VendorPatch,
} from '../models/maintenance.model';

/** Estado del mock por empresa (solo el build de demostración). */
interface State {
  vendors: Vendor[];
  assets: Asset[];
  plans: Plan[];
  tickets: TicketDetail[];
  docs: Record<string, AssetDocument[]>;
  seq: number;
}

const VENDORS: readonly [string, string, string][] = [
  ['Elevadores del Valle', 'Elevadores', '+502 2365 1180'],
  ['Fríos del Sur', 'Aire acondicionado', '+502 5521 9043'],
  ['Plomería Hernández', 'Plomería', '+502 4410 2271'],
  ['Piscinas y Bombas Atitlán', 'Piscinas y bombas', '+502 3307 5512'],
];

const ASSETS: readonly [AssetCategory, string, string, number | null][] = [
  ['hvac', 'A/C de la sala', 'Sala', 1],
  ['water', 'Calentador de agua', 'Lavandería', 2],
  ['appliance', 'Refrigeradora', 'Cocina', null],
  ['plumbing', 'Bomba de agua', 'Patio', 2],
  ['water', 'Bomba de la piscina', 'Cuarto de bombas', 3],
];

const STORIES: readonly [string, Urgency, TicketStatus, number][] = [
  ['El A/C de la sala gotea', 'high', 'in_progress', 0],
  ['La bomba de la piscina no arranca', 'critical', 'assigned', 4],
  ['Luz del pasillo fundida', 'low', 'open', -1],
  ['La puerta del patio no cierra bien', 'medium', 'open', -1],
  ['Fuga en el lavamanos del baño', 'medium', 'closed', 3],
  ['El calentador no enciende', 'high', 'resolved', 1],
];

@Injectable()
export class MockMaintenanceApi extends MaintenanceApi {
  private readonly session = inject(SessionStore);

  private get tenant(): string {
    return mockTenantKey(this.session.tenant());
  }

  private table(): MockTable<State> {
    const t = this.tenant;
    return new MockTable<State>(`maintenance_v3_${t}`, () => [seed(t)]);
  }

  private state(): State {
    return this.table().all()[0];
  }

  private save(fn: (s: State) => void): State {
    const s = this.state();
    fn(s);
    this.table().save([s]);
    return s;
  }

  private me(): { id: string; name: string } {
    const u = this.session.user();
    return { id: u?.id ?? 'me', name: u?.nombre ?? 'Tú' };
  }

  // --- Incidencias -----------------------------------------------------------------

  async tickets(q: TicketQuery = {}): Promise<readonly Ticket[]> {
    await latency();
    const want = q.status === 'active' ? ACTIVE_STATUSES : q.status ? q.status.split(',') : null;
    return this.state()
      .tickets.filter((t) => (!want || want.includes(t.status)) && (!q.asset_id || t.asset_id === q.asset_id) && (!q.vendor_id || t.vendor_id === q.vendor_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async ticket(id: string): Promise<TicketDetail> {
    await latency(200, 360);
    return this.find(id);
  }

  async createTicket(d: TicketDraft): Promise<TicketDetail> {
    await latency();
    const p = opsProperties(this.tenant).find((x) => x.id === d.property_id);
    if (!p) throw new ApiError(404, 'La propiedad no existe.');
    const asset = d.asset_id ? this.state().assets.find((a) => a.id === d.asset_id) ?? null : null;
    const me = this.me();
    let created!: TicketDetail;
    this.save((s) => {
      s.seq += 1;
      created = ticketOf(s.seq, p, asset, d.title, d.urgency, 'open', me, 0);
      created = { ...created, description: d.description ?? '', photos_count: d.photo_file_ids?.length ?? 0 };
      s.tickets.unshift(created);
    });
    return created;
  }

  async updateTicket(id: string, p: TicketPatch): Promise<TicketDetail> {
    await latency(240, 420);
    return this.patch(id, (t) => ({ ...t, ...p, cost: p.cost === undefined ? t.cost : p.cost }), 'updated', { fields: Object.keys(p) });
  }

  async assign(id: string, d: AssignDraft): Promise<TicketDetail> {
    await latency(240, 420);
    const people = opsPeople(this.tenant);
    const vendor = this.state().vendors.find((v) => v.id === d.vendor_id) ?? null;
    const person = people.find((x) => x.id === d.assignee_id) ?? null;
    return this.patch(
      id,
      (t) => ({ ...t, assigned_to: person?.id ?? null, assignee_name: person?.name ?? null, vendor_id: vendor?.id ?? null, vendor_name: vendor?.name ?? null, status: t.status === 'in_progress' ? 'in_progress' : 'assigned' }),
      'assigned',
      { assignee_name: person?.name ?? null, vendor_name: vendor?.name ?? null, note: d.note || undefined },
    );
  }

  async start(id: string): Promise<TicketDetail> {
    await latency(240, 420);
    return this.patch(id, (t) => ({ ...t, status: 'in_progress' }), 'started', {});
  }

  async resolve(id: string, d: ResolveDraft): Promise<TicketDetail> {
    await latency(300, 520);
    return this.patch(
      id,
      (t) => ({ ...t, status: 'resolved', resolution: d.resolution, cost: d.cost ?? t.cost, resolved_at: new Date().toISOString() }),
      'resolved',
      { resolution: d.resolution, cost: d.cost ?? undefined },
    );
  }

  async act(id: string, action: TicketAction, reason?: string): Promise<TicketDetail> {
    await latency(240, 420);
    const next: Record<TicketAction, TicketStatus> = { close: 'closed', reject: 'rejected', reopen: 'open' };
    const kind = ({ close: 'closed', reject: 'rejected', reopen: 'reopened' } as const)[action];
    return this.patch(id, (t) => ({ ...t, status: next[action], closed_at: action === 'close' ? new Date().toISOString() : t.closed_at }), kind, reason ? { reason } : {});
  }

  async assignables(): Promise<readonly Assignable[]> {
    await latency(120, 240);
    return opsPeople(this.tenant, ['maintenance', 'supervisor', 'admin']).map((p) => ({
      user_id: p.id, full_name: p.name, role_name: p.role === 'maintenance' ? 'Mantenimiento' : p.role === 'admin' ? 'Administrador' : 'Supervisor',
      open_tickets: this.state().tickets.filter((t) => t.assigned_to === p.id && ACTIVE_STATUSES.includes(t.status)).length,
    }));
  }

  // --- Activos, preventivos, proveedores -------------------------------------------

  async assets(): Promise<readonly Asset[]> {
    await latency();
    return this.state().assets;
  }

  async asset(id: string): Promise<AssetDetail> {
    await latency(200, 360);
    const s = this.state();
    const a = s.assets.find((x) => x.id === id);
    if (!a) throw new ApiError(404, 'El activo no existe.');
    return { ...a, plans: s.plans.filter((p) => p.asset_id === id), documents: s.docs[id] ?? [], tickets: s.tickets.filter((t) => t.asset_id === id) };
  }

  async createAsset(d: AssetDraft): Promise<Asset> {
    await latency();
    const p = opsProperties(this.tenant).find((x) => x.id === d.property_id) ?? null;
    const vendor = this.state().vendors.find((v) => v.id === d.vendor_id) ?? null;
    const a = assetOf(uid('as'), p, d.category, d.name, d.location ?? null, vendor, d.status ?? 'operational');
    this.save((s) => s.assets.unshift({ ...a, brand: d.brand ?? null, model: d.model ?? null, installed_at: d.installed_at ?? null }));
    return a;
  }

  async updateAsset(id: string, p: AssetPatch): Promise<Asset> {
    await latency(240, 420);
    let out!: Asset;
    this.save((s) => {
      s.assets = s.assets.map((a) => (a.id === id ? (out = { ...a, ...p, vendor_name: s.vendors.find((v) => v.id === (p.vendor_id ?? a.vendor_id))?.name ?? null } as Asset) : a));
    });
    return out;
  }

  async attachDocument(assetId: string, file: File): Promise<AssetDocument> {
    await latency(400, 700);
    const doc: AssetDocument = { file_id: uid('fl'), name: file.name, content_type: file.type, size_bytes: file.size, url: URL.createObjectURL(file), created_at: new Date().toISOString() };
    this.save((s) => (s.docs[assetId] = [doc, ...(s.docs[assetId] ?? [])]));
    return doc;
  }

  async removeDocument(assetId: string, fileId: string): Promise<void> {
    await latency(200, 360);
    this.save((s) => (s.docs[assetId] = (s.docs[assetId] ?? []).filter((d) => d.file_id !== fileId)));
  }

  async plans(): Promise<readonly Plan[]> {
    await latency();
    return [...this.state().plans].sort((a, b) => a.next_due_at.localeCompare(b.next_due_at));
  }

  async createPlan(assetId: string, d: PlanDraft): Promise<Plan> {
    await latency();
    const s = this.state();
    const a = s.assets.find((x) => x.id === assetId);
    if (!a) throw new ApiError(404, 'El activo no existe.');
    const vendor = s.vendors.find((v) => v.id === (d.vendor_id ?? a.vendor_id)) ?? null;
    const p = planOf(uid('pl'), a, d.name, d.frequency_days, d.next_due_at ?? dayKey(d.frequency_days), vendor, d.lead_days ?? 7);
    this.save((st) => st.plans.push(p));
    return p;
  }

  async updatePlan(_assetId: string, planId: string, p: PlanPatch): Promise<Plan> {
    await latency(240, 420);
    let out!: Plan;
    this.save((s) => (s.plans = s.plans.map((x) => (x.id === planId ? (out = { ...x, ...p, due_state: dueState({ ...x, ...p } as Plan) } as Plan) : x))));
    return out;
  }

  async vendors(): Promise<readonly Vendor[]> {
    await latency();
    return this.state().vendors;
  }

  async createVendor(d: VendorDraft): Promise<Vendor> {
    await latency();
    if (this.state().vendors.some((v) => v.name.toLowerCase() === d.name.trim().toLowerCase())) {
      throw new ApiError(422, 'Ya hay un proveedor con ese nombre.', [{ location: 'body.name', message: 'Ya hay un proveedor con ese nombre.' }]);
    }
    const v = vendorOf(uid('vd'), d.name.trim(), d.service_type ?? null, d.phone ?? null);
    this.save((s) => s.vendors.push({ ...v, contact_name: d.contact_name ?? null, email: d.email ?? null, notes: d.notes ?? null }));
    return v;
  }

  async updateVendor(id: string, p: VendorPatch): Promise<Vendor> {
    await latency(240, 420);
    let out!: Vendor;
    this.save((s) => (s.vendors = s.vendors.map((v) => (v.id === id ? (out = { ...v, ...p } as Vendor) : v))));
    return out;
  }

  async metrics(): Promise<Metrics> {
    await latency();
    const s = this.state();
    const open = s.tickets.filter((t) => ACTIVE_STATUSES.includes(t.status));
    const byPlace = new Map<string, { kind: 'property'; id: string; code: string | null; name: string; open: number }>();
    for (const t of open) {
      const k = t.property_id ?? '';
      byPlace.set(k, { kind: 'property', id: k, code: t.property_code, name: t.property_name ?? '', open: (byPlace.get(k)?.open ?? 0) + 1 });
    }
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - 5 + i);
      return { month: d.toISOString().slice(0, 7), hours: [31, 26, 29, 22, 19, 17][i], resolved: [3, 4, 2, 5, 4, 3][i] };
    });
    return {
      open: open.length, urgent: open.filter((t) => t.urgency === 'high' || t.urgency === 'critical').length,
      unassigned: open.filter((t) => !t.assigned_to && !t.vendor_id).length,
      overdue_plans: s.plans.filter((p) => p.due_state === 'overdue').length, due_plans: s.plans.filter((p) => p.due_state === 'upcoming').length,
      avg_hours: 22, cost_month: 1350, cost_year: 18450, open_by_place: [...byPlace.values()].sort((a, b) => b.open - a.open),
      resolution: months,
      cost_by_category: [
        { category: 'hvac', cost: 6400, tickets: 5 }, { category: 'water', cost: 4100, tickets: 4 },
        { category: 'plumbing', cost: 3900, tickets: 6 }, { category: 'hospitality', cost: 2600, tickets: 2 }, { category: 'none', cost: 1450, tickets: 5 },
      ],
    };
  }

  async uploadPhoto(file: File): Promise<string> {
    await latency(300, 600);
    return `fl_${file.size}_${Date.now()}`;
  }

  // --- Ayudas --------------------------------------------------------------------

  private find(id: string): TicketDetail {
    const t = this.state().tickets.find((x) => x.id === id);
    if (!t) throw new ApiError(404, 'La incidencia no existe.');
    return t;
  }

  private patch(id: string, fn: (t: TicketDetail) => TicketDetail, kind: TicketEvent['type'], data: Record<string, unknown>): TicketDetail {
    const me = this.me();
    let out!: TicketDetail;
    this.save((s) => {
      s.tickets = s.tickets.map((t) => {
        if (t.id !== id) return t;
        const next = fn(t);
        out = { ...next, updated_at: new Date().toISOString(), events: [...t.events, eventOf(kind, me.name, data)] };
        return out;
      });
    });
    if (!out) throw new ApiError(404, 'La incidencia no existe.');
    return out;
  }
}

// --- Semilla ---------------------------------------------------------------------

function seed(tenant: string): State {
  const props = opsProperties(tenant);
  const people = opsPeople(tenant);
  const fixer = people.find((p) => p.role === 'maintenance') ?? people[0];
  const reporter = people.find((p) => p.role === 'cleaner') ?? people[0];
  const vendors = VENDORS.map(([n, t, ph], i) => vendorOf(`vd_${tenant}_${i}`, n, t, ph));
  const assets = ASSETS.map(([cat, name, loc, v], i) => {
    const p = props[i % Math.max(1, props.length)] ?? null;
    return assetOf(`as_${tenant}_${i}`, p, cat, name, loc, v === null ? null : vendors[v], i === 4 ? 'out_of_service' : i === 0 ? 'needs_attention' : 'operational');
  });
  const plans = [
    planOf(`pl_${tenant}_0`, assets[0], 'Limpieza de filtros', 90, dayKey(20), vendors[1], 7),
    planOf(`pl_${tenant}_1`, assets[1], 'Purga del tanque', 180, dayKey(-6), null, 10),
    planOf(`pl_${tenant}_2`, assets[4], 'Revisión trimestral', 90, dayKey(4), vendors[3], 7),
  ];
  const tickets = STORIES.map(([title, urgency, status, a], i) => {
    const asset = a >= 0 ? assets[a] : null;
    const p = props.find((x) => x.id === asset?.property_id) ?? props[(i + 2) % Math.max(1, props.length)];
    const t = ticketOf(i + 1, p, asset, title, urgency, status, { id: reporter.id, name: reporter.name }, i * 2 + 1);
    const assigned = status !== 'open' ? { assigned_to: fixer.id, assignee_name: fixer.name, vendor_id: asset?.vendor_id ?? null, vendor_name: asset?.vendor_name ?? null } : {};
    const done = status === 'resolved' || status === 'closed' ? { resolution: 'Se cambió la pieza dañada.', cost: 350 + i * 90, resolved_at: isoFromToday(-i, 15) } : {};
    return { ...t, ...assigned, ...done };
  });
  return { vendors, assets, plans, tickets, docs: {}, seq: tickets.length };
}

function vendorOf(id: string, name: string, type: string | null, phone: string | null): Vendor {
  const now = new Date().toISOString();
  return { id, name, service_type: type, contact_name: null, phone, email: null, notes: null, is_active: true, assets_count: 1, open_tickets: 0, tickets_done: 3, spend_year: 4200, avg_hours: 21, created_at: now, updated_at: now };
}

function assetOf(id: string, p: OpsProperty | null, category: AssetCategory, name: string, location: string | null, vendor: Vendor | null, status: Asset['status']): Asset {
  const now = new Date().toISOString();
  return {
    id, property_id: p?.id ?? null, property_code: p?.code ?? null, property_name: p?.name ?? null, building_id: p?.buildingId ?? null,
    building_name: p?.buildingName ?? null, category, name, brand: null, model: null, serial: null, location, installed_at: '2022-03-01',
    warranty_until: '2025-03-01', vendor_id: vendor?.id ?? null, vendor_name: vendor?.name ?? null, status, notes: null, is_active: true,
    open_tickets: 0, tickets_count: 1, cost_year: 0, next_due_at: null, created_at: now, updated_at: now,
  };
}

function planOf(id: string, a: Asset, name: string, freq: number, next: string, vendor: Vendor | null, lead: number): Plan {
  const now = new Date().toISOString();
  const p: Plan = {
    id, asset_id: a.id, asset_name: a.name, asset_category: a.category, property_id: a.property_id, property_code: a.property_code,
    building_name: a.building_name, name, frequency_days: freq, responsible_user_id: null, responsible_name: null, vendor_id: vendor?.id ?? null,
    vendor_name: vendor?.name ?? null, last_done_at: null, next_due_at: next, lead_days: lead, is_active: true, due_state: 'ok',
    open_ticket_id: null, open_ticket_number: null, created_at: now, updated_at: now,
  };
  return { ...p, due_state: dueState(p) };
}

function dueState(p: Plan): Plan['due_state'] {
  const today = dayKey();
  if (!p.is_active) return 'inactive';
  if (p.next_due_at < today) return 'overdue';
  return toDayKey(addDays(new Date(p.next_due_at + 'T12:00:00'), -p.lead_days)) <= today ? 'upcoming' : 'ok';
}

function ticketOf(n: number, p: OpsProperty | null, asset: Asset | null, title: string, urgency: Urgency, status: TicketStatus, by: { id: string; name: string }, ageDays: number): TicketDetail {
  const at = isoFromToday(-ageDays, 9 + (n % 6));
  return {
    id: `tk_${n}_${p?.id ?? 'x'}`, number: n, property_id: p?.id ?? null, property_code: p?.code ?? null, property_name: p?.name ?? null,
    building_id: p?.buildingId ?? null, building_name: p?.buildingName ?? null, asset_id: asset?.id ?? null, asset_name: asset?.name ?? null,
    asset_category: asset?.category ?? null, plan_id: null, plan_name: null, title, description: '', urgency, status,
    reported_by_user_id: by.id, reporter_name: by.name, assigned_to: null, assignee_name: null, vendor_id: null, vendor_name: null,
    task_id: null, resolution: null, cost: null, photos_count: 0, resolved_at: null, closed_at: null, created_at: at, updated_at: at,
    events: [{ ...eventOf('created', by.name, {}), created_at: at }], photos: [],
  };
}

function eventOf(type: TicketEvent['type'], actor: string, data: Record<string, unknown>): TicketEvent {
  return { id: uid('ev'), type, actor_user_id: null, actor_name: actor, data, created_at: new Date().toISOString() };
}
