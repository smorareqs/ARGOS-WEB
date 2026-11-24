import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BillingApi } from '../../services/billing-api.service';
import {
  BillingCycle,
  BillingOverview,
  FEATURE_LABEL,
  INVOICE_LABEL,
  Invoice,
  Plan,
  STATUS_LABEL,
  STATUS_TONE,
  bytesLabel,
  overLimits,
  priceOf,
  yearlySaving,
} from '../../models/billing.model';
import { toApiError } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { SessionStore } from '../../../../core/store/session.store';
import { downloadBlob } from '../../../../shared/utils/csv';
import { gtq } from '../../../../shared/utils/time';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';

/**
 * Facturación de la empresa (W-O4): plan y uso frente a sus límites, la
 * factura pendiente con "Pagar", el historial con PDF, cambiar de plan
 * (mensual o anual) y cancelar al terminar el período.
 */
@Component({
  selector: 'app-billing-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, BadgeComponent, ButtonComponent, IconComponent, DrawerComponent, EmptyStateComponent, SegmentedComponent],
  template: `
    @if (error(); as err) {
      <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="error" title="No pudimos cargar la facturación" [message]="err" /></div>
    } @else if (data(); as d) {
      @let s = d.subscription;
      @if (s.open_invoice; as inv) {
        <div class="mb-4 flex flex-wrap items-center gap-4 rounded-card border px-5 py-4" [class]="s.read_only ? 'border-danger/30 bg-danger-soft' : 'border-warning/30 bg-warning-soft'">
          <app-icon [name]="s.read_only ? 'lock' : 'alert-triangle'" [size]="20" [class]="s.read_only ? 'text-danger' : 'text-warning'" />
          <div class="min-w-0 flex-1 text-[13px] text-text-body">
            @if (s.read_only) {
              <b class="text-primary">Tu empresa está en solo lectura.</b> La factura {{ inv.number }} por <b class="tabular">{{ money(inv.total) }}</b> sigue sin pagarse. Al pagar, todo vuelve a funcionar al momento.
            } @else if (overdue(inv)) {
              <b class="text-primary">Pago vencido.</b> La factura {{ inv.number }} por <b class="tabular">{{ money(inv.total) }}</b> venció el {{ inv.due_at | date: "d 'de' MMMM" }}.
              @if (s.suspends_at) { Si no se paga antes del {{ s.suspends_at | date: "d 'de' MMMM" }}, la empresa queda en solo lectura. }
            } @else {
              <b class="text-primary">Factura por pagar.</b> {{ inv.number }} por <b class="tabular">{{ money(inv.total) }}</b>, vence el {{ inv.due_at | date: "d 'de' MMMM" }}.
            }
            @if (inv.last_error) { <div class="mt-1 text-[12px] text-text-secondary">Último intento: {{ inv.last_error }}</div> }
          </div>
          <app-button size="sm" [loading]="busy() === 'pay'" (pressed)="pay()">Pagar {{ money(inv.total) }}</app-button>
        </div>
      }
      <div class="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
        <section class="rounded-card bg-primary p-6 text-white shadow-e2">
          <div class="flex items-center justify-between gap-3">
            <div class="text-[11px] uppercase tracking-[1.6px] text-secondary">Plan actual</div>
            <app-badge size="sm" [tone]="tone(s.status)">{{ label(s.status) }}</app-badge>
          </div>
          <div class="mt-1 flex flex-wrap items-baseline gap-2">
            <span class="font-display text-[34px] font-semibold">{{ s.plan_name }}</span>
            <span class="tabular text-[15px] opacity-80">{{ money(s.price) }}/{{ s.cycle === 'yearly' ? 'año' : 'mes' }}</span>
          </div>
          <p class="mt-1 text-[13px] opacity-80">
            @if (s.status === 'trialing' && s.trial_ends_at) {
              Prueba hasta el {{ s.trial_ends_at | date: "d 'de' MMMM" }}; luego se factura el plan.
            } @else if (s.cancel_at_period_end) {
              Termina el {{ s.current_period_end | date: "d 'de' MMMM" }}: después la empresa queda en solo lectura.
            } @else if (s.status === 'cancelled') {
              La suscripción terminó. Elige un plan para volver a operar.
            } @else {
              Se renueva el {{ s.current_period_end | date: "d 'de' MMMM" }}{{ s.payment_method ? ' · ' + s.payment_method : '' }}
            }
          </p>
          <div class="mt-6 space-y-4">
            @for (u of usage(); track u.label) {
              <div>
                <div class="flex justify-between gap-3 text-[12.5px]"><span>{{ u.label }}</span><span class="tabular font-bold">{{ u.text }}</span></div>
                @if (u.max !== null) {
                  <div class="mt-1.5 h-[6px] overflow-hidden rounded-pill bg-white/15"><div class="h-full rounded-pill" [class]="u.used / u.max > 0.85 ? 'bg-[#e0a863]' : 'bg-white'" [style.width.%]="Math.min(100, (u.used / u.max) * 100)"></div></div>
                }
              </div>
            }
          </div>
          <div class="mt-5 flex flex-wrap gap-1.5">
            @for (f of s.limits.features; track f) { <span class="rounded-pill bg-white/10 px-2.5 py-1 text-[11.5px]">{{ featureLabel(f) }}</span> }
          </div>
          <div class="mt-6 flex flex-wrap gap-2.5">
            <app-button variant="secondary" (pressed)="picking.set(true)">{{ s.status === 'cancelled' ? 'Elegir plan' : 'Cambiar plan' }}</app-button>
            @if (s.status !== 'cancelled') {
              @if (s.cancel_at_period_end) {
                <app-button variant="ghost" [loading]="busy() === 'resume'" (pressed)="resume()"><span class="text-white">Seguir con el plan</span></app-button>
              } @else {
                <app-button variant="ghost" [loading]="busy() === 'cancel'" (pressed)="cancel()"><span class="text-white/80">Cancelar suscripción</span></app-button>
              }
            }
          </div>
        </section>
        <section class="rounded-card border border-border-card bg-surface shadow-e1">
          <h2 class="border-b border-divider px-5 py-4 text-[13px] font-bold text-primary">Facturas</h2>
          @if (invoices().length) {
            <ul class="divide-y divide-divider">
              @for (inv of invoices(); track inv.id) {
                <li class="flex items-center gap-3 px-5 py-3.5">
                  <div class="min-w-0 flex-1">
                    <div class="font-mono text-[12.5px] font-bold text-primary">{{ inv.number }}</div>
                    <div class="truncate text-[12px] text-text-secondary">{{ inv.period_start | date: 'MMM y' }} · {{ inv.plan_name }}</div>
                  </div>
                  <span class="tabular text-[13px] font-bold text-primary">{{ money(inv.total) }}</span>
                  <app-badge size="sm" [tone]="invoiceTone(inv)">{{ invoiceLabel(inv) }}</app-badge>
                  <app-button variant="icon" size="sm" ariaLabel="Descargar la factura en PDF" [loading]="busy() === 'pdf:' + inv.id" (pressed)="pdf(inv)"><app-icon name="file" [size]="15" /></app-button>
                </li>
              }
            </ul>
          } @else {
            <p class="px-5 py-8 text-center text-[13px] text-text-secondary">Todavía no hay facturas. La primera llega al terminar la prueba.</p>
          }
        </section>
      </div>
      <p class="mt-3 text-[12px] text-text-secondary">Precios con IVA incluido. El cobro se hace con la pasarela de pago; en este entorno es una tarjeta de prueba.</p>

      <app-drawer [open]="picking()" (openChange)="picking.set($event)" label="Cambiar de plan" [width]="560">
        @if (picking()) {
          <div class="flex h-full flex-col">
            <div class="border-b border-divider px-6 py-5">
              <h2 class="font-display text-[20px] font-semibold text-primary">Elige tu plan</h2>
              <p class="mt-1 text-[12.5px] text-text-secondary">El cambio aplica desde hoy: se anula lo pendiente y se cobra el plan nuevo.</p>
              <div class="mt-4"><app-segmented [options]="cycles" [(value)]="cycle" ariaLabel="Ciclo de cobro" /></div>
            </div>
            <div class="flex-1 space-y-3 overflow-y-auto px-6 py-5">
              @for (p of d.plans; track p.id) {
                @let excess = over(p);
                @let current = p.key === s.plan_key && cycleValue() === s.cycle && s.status !== 'cancelled';
                <button type="button" class="plan w-full rounded-card border p-4 text-left" [class.is-on]="chosen() === p.key" [disabled]="current || excess.length > 0" (click)="chosen.set(p.key)">
                  <div class="flex items-baseline justify-between gap-3">
                    <span class="font-display text-[18px] font-semibold text-primary">{{ p.name }}</span>
                    <span class="tabular text-[15px] font-bold text-primary">{{ money(price(p)) }}<span class="text-[12px] font-normal text-text-secondary">/{{ cycleValue() === 'yearly' ? 'año' : 'mes' }}</span></span>
                  </div>
                  <p class="mt-1 text-[12.5px] text-text-secondary">{{ p.description }}</p>
                  <p class="mt-2 text-[12px] text-text-body">
                    {{ p.limits.max_properties === null ? 'Propiedades sin límite' : 'Hasta ' + p.limits.max_properties + ' propiedades' }} ·
                    {{ p.limits.max_users === null ? 'personas sin límite' : p.limits.max_users + ' personas' }}
                  </p>
                  <div class="mt-2 flex flex-wrap gap-1.5">
                    @for (f of p.limits.features; track f) { <span class="rounded-pill bg-teal-washed px-2 py-0.5 text-[11px] text-primary">{{ featureLabel(f) }}</span> }
                  </div>
                  @if (current) { <p class="mt-2 text-[12px] font-bold text-primary">Es tu plan actual.</p> }
                  @else if (excess.length) { <p class="mt-2 text-[12px] text-danger">No alcanza: tienes {{ excess.join(' y ') }}.</p> }
                  @else if (cycleValue() === 'yearly' && saving(p) > 0) { <p class="mt-2 text-[12px] text-success">Ahorras {{ money(saving(p)) }} al año.</p> }
                </button>
              }
              @if (dropped().length) {
                <p class="rounded-card bg-warning-soft px-4 py-3 text-[12.5px] text-text-body">Se apagan {{ dropped().join(', ') }}: el plan nuevo no los incluye.</p>
              }
            </div>
            <div class="flex justify-end gap-2.5 border-t border-divider px-6 py-4">
              <app-button variant="tertiary" (pressed)="picking.set(false)">Cancelar</app-button>
              <app-button [disabled]="!chosenPlan()" [loading]="busy() === 'change'" (pressed)="change()">
                {{ chosenPlan() ? 'Cambiar y pagar ' + money(price(chosenPlan()!)) : 'Elige un plan' }}
              </app-button>
            </div>
          </div>
        }
      </app-drawer>
    } @else {
      <div class="grid grid-cols-1 gap-5 xl:grid-cols-2"><div class="skeleton h-[380px] !rounded-card"></div><div class="skeleton h-[380px] !rounded-card"></div></div>
    }
  `,
  styles: `
    .plan { border-color: var(--color-border-card); background: var(--color-surface); transition: border-color var(--dur-fast), box-shadow var(--dur-fast); }
    .plan:not(:disabled):hover { border-color: var(--color-secondary); }
    .plan.is-on { border-color: var(--color-primary); box-shadow: inset 0 0 0 1px var(--color-primary); }
    .plan:disabled { opacity: 0.62; cursor: default; }
  `,
})
export class BillingPanelComponent {
  private readonly api = inject(BillingApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly session = inject(SessionStore);

  protected readonly Math = Math;
  protected readonly data = signal<BillingOverview | null>(null);
  protected readonly invoices = signal<readonly Invoice[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);
  protected readonly picking = signal(false);
  protected readonly cycle = signal<string>('monthly');
  protected readonly chosen = signal<string | null>(null);
  protected readonly cycles = [
    { value: 'monthly', label: 'Mensual' },
    { value: 'yearly', label: 'Anual' },
  ];
  protected readonly money = (v: number) => gtq(v, 2);
  protected readonly featureLabel = (f: string) => FEATURE_LABEL[f] ?? f;
  protected readonly cycleValue = computed(() => this.cycle() as BillingCycle);
  protected readonly chosenPlan = computed(() => this.data()?.plans.find((p) => p.key === this.chosen()) ?? null);
  /** Banderas activas que el plan elegido no incluye (se apagan). */
  protected readonly dropped = computed(() => {
    const p = this.chosenPlan();
    const on = this.session.tenant()?.features ?? {};
    if (!p) return [];
    return Object.entries(on).filter(([k, v]) => v && !p.limits.features.includes(k)).map(([k]) => FEATURE_LABEL[k] ?? k);
  });
  protected readonly usage = computed(() => {
    const d = this.data();
    if (!d) return [];
    const l = d.subscription.limits;
    const row = (label: string, used: number, max: number | null) => ({ label, used, max, text: max === null ? `${used} · sin límite` : `${used} de ${max}` });
    return [
      row('Propiedades', d.usage.properties, l.max_properties),
      row('Personas con acceso', d.usage.users, l.max_users),
      { label: 'Fotos y documentos', used: d.usage.storage_bytes, max: null, text: bytesLabel(d.usage.storage_bytes) },
    ];
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.error.set(null);
    try {
      const [o, inv] = await Promise.all([this.api.overview(), this.api.invoices()]);
      this.data.set(o);
      this.invoices.set(inv);
      this.cycle.set(o.subscription.cycle);
    } catch (e) {
      this.error.set(toApiError(e).detail);
    }
  }

  protected tone(s: BillingOverview['subscription']['status']) {
    return STATUS_TONE[s];
  }
  protected label(s: BillingOverview['subscription']['status']) {
    return STATUS_LABEL[s];
  }
  protected invoiceTone(i: Invoice) {
    return i.status === 'open' && this.overdue(i) ? 'danger' : INVOICE_LABEL[i.status].tone;
  }
  protected invoiceLabel(i: Invoice) {
    return i.status === 'open' && this.overdue(i) ? 'Vencida' : INVOICE_LABEL[i.status].label;
  }
  protected overdue(i: Invoice): boolean {
    return new Date(i.due_at).getTime() < Date.now();
  }
  protected price(p: Plan): number {
    return priceOf(p, this.cycleValue());
  }
  protected saving(p: Plan): number {
    return yearlySaving(p);
  }
  protected over(p: Plan): string[] {
    const d = this.data();
    return d ? overLimits(p, d.usage) : [];
  }

  protected async pay(): Promise<void> {
    await this.run('pay', () => this.api.checkout());
  }

  protected async change(): Promise<void> {
    const p = this.chosenPlan();
    if (!p) return;
    const ok = await this.confirm.ask({
      title: `Cambiar a ${p.name}`,
      message: `Se cobra ${this.money(this.price(p))} (${this.cycleValue() === 'yearly' ? 'anual' : 'mensual'}) desde hoy y se anula lo pendiente.${this.dropped().length ? ` Se apagan ${this.dropped().join(', ')}.` : ''}`,
      confirmLabel: 'Cambiar y pagar',
    });
    if (!ok) return;
    if (await this.run('change', () => this.api.checkout({ plan_key: p.key, cycle: this.cycleValue() }))) {
      this.picking.set(false);
      this.chosen.set(null);
    }
  }

  private async run(kind: string, fn: () => ReturnType<BillingApi['checkout']>): Promise<boolean> {
    this.busy.set(kind);
    try {
      const r = await fn();
      if (r.status === 'redirect' && r.redirect_url) {
        window.location.assign(r.redirect_url);
        return true;
      }
      this.data.set(r.overview);
      this.invoices.set(await this.api.invoices());
      if (r.status === 'succeeded') {
        this.toast.success(r.message);
        void this.session.reload();
        return true;
      }
      this.toast.error(r.message);
      return false;
    } catch (e) {
      this.toast.error(toApiError(e).detail);
      return false;
    } finally {
      this.busy.set(null);
    }
  }

  protected async cancel(): Promise<void> {
    const s = this.data()?.subscription;
    if (!s) return;
    const ok = await this.confirm.ask({
      title: 'Cancelar la suscripción',
      message: `Sigues operando hasta el ${new Date(s.current_period_end).toLocaleDateString('es-GT', { day: 'numeric', month: 'long' })}. Después la empresa queda en solo lectura: nadie pierde datos y puedes volver eligiendo un plan.`,
      confirmLabel: 'Cancelar al terminar',
      cancelLabel: 'Seguir con el plan',
      tone: 'danger',
    });
    if (!ok) return;
    await this.simple('cancel', () => this.api.cancel(), 'Listo: la suscripción termina al cierre del período.');
  }

  protected async resume(): Promise<void> {
    await this.simple('resume', () => this.api.resume(), 'Seguimos: la suscripción se renueva como siempre.');
  }

  private async simple(kind: string, fn: () => Promise<BillingOverview>, done: string): Promise<void> {
    this.busy.set(kind);
    try {
      this.data.set(await fn());
      this.toast.success(done);
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    } finally {
      this.busy.set(null);
    }
  }

  protected async pdf(inv: Invoice): Promise<void> {
    this.busy.set('pdf:' + inv.id);
    try {
      const f = await this.api.invoicePdf(inv);
      downloadBlob(f.name, f.blob);
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    } finally {
      this.busy.set(null);
    }
  }
}
