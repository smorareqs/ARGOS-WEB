/**
 * Facturación de la empresa y administración de planes (fase06.md §3,
 * contrato en §3.4). W-O4, W-P2, W-P3 y las claves API de §4.1.
 */

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
export type BillingCycle = 'monthly' | 'yearly';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface PlanLimits {
  /** null = sin límite. */
  readonly max_properties: number | null;
  readonly max_users: number | null;
  readonly features: readonly string[];
}

export interface Plan {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly price_monthly: number;
  readonly price_yearly: number;
  readonly currency: string;
  readonly limits: PlanLimits;
  readonly is_active: boolean;
  readonly sort_order: number;
  readonly subscribers: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface Invoice {
  readonly id: string;
  readonly tenant_id: string;
  readonly number: string;
  readonly description: string;
  readonly plan_name: string;
  readonly period_start: string;
  readonly period_end: string;
  readonly subtotal: number;
  readonly tax: number;
  readonly total: number;
  readonly currency: string;
  readonly status: InvoiceStatus;
  readonly due_at: string;
  readonly paid_at: string | null;
  readonly last_error: string | null;
  readonly created_at: string;
}

export interface Subscription {
  readonly id: string;
  readonly tenant_id: string;
  readonly tenant_name: string;
  readonly tenant_slug: string;
  readonly plan_id: string;
  readonly plan_key: string;
  readonly plan_name: string;
  readonly cycle: BillingCycle;
  readonly price: number;
  readonly currency: string;
  readonly limits: PlanLimits;
  readonly status: SubscriptionStatus;
  readonly status_label: string;
  readonly read_only: boolean;
  readonly current_period_start: string;
  readonly current_period_end: string;
  readonly trial_ends_at: string | null;
  readonly grace_days: number;
  readonly cancel_at_period_end: boolean;
  readonly provider: string;
  readonly payment_method: string | null;
  readonly status_changed_at: string;
  readonly open_invoice?: Invoice;
  readonly suspends_at: string | null;
  readonly failed_payments: number;
  readonly last_payment_at: string | null;
}

export interface Usage {
  readonly properties: number;
  readonly users: number;
  readonly storage_bytes: number;
}

export interface BillingOverview {
  readonly subscription: Subscription;
  readonly usage: Usage;
  readonly plans: readonly Plan[];
}

export interface CheckoutResult {
  readonly status: 'succeeded' | 'failed' | 'redirect';
  readonly message: string;
  readonly redirect_url: string | null;
  readonly overview: BillingOverview;
}

export interface PlanDraft {
  readonly key?: string;
  readonly name: string;
  readonly description: string;
  readonly price_monthly: number;
  readonly price_yearly: number;
  readonly limits: PlanLimits;
  readonly is_active?: boolean;
  readonly sort_order?: number;
}

export interface ApiKey {
  readonly id: string;
  readonly name: string;
  readonly prefix: string;
  readonly scopes: readonly string[];
  readonly last_used_at: string | null;
  readonly revoked_at: string | null;
  readonly created_by_name: string | null;
  readonly created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  /** Solo viaja una vez, al crearla. */
  readonly key: string;
}

export const STATUS_TONE: Record<SubscriptionStatus, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  trialing: 'info',
  active: 'success',
  past_due: 'warning',
  suspended: 'danger',
  cancelled: 'neutral',
};

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: 'En prueba',
  active: 'Al día',
  past_due: 'Pago vencido',
  suspended: 'Suspendida',
  cancelled: 'Cancelada',
};

export const INVOICE_LABEL: Record<InvoiceStatus, { readonly label: string; readonly tone: 'success' | 'warning' | 'neutral' | 'danger' }> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  open: { label: 'Pendiente', tone: 'warning' },
  paid: { label: 'Pagada', tone: 'success' },
  void: { label: 'Anulada', tone: 'neutral' },
  uncollectible: { label: 'Incobrable', tone: 'danger' },
};

export const FEATURE_LABEL: Record<string, string> = {
  reservations: 'Reservas',
  parking: 'Parqueos',
  shared_areas: 'Áreas comunes',
  guest_chat: 'Chat con huéspedes',
  payroll: 'Nómina',
  smart_locks: 'Cerraduras',
};

export const ALL_FEATURES = Object.keys(FEATURE_LABEL);

/** Precio del plan en el ciclo, IVA incluido. */
export function priceOf(p: Plan, cycle: BillingCycle): number {
  return cycle === 'yearly' ? p.price_yearly : p.price_monthly;
}

/** "2 meses gratis" cuando el anual sale más barato que 12 mensuales. */
export function yearlySaving(p: Plan): number {
  return Math.max(0, Math.round((p.price_monthly * 12 - p.price_yearly) * 100) / 100);
}

/** Qué no cabe del uso actual en el plan (vacío = cabe). */
export function overLimits(p: Plan, u: Usage): string[] {
  const out: string[] = [];
  if (p.limits.max_properties !== null && u.properties > p.limits.max_properties) {
    out.push(`${u.properties} propiedades (permite ${p.limits.max_properties})`);
  }
  if (p.limits.max_users !== null && u.users > p.limits.max_users) out.push(`${u.users} personas (permite ${p.limits.max_users})`);
  return out;
}

export function bytesLabel(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(0, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
