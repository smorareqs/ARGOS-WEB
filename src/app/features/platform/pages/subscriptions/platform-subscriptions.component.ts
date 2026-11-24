import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BillingApi } from '../../../billing/services/billing-api.service';
import { INVOICE_LABEL, Invoice, Plan, STATUS_LABEL, STATUS_TONE, Subscription, SubscriptionStatus } from '../../../billing/models/billing.model';
import { toApiError } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { downloadBlob } from '../../../../shared/utils/csv';
import { gtq } from '../../../../shared/utils/time';
import { plural } from '../../../../shared/utils/plural';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent, SelectOption } from '../../../../shared/atoms/select/select.component';
import { TenantMarkComponent } from '../../../../shared/atoms/tenant-mark/tenant-mark.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { StatTileComponent } from '../../../../shared/molecules/stat-tile/stat-tile.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';

/**
 * Screen · Suscripciones (W-P3): estado de cada empresa, vencimientos y cobros
 * fallidos, con las acciones de la plataforma (reactivar, dar prueba) y las
 * facturas de cada una. Suspendidas y vencidas primero.
 */
@Component({
  selector: 'app-platform-subscriptions-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    PageHeaderComponent,
    StatTileComponent,
    SegmentedComponent,
    BadgeComponent,
    ButtonComponent,
    IconComponent,
    InputComponent,
    SelectComponent,
    TenantMarkComponent,
    EmptyStateComponent,
    FormFieldComponent,
    DrawerComponent,
  ],
  template: `
    <app-page-header title="Suscripciones" eyebrow="ARGOS" [subtitle]="subtitle()" />

    @if (error(); as err) {
      <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="error" title="No pudimos cargar las suscripciones" [message]="err" /></div>
    } @else if (all(); as list) {
      <div class="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <app-stat-tile label="Al día" [value]="count('active')" icon="check-circle" tone="primary" />
        <app-stat-tile label="En prueba" [value]="count('trialing')" icon="clock" tone="primary" />
        <app-stat-tile label="Pago vencido" [value]="count('past_due')" icon="alert-triangle" tone="warning" />
        <app-stat-tile label="Suspendidas" [value]="count('suspended')" icon="lock" tone="danger" />
      </div>
      <div class="mb-4 overflow-x-auto"><app-segmented [options]="filters" [(value)]="filter" ariaLabel="Filtrar por estado" /></div>
      @if (shown().length) {
        <div class="overflow-x-auto rounded-card border border-border-card bg-surface shadow-e1">
          <table class="w-full min-w-[860px] border-collapse text-[12.5px]">
            <thead>
              <tr class="border-b border-divider text-[10.5px] uppercase tracking-[1px] text-text-secondary">
                <th class="px-4 py-3 text-left font-normal">Empresa</th>
                <th class="px-3 py-3 text-left font-normal">Plan</th>
                <th class="px-3 py-3 text-left font-normal">Estado</th>
                <th class="px-3 py-3 text-left font-normal">Renueva o vence</th>
                <th class="px-3 py-3 text-right font-normal">Pendiente</th>
                <th class="px-3 py-3 text-right font-normal">Fallidos 90 d</th>
                <th class="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              @for (s of shown(); track s.id) {
                <tr class="border-b border-divider last:border-0">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2.5"><app-tenant-mark [name]="s.tenant_name" [logo]="null" [size]="30" /><div><div class="font-bold text-primary">{{ s.tenant_name }}</div><div class="font-mono text-[11px] text-text-secondary">{{ s.tenant_slug }}</div></div></div>
                  </td>
                  <td class="px-3 py-3"><div class="text-primary">{{ s.plan_name }}</div><div class="text-[11.5px] text-text-secondary">{{ money(s.price) }}/{{ s.cycle === 'yearly' ? 'año' : 'mes' }}</div></td>
                  <td class="px-3 py-3">
                    <app-badge size="sm" [tone]="tone(s.status)">{{ label(s.status) }}</app-badge>
                    @if (s.cancel_at_period_end) { <div class="mt-1 text-[11px] text-text-secondary">Cancela al terminar</div> }
                  </td>
                  <td class="px-3 py-3 text-text-body">
                    @if (s.status === 'trialing' && s.trial_ends_at) { Prueba hasta {{ s.trial_ends_at | date: 'd MMM' }} }
                    @else if (s.suspends_at && s.open_invoice) { <span [class.text-danger]="true">Suspende el {{ s.suspends_at | date: 'd MMM' }}</span> }
                    @else { {{ s.current_period_end | date: 'd MMM y' }} }
                  </td>
                  <td class="tabular px-3 py-3 text-right">{{ s.open_invoice ? money(s.open_invoice.total) : '—' }}</td>
                  <td class="tabular px-3 py-3 text-right" [class.text-danger]="s.failed_payments > 0">{{ s.failed_payments }}</td>
                  <td class="px-3 py-3">
                    <div class="flex justify-end gap-1.5">
                      @if (s.status === 'suspended' || s.status === 'cancelled' || s.status === 'past_due') {
                        <app-button size="sm" variant="secondary" [loading]="busy() === s.id" (pressed)="reactivate(s)">Reactivar</app-button>
                      }
                      <app-button size="sm" variant="ghost" (pressed)="openTrial(s)">Prueba</app-button>
                      <app-button size="sm" variant="ghost" (pressed)="openInvoices(s)">Facturas</app-button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="done" title="Nada en este estado" message="Ninguna empresa coincide con el filtro." /></div>
      }
    } @else {
      <div class="skeleton h-[420px] !rounded-card"></div>
    }

    <app-drawer [open]="!!trialFor()" (openChange)="$event || trialFor.set(null)" label="Dar prueba" [width]="440">
      @if (trialFor(); as s) {
        <form class="flex h-full flex-col" novalidate (submit)="$event.preventDefault(); trial(s)">
          <div class="border-b border-divider px-6 py-5">
            <h2 class="font-display text-[20px] font-semibold text-primary">Prueba para {{ s.tenant_name }}</h2>
            <p class="mt-1 text-[12.5px] text-text-secondary">Anula lo pendiente y la empresa opera sin pagar hasta que termine. Después se factura el plan.</p>
          </div>
          <div class="flex-1 space-y-4 px-6 py-5">
            <app-form-field label="Días de prueba" for="tr-days" hint="De 1 a 90."><app-input inputId="tr-days" type="number" [value]="tDays()" (valueChange)="tDays.set($event)" /></app-form-field>
            <app-form-field label="Plan" for="tr-plan"><app-select [options]="planOptions()" [(value)]="tPlan" ariaLabel="Plan de la prueba" /></app-form-field>
          </div>
          <div class="flex justify-end gap-2.5 border-t border-divider px-6 py-4">
            <app-button variant="tertiary" (pressed)="trialFor.set(null)">Cancelar</app-button>
            <app-button type="submit" [loading]="busy() === 'trial'">Dar prueba</app-button>
          </div>
        </form>
      }
    </app-drawer>

    <app-drawer [open]="!!invoicesFor()" (openChange)="$event || invoicesFor.set(null)" label="Facturas" [width]="520">
      @if (invoicesFor(); as s) {
        <div class="border-b border-divider px-6 py-5"><h2 class="font-display text-[20px] font-semibold text-primary">Facturas de {{ s.tenant_name }}</h2></div>
        @if (invoices(); as list) {
          <ul class="divide-y divide-divider">
            @for (inv of list; track inv.id) {
              <li class="flex items-center gap-3 px-6 py-3.5">
                <div class="min-w-0 flex-1"><div class="font-mono text-[12.5px] font-bold text-primary">{{ inv.number }}</div><div class="text-[12px] text-text-secondary">{{ inv.period_start | date: 'MMM y' }}{{ inv.last_error ? ' · ' + inv.last_error : '' }}</div></div>
                <span class="tabular text-[13px] font-bold text-primary">{{ money(inv.total) }}</span>
                <app-badge size="sm" [tone]="invTone(inv)">{{ invLabel(inv) }}</app-badge>
                <app-button variant="icon" size="sm" ariaLabel="Descargar PDF" [loading]="busy() === 'pdf:' + inv.id" (pressed)="pdf(inv)"><app-icon name="file" [size]="15" /></app-button>
              </li>
            } @empty {
              <li class="px-6 py-8 text-center text-[13px] text-text-secondary">Sin facturas todavía.</li>
            }
          </ul>
        } @else {
          <div class="skeleton m-6 h-[200px] !rounded-card"></div>
        }
      }
    </app-drawer>
  `,
})
export class PlatformSubscriptionsComponent {
  private readonly api = inject(BillingApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly all = signal<readonly Subscription[] | null>(null);
  protected readonly plans = signal<readonly Plan[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);
  protected readonly filter = signal<string>('');
  protected readonly trialFor = signal<Subscription | null>(null);
  protected readonly tDays = signal('14');
  protected readonly tPlan = signal('');
  protected readonly invoicesFor = signal<Subscription | null>(null);
  protected readonly invoices = signal<readonly Invoice[] | null>(null);
  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly filters = [
    { value: '', label: 'Todas' },
    { value: 'suspended', label: 'Suspendidas' },
    { value: 'past_due', label: 'Vencidas' },
    { value: 'trialing', label: 'En prueba' },
    { value: 'active', label: 'Al día' },
    { value: 'cancelled', label: 'Canceladas' },
  ];
  protected readonly shown = computed(() => (this.all() ?? []).filter((s) => !this.filter() || s.status === this.filter()));
  protected readonly planOptions = computed<SelectOption[]>(() => this.plans().map((p) => ({ value: p.key, label: p.name })));
  protected readonly subtitle = computed(() => {
    const l = this.all();
    if (!l) return 'Estado de pago de cada empresa';
    const mrr = l.filter((s) => s.status === 'active' || s.status === 'past_due').reduce((a, s) => a + (s.cycle === 'yearly' ? s.price / 12 : s.price), 0);
    return `${plural(l.length, 'empresa', 'empresas')} · ${gtq(mrr, 0)} al mes en planes activos`;
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const [subs, plans] = await Promise.all([this.api.subscriptions(), this.api.plans()]);
      this.all.set(subs);
      this.plans.set(plans);
    } catch (e) {
      this.error.set(toApiError(e).detail);
    }
  }

  protected count(s: SubscriptionStatus): number {
    return (this.all() ?? []).filter((x) => x.status === s).length;
  }
  protected tone(s: SubscriptionStatus) {
    return STATUS_TONE[s];
  }
  protected label(s: SubscriptionStatus) {
    return STATUS_LABEL[s];
  }
  protected invTone(i: Invoice) {
    return INVOICE_LABEL[i.status].tone;
  }
  protected invLabel(i: Invoice) {
    return INVOICE_LABEL[i.status].label;
  }

  private replace(s: Subscription): void {
    this.all.update((l) => (l ?? []).map((x) => (x.id === s.id ? s : x)));
  }

  protected async reactivate(s: Subscription): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Reactivar ${s.tenant_name}`,
      message: 'Vuelve a operar al momento. Lo pendiente vence en 7 días; si no paga, el ciclo la vuelve a suspender.',
      confirmLabel: 'Reactivar',
    });
    if (!ok) return;
    this.busy.set(s.id);
    try {
      this.replace(await this.api.reactivate(s.id, 7));
      this.toast.success(`${s.tenant_name} vuelve a operar.`);
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    } finally {
      this.busy.set(null);
    }
  }

  protected openTrial(s: Subscription): void {
    this.tDays.set('14');
    this.tPlan.set(s.plan_key);
    this.trialFor.set(s);
  }

  protected async trial(s: Subscription): Promise<void> {
    const days = Math.round(Number(this.tDays()));
    if (!(days >= 1 && days <= 90)) {
      this.toast.error('La prueba dura de 1 a 90 días.');
      return;
    }
    this.busy.set('trial');
    try {
      this.replace(await this.api.trial(s.tenant_id, days, this.tPlan() || undefined));
      this.toast.success(`${s.tenant_name} queda en prueba ${plural(days, 'día', 'días')}.`);
      this.trialFor.set(null);
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    } finally {
      this.busy.set(null);
    }
  }

  protected async openInvoices(s: Subscription): Promise<void> {
    this.invoices.set(null);
    this.invoicesFor.set(s);
    try {
      this.invoices.set(await this.api.tenantInvoices(s.tenant_id));
    } catch (e) {
      this.toast.error(toApiError(e).detail);
      this.invoices.set([]);
    }
  }

  protected async pdf(inv: Invoice): Promise<void> {
    this.busy.set('pdf:' + inv.id);
    try {
      const f = await this.api.platformInvoicePdf(inv);
      downloadBlob(f.name, f.blob);
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    } finally {
      this.busy.set(null);
    }
  }
}
