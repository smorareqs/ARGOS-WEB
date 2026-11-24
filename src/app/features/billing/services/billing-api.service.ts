import { Injectable, inject } from '@angular/core';
import { ApiClient, DownloadedFile } from '../../../core/http/http-api';
import { Page } from '../../../core/http/page';
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
} from '../models/billing.model';

/**
 * Facturación de la empresa (W-O4), claves API (§4.1) y administración de
 * planes y suscripciones de la plataforma (W-P2, W-P3). Contrato: fase06.md §3.4.
 */
export abstract class BillingApi {
  abstract overview(): Promise<BillingOverview>;
  abstract invoices(): Promise<readonly Invoice[]>;
  abstract invoicePdf(invoice: Invoice): Promise<DownloadedFile>;
  abstract checkout(change?: { readonly plan_key?: string; readonly cycle?: BillingCycle }): Promise<CheckoutResult>;
  abstract cancel(): Promise<BillingOverview>;
  abstract resume(): Promise<BillingOverview>;

  abstract apiKeys(): Promise<readonly ApiKey[]>;
  abstract createApiKey(name: string): Promise<ApiKeyCreated>;
  abstract revokeApiKey(id: string): Promise<ApiKey>;

  abstract plans(): Promise<readonly Plan[]>;
  abstract createPlan(draft: PlanDraft & { readonly key: string }): Promise<Plan>;
  abstract updatePlan(id: string, draft: Partial<PlanDraft>): Promise<Plan>;
  abstract subscriptions(status?: SubscriptionStatus | ''): Promise<readonly Subscription[]>;
  abstract reactivate(id: string, days: number): Promise<Subscription>;
  abstract trial(tenantId: string, days: number, planKey?: string): Promise<Subscription>;
  abstract tenantInvoices(tenantId: string): Promise<readonly Invoice[]>;
  abstract platformInvoicePdf(invoice: Invoice): Promise<DownloadedFile>;
}

@Injectable()
export class HttpBillingApi extends BillingApi {
  private readonly http = inject(ApiClient);

  overview(): Promise<BillingOverview> {
    return this.http.get('/billing/subscription');
  }
  async invoices(): Promise<readonly Invoice[]> {
    return (await this.http.get<Page<Invoice>>('/billing/invoices')).items;
  }
  invoicePdf(inv: Invoice): Promise<DownloadedFile> {
    return this.http.blob(`/billing/invoices/${inv.id}/pdf`, `factura-${inv.number.toLowerCase()}.pdf`);
  }
  checkout(change: { readonly plan_key?: string; readonly cycle?: BillingCycle } = {}): Promise<CheckoutResult> {
    return this.http.post('/billing/checkout', change);
  }
  cancel(): Promise<BillingOverview> {
    return this.http.post('/billing/cancel');
  }
  resume(): Promise<BillingOverview> {
    return this.http.post('/billing/resume');
  }

  async apiKeys(): Promise<readonly ApiKey[]> {
    return (await this.http.get<Page<ApiKey>>('/api-keys')).items;
  }
  createApiKey(name: string): Promise<ApiKeyCreated> {
    return this.http.post('/api-keys', { name });
  }
  revokeApiKey(id: string): Promise<ApiKey> {
    return this.http.post(`/api-keys/${id}/revoke`);
  }

  async plans(): Promise<readonly Plan[]> {
    return (await this.http.get<Page<Plan>>('/platform/plans')).items;
  }
  createPlan(draft: PlanDraft & { readonly key: string }): Promise<Plan> {
    return this.http.post('/platform/plans', draft);
  }
  updatePlan(id: string, draft: Partial<PlanDraft>): Promise<Plan> {
    return this.http.patch(`/platform/plans/${id}`, draft);
  }
  async subscriptions(status: SubscriptionStatus | '' = ''): Promise<readonly Subscription[]> {
    return (await this.http.get<Page<Subscription>>('/platform/subscriptions', status ? { status } : undefined)).items;
  }
  reactivate(id: string, days: number): Promise<Subscription> {
    return this.http.post(`/platform/subscriptions/${id}/reactivate`, { days });
  }
  trial(tenantId: string, days: number, planKey?: string): Promise<Subscription> {
    return this.http.post(`/platform/tenants/${tenantId}/trial`, { days, ...(planKey ? { plan_key: planKey } : {}) });
  }
  async tenantInvoices(tenantId: string): Promise<readonly Invoice[]> {
    return (await this.http.get<Page<Invoice>>(`/platform/tenants/${tenantId}/invoices`)).items;
  }
  platformInvoicePdf(inv: Invoice): Promise<DownloadedFile> {
    return this.http.blob(`/platform/invoices/${inv.id}/pdf`, `factura-${inv.number.toLowerCase()}.pdf`);
  }
}
