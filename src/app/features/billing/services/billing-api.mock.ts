import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { DEMO_TENANTS, mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, latency, uid } from '../../../core/mocks/mock-utils';
import { ApiError } from '../../../core/http/api-error';
import { DownloadedFile } from '../../../core/http/http-api';
import {
  ApiKey,
  ApiKeyCreated,
  BillingCycle,
  BillingOverview,
  CheckoutResult,
  Invoice,
  Plan,
  PlanDraft,
  Subscription,
  SubscriptionStatus,
  overLimits,
  priceOf,
} from '../models/billing.model';
import { BillingApi } from './billing-api.service';

const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString();

function seedPlans(): Plan[] {
  const p = (key: string, name: string, description: string, m: number, props: number | null, users: number | null, features: string[], sort: number): Plan => ({
    id: `plan_${key}`, key, name, description, price_monthly: m, price_yearly: m * 10, currency: 'GTQ',
    limits: { max_properties: props, max_users: users, features }, is_active: true, sort_order: sort, subscribers: 1,
    created_at: iso(-200), updated_at: iso(-200),
  });
  return [
    p('inicio', 'Inicio', 'Para empezar a ordenar la operación de pocas propiedades.', 690, 8, 10, ['reservations'], 1),
    p('operacion', 'Operación', 'Reservas, parqueos, áreas comunes y nómina para una operación mediana.', 1450, 25, 30, ['reservations', 'parking', 'shared_areas', 'payroll'], 2),
    p('completo', 'Completo', 'Todo ARGOS, sin límites de propiedades ni de personas.', 2900, null, null, ['reservations', 'parking', 'shared_areas', 'guest_chat', 'payroll', 'smart_locks'], 3),
  ];
}

interface TenantBilling {
  readonly tenant: string;
  readonly name: string;
  readonly planKey: string;
  readonly cycle: BillingCycle;
  readonly status: SubscriptionStatus;
  readonly cancelAtEnd: boolean;
  readonly invoices: Invoice[];
  readonly keys: (ApiKey & { readonly secret?: string })[];
}

function invoice(tenant: string, plan: Plan, n: number, monthsAgo: number, status: Invoice['status']): Invoice {
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() - monthsAgo);
  const total = plan.price_monthly;
  const subtotal = Math.round((total / 1.12) * 100) / 100;
  return {
    id: uid('inv'), tenant_id: tenant, number: `ARG-${start.getFullYear()}-${String(n).padStart(6, '0')}`,
    description: `Plan ${plan.name} · mensual`, plan_name: plan.name, period_start: start.toISOString(),
    period_end: new Date(start.getFullYear(), start.getMonth() + 1, 1).toISOString(), subtotal,
    tax: Math.round((total - subtotal) * 100) / 100, total, currency: 'GTQ', status,
    due_at: new Date(start.getTime() + (status === 'open' ? -3 : 5) * DAY + monthsAgo * 0).toISOString(),
    paid_at: status === 'paid' ? new Date(start.getTime() + 2 * DAY).toISOString() : null,
    last_error: status === 'open' ? 'La tarjeta fue rechazada por el banco emisor.' : null, created_at: start.toISOString(),
  };
}

function seedTenants(): TenantBilling[] {
  const plans = seedPlans();
  return DEMO_TENANTS.map((t, i) => {
    const plan = plans[i === 0 ? 2 : 1];
    const overdue = i > 0;
    return {
      tenant: t.id, name: t.name, planKey: plan.key, cycle: 'monthly' as const, status: overdue ? 'past_due' as const : 'active' as const,
      cancelAtEnd: false, keys: [],
      invoices: [0, 1, 2, 3].map((m) => invoice(t.id, plan, 40 - i * 10 - m, m, m === 0 && overdue ? 'open' : 'paid')),
    };
  });
}

/** Facturación simulada (modo demo): el cobro siempre pasa con la tarjeta de prueba. */
@Injectable()
export class MockBillingApi extends BillingApi {
  private readonly session = inject(SessionStore);
  private readonly planTable = new MockTable<Plan>('billing_plans', seedPlans);
  private readonly tenants = new MockTable<TenantBilling>('billing_tenants', seedTenants);

  private key(): string {
    return mockTenantKey(this.session.tenant());
  }
  private mine(): TenantBilling {
    const all = this.tenants.all();
    return all.find((t) => t.tenant === this.key()) ?? all[0];
  }
  private save(next: TenantBilling): void {
    this.tenants.update((rows) => rows.map((r) => (r.tenant === next.tenant ? next : r)));
  }
  private sub(t: TenantBilling): Subscription {
    const plan = this.planTable.all().find((p) => p.key === t.planKey) ?? this.planTable.all()[0];
    const open = t.invoices.filter((i) => i.status === 'open').sort((a, b) => a.due_at.localeCompare(b.due_at))[0];
    const start = new Date();
    start.setDate(1);
    return {
      id: `sub_${t.tenant}`, tenant_id: t.tenant, tenant_name: t.name, tenant_slug: t.name.toLowerCase().replace(/\W+/g, '_'),
      plan_id: plan.id, plan_key: plan.key, plan_name: plan.name, cycle: t.cycle, price: priceOf(plan, t.cycle), currency: 'GTQ',
      limits: plan.limits, status: t.status, status_label: '', read_only: t.status === 'suspended' || t.status === 'cancelled',
      current_period_start: start.toISOString(),
      current_period_end: new Date(start.getFullYear(), start.getMonth() + (t.cycle === 'yearly' ? 12 : 1), 1).toISOString(),
      trial_ends_at: null, grace_days: 7, cancel_at_period_end: t.cancelAtEnd, provider: 'fake',
      payment_method: 'Tarjeta de prueba terminada en 4242', status_changed_at: iso(-3), open_invoice: open,
      suspends_at: open ? new Date(new Date(open.due_at).getTime() + 7 * DAY).toISOString() : null,
      failed_payments: t.invoices.filter((i) => i.last_error).length, last_payment_at: t.invoices.find((i) => i.paid_at)?.paid_at ?? null,
    };
  }
  private view(t: TenantBilling): BillingOverview {
    const big = t.planKey === 'completo';
    return {
      subscription: this.sub(t), plans: this.planTable.all().filter((p) => p.is_active),
      usage: { properties: big ? 14 : 5, users: big ? 12 : 6, storage_bytes: (big ? 3.4 : 0.9) * 1024 ** 3 },
    };
  }

  async overview(): Promise<BillingOverview> {
    await latency();
    return this.view(this.mine());
  }
  async invoices(): Promise<readonly Invoice[]> {
    await latency();
    return this.mine().invoices;
  }
  async invoicePdf(): Promise<DownloadedFile> {
    await latency(150, 300);
    throw new ApiError(501, 'La factura en PDF solo se genera con la API real.');
  }
  async checkout(change: { readonly plan_key?: string; readonly cycle?: BillingCycle } = {}): Promise<CheckoutResult> {
    await latency(600, 900);
    let t = this.mine();
    const planKey = change.plan_key ?? t.planKey;
    const cycle = change.cycle ?? t.cycle;
    if (planKey !== t.planKey || cycle !== t.cycle || t.status === 'cancelled') {
      const plan = this.planTable.all().find((p) => p.key === planKey);
      if (!plan) throw new ApiError(404, 'El plan no existe.');
      const over = overLimits(plan, this.view(t).usage);
      if (over.length) throw new ApiError(422, `El plan ${plan.name} no alcanza: tienes ${over.join(' y ')}.`);
      const voided = t.invoices.map((i) => (i.status === 'open' ? { ...i, status: 'void' as const } : i));
      const fresh = { ...invoice(t.tenant, plan, 99, 0, 'open'), description: `Plan ${plan.name} · ${cycle === 'yearly' ? 'anual' : 'mensual'}`, total: priceOf(plan, cycle), last_error: null };
      t = { ...t, planKey, cycle, cancelAtEnd: false, invoices: [fresh, ...voided] };
    }
    const open = t.invoices.find((i) => i.status === 'open');
    if (!open) throw new ApiError(422, 'No hay facturas pendientes ni un cambio de plan que pagar.');
    t = { ...t, status: 'active', invoices: t.invoices.map((i) => (i.status === 'open' ? { ...i, status: 'paid' as const, paid_at: new Date().toISOString() } : i)) };
    this.save(t);
    return { status: 'succeeded', message: `Pago recibido: Q ${open.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Gracias.`, redirect_url: null, overview: this.view(t) };
  }
  async cancel(): Promise<BillingOverview> {
    await latency();
    const t = { ...this.mine(), cancelAtEnd: true };
    this.save(t);
    return this.view(t);
  }
  async resume(): Promise<BillingOverview> {
    await latency();
    const t = { ...this.mine(), cancelAtEnd: false };
    this.save(t);
    return this.view(t);
  }

  async apiKeys(): Promise<readonly ApiKey[]> {
    await latency();
    return this.mine().keys;
  }
  async createApiKey(name: string): Promise<ApiKeyCreated> {
    await latency();
    if (name.trim().length < 2) throw new ApiError(422, 'Ponle un nombre que diga dónde se usa (2 a 64 caracteres).');
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join('');
    const k: ApiKey = {
      id: uid('key'), name: name.trim(), prefix: `argos_${secret.slice(0, 8)}`, scopes: ['reservations:write'], last_used_at: null,
      revoked_at: null, created_by_name: this.session.user()?.nombre ?? null, created_at: new Date().toISOString(),
    };
    const t = this.mine();
    this.save({ ...t, keys: [k, ...t.keys] });
    return { ...k, key: `argos_${secret}` };
  }
  async revokeApiKey(id: string): Promise<ApiKey> {
    await latency();
    const t = this.mine();
    const keys = t.keys.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k));
    this.save({ ...t, keys });
    const k = keys.find((x) => x.id === id);
    if (!k) throw new ApiError(404, 'La clave no existe.');
    return k;
  }

  async plans(): Promise<readonly Plan[]> {
    await latency();
    return this.planTable.all();
  }
  async createPlan(draft: PlanDraft & { readonly key: string }): Promise<Plan> {
    await latency();
    if (this.planTable.all().some((p) => p.key === draft.key)) throw new ApiError(409, 'Ya hay un plan con esa clave.');
    const plan: Plan = { ...draft, id: uid('plan'), currency: 'GTQ', is_active: true, sort_order: draft.sort_order ?? 9, subscribers: 0, created_at: iso(0), updated_at: iso(0) };
    this.planTable.update((rows) => [...rows, plan]);
    return plan;
  }
  async updatePlan(id: string, draft: Partial<PlanDraft>): Promise<Plan> {
    await latency();
    const rows = this.planTable.update((all) => all.map((p) => (p.id === id ? { ...p, ...draft, updated_at: iso(0) } : p)));
    const p = rows.find((x) => x.id === id);
    if (!p) throw new ApiError(404, 'El plan no existe.');
    return p;
  }
  async subscriptions(status: SubscriptionStatus | '' = ''): Promise<readonly Subscription[]> {
    await latency();
    return this.tenants.all().map((t) => this.sub(t)).filter((s) => !status || s.status === status);
  }
  async reactivate(id: string): Promise<Subscription> {
    await latency();
    const t = this.tenants.all().find((x) => `sub_${x.tenant}` === id);
    if (!t) throw new ApiError(404, 'La suscripción no existe.');
    const next = { ...t, status: 'active' as const, cancelAtEnd: false };
    this.save(next);
    return this.sub(next);
  }
  async trial(tenantId: string, _days: number, planKey?: string): Promise<Subscription> {
    await latency();
    const t = this.tenants.all().find((x) => x.tenant === tenantId);
    if (!t) throw new ApiError(404, 'La suscripción no existe.');
    const next = { ...t, status: 'trialing' as const, planKey: planKey ?? t.planKey };
    this.save(next);
    return this.sub(next);
  }
  async tenantInvoices(tenantId: string): Promise<readonly Invoice[]> {
    await latency();
    return this.tenants.all().find((x) => x.tenant === tenantId)?.invoices ?? [];
  }
  async platformInvoicePdf(): Promise<DownloadedFile> {
    return this.invoicePdf();
  }
}
