import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { BillingApi } from '../../../billing/services/billing-api.service';
import { ALL_FEATURES, FEATURE_LABEL, Plan, PlanDraft } from '../../../billing/models/billing.model';
import { toApiError } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/services/toast.service';
import { gtq } from '../../../../shared/utils/time';
import { plural } from '../../../../shared/utils/plural';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';

/**
 * Screen · Planes de la plataforma (W-P2): precio mensual y anual, límites
 * (propiedades, personas) y las funcionalidades que cada plan deja activar.
 * Desactivar un plan deja de ofrecerlo; quien ya lo tiene lo conserva.
 */
@Component({
  selector: 'app-platform-plans-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    BadgeComponent,
    ButtonComponent,
    CheckboxComponent,
    IconComponent,
    InputComponent,
    EmptyStateComponent,
    FormFieldComponent,
    DrawerComponent,
  ],
  template: `
    <app-page-header title="Planes" eyebrow="ARGOS" [subtitle]="subtitle()">
      <app-button (pressed)="open(null)"><app-icon name="plus" [size]="16" /> Nuevo plan</app-button>
    </app-page-header>

    @if (error(); as err) {
      <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="error" title="No pudimos cargar los planes" [message]="err" /></div>
    } @else if (plans(); as list) {
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        @for (p of list; track p.id; let i = $index) {
          <button type="button" class="pcard reveal flex flex-col rounded-card border border-border-card bg-surface p-5 text-left shadow-e1" [class.opacity-60]="!p.is_active" [style.--i]="i" (click)="open(p)">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="font-display text-[22px] font-semibold text-primary">{{ p.name }}</div>
                <div class="font-mono text-[11.5px] text-text-secondary">{{ p.key }}</div>
              </div>
              @if (!p.is_active) { <app-badge size="sm" tone="muted">No se ofrece</app-badge> }
            </div>
            <p class="mt-2 text-[12.5px] text-text-secondary">{{ p.description }}</p>
            <div class="mt-4 flex items-baseline gap-2">
              <span class="tabular font-display text-[24px] font-semibold text-primary">{{ money(p.price_monthly) }}</span>
              <span class="text-[12px] text-text-secondary">/mes · {{ money(p.price_yearly) }}/año</span>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div class="rounded-[8px] bg-surface-soft px-3 py-2"><div class="text-text-secondary">Propiedades</div><b class="text-primary">{{ limit(p.limits.max_properties) }}</b></div>
              <div class="rounded-[8px] bg-surface-soft px-3 py-2"><div class="text-text-secondary">Personas</div><b class="text-primary">{{ limit(p.limits.max_users) }}</b></div>
            </div>
            <div class="mt-3 flex flex-wrap gap-1.5">
              @for (f of p.limits.features; track f) { <span class="rounded-pill bg-teal-washed px-2 py-0.5 text-[11px] text-primary">{{ featureLabel(f) }}</span> }
            </div>
            <div class="mt-auto pt-4 text-[12px] text-text-secondary">{{ companies(p.subscribers) }}</div>
          </button>
        }
      </div>
    } @else {
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3"><div class="skeleton h-[300px] !rounded-card"></div><div class="skeleton h-[300px] !rounded-card"></div><div class="skeleton h-[300px] !rounded-card"></div></div>
    }

    <app-drawer [open]="editing() !== undefined" (openChange)="$event || editing.set(undefined)" [label]="editing() ? 'Editar plan' : 'Nuevo plan'" [width]="520">
      @if (editing() !== undefined) {
        <form class="flex h-full flex-col" novalidate (submit)="$event.preventDefault(); save()">
          <div class="border-b border-divider px-6 py-5">
            <h2 class="font-display text-[20px] font-semibold text-primary">{{ editing() ? editing()!.name : 'Nuevo plan' }}</h2>
            <p class="mt-1 text-[12.5px] text-text-secondary">Los límites nuevos aplican desde la siguiente alta o invitación; no le quitan nada a quien ya tiene el plan.</p>
          </div>
          <div class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            @if (!editing()) {
              <app-form-field label="Clave" for="pl-key" hint="Minúsculas, números y guion bajo. No cambia después." [error]="field('key')">
                <app-input inputId="pl-key" placeholder="operacion_plus" [value]="fKey()" (valueChange)="fKey.set($event)" />
              </app-form-field>
            }
            <app-form-field label="Nombre" for="pl-name" [error]="field('name')">
              <app-input inputId="pl-name" placeholder="Operación Plus" [value]="fName()" (valueChange)="fName.set($event)" />
            </app-form-field>
            <app-form-field label="Descripción" for="pl-desc" [optional]="true">
              <app-input inputId="pl-desc" placeholder="Para quién es, en una línea" [value]="fDesc()" (valueChange)="fDesc.set($event)" />
            </app-form-field>
            <div class="grid grid-cols-2 gap-3">
              <app-form-field label="Precio mensual (Q)" for="pl-m" [error]="field('price_monthly')"><app-input inputId="pl-m" type="number" [value]="fMonthly()" (valueChange)="fMonthly.set($event)" /></app-form-field>
              <app-form-field label="Precio anual (Q)" for="pl-y" [error]="field('price_yearly')"><app-input inputId="pl-y" type="number" [value]="fYearly()" (valueChange)="fYearly.set($event)" /></app-form-field>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <app-form-field label="Máx. propiedades" for="pl-p" hint="Vacío = sin límite"><app-input inputId="pl-p" type="number" [value]="fProps()" (valueChange)="fProps.set($event)" /></app-form-field>
              <app-form-field label="Máx. personas" for="pl-u" hint="Vacío = sin límite"><app-input inputId="pl-u" type="number" [value]="fUsers()" (valueChange)="fUsers.set($event)" /></app-form-field>
            </div>
            <fieldset>
              <legend class="mb-2 text-[12.5px] font-bold text-primary">Funcionalidades incluidas</legend>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                @for (f of features; track f) {
                  <app-checkbox [checked]="fFeatures().includes(f)" (checkedChange)="toggle(f, $event)">{{ featureLabel(f) }}</app-checkbox>
                }
              </div>
            </fieldset>
            @if (editing()) {
              <app-checkbox [checked]="fActive()" (checkedChange)="fActive.set($event)">Se ofrece a las empresas</app-checkbox>
            }
            @if (formError(); as e) { <p class="text-[12.5px] text-danger">{{ e }}</p> }
          </div>
          <div class="flex justify-end gap-2.5 border-t border-divider px-6 py-4">
            <app-button variant="tertiary" (pressed)="editing.set(undefined)">Cancelar</app-button>
            <app-button type="submit" [loading]="busy()">{{ editing() ? 'Guardar' : 'Crear plan' }}</app-button>
          </div>
        </form>
      }
    </app-drawer>
  `,
  styles: `
    .pcard { transition: border-color var(--dur-fast), transform var(--dur-fast); }
    .pcard:hover { border-color: var(--color-secondary); transform: translateY(-1px); }
    @media (prefers-reduced-motion: reduce) { .pcard:hover { transform: none; } }
  `,
})
export class PlatformPlansComponent {
  private readonly api = inject(BillingApi);
  private readonly toast = inject(ToastService);

  protected readonly plans = signal<readonly Plan[] | null>(null);
  protected readonly error = signal<string | null>(null);
  /** undefined = cerrado; null = nuevo; Plan = editar. */
  protected readonly editing = signal<Plan | null | undefined>(undefined);
  protected readonly busy = signal(false);
  protected readonly fields = signal<Record<string, string>>({});
  protected readonly formError = signal<string | null>(null);
  protected readonly fKey = signal('');
  protected readonly fName = signal('');
  protected readonly fDesc = signal('');
  protected readonly fMonthly = signal('');
  protected readonly fYearly = signal('');
  protected readonly fProps = signal('');
  protected readonly fUsers = signal('');
  protected readonly fFeatures = signal<string[]>([]);
  protected readonly fActive = signal(true);
  protected readonly features = ALL_FEATURES;
  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly featureLabel = (f: string) => FEATURE_LABEL[f] ?? f;
  protected readonly limit = (n: number | null) => (n === null ? 'Sin límite' : String(n));
  protected readonly companies = (n: number) => (n ? plural(n, 'empresa lo usa', 'empresas lo usan') : 'Ninguna empresa lo usa');
  protected readonly subtitle = computed(() => {
    const l = this.plans();
    return l ? `${plural(l.filter((p) => p.is_active).length, 'plan a la venta', 'planes a la venta')} · precios con IVA incluido` : 'Precios, límites y funcionalidades';
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.plans.set(await this.api.plans());
    } catch (e) {
      this.error.set(toApiError(e).detail);
    }
  }

  protected field(name: string): string | null {
    return this.fields()[name] ?? null;
  }

  protected open(p: Plan | null): void {
    this.fields.set({});
    this.formError.set(null);
    this.fKey.set('');
    this.fName.set(p?.name ?? '');
    this.fDesc.set(p?.description ?? '');
    this.fMonthly.set(p ? String(p.price_monthly) : '');
    this.fYearly.set(p ? String(p.price_yearly) : '');
    this.fProps.set(p?.limits.max_properties === null || !p ? '' : String(p.limits.max_properties));
    this.fUsers.set(p?.limits.max_users === null || !p ? '' : String(p.limits.max_users));
    this.fFeatures.set([...(p?.limits.features ?? ['reservations'])]);
    this.fActive.set(p?.is_active ?? true);
    this.editing.set(p);
  }

  protected toggle(f: string, on: boolean): void {
    this.fFeatures.update((l) => (on ? [...l.filter((x) => x !== f), f] : l.filter((x) => x !== f)));
  }

  protected async save(): Promise<void> {
    const errors: Record<string, string> = {};
    const p = this.editing();
    const monthly = Number(this.fMonthly());
    const yearly = Number(this.fYearly());
    if (!p && !/^[a-z0-9_]{2,32}$/.test(this.fKey().trim())) errors['key'] = 'Minúsculas, números y guion bajo (2 a 32).';
    if (this.fName().trim().length < 2) errors['name'] = 'Ponle un nombre.';
    if (this.fMonthly() === '' || !(monthly >= 0)) errors['price_monthly'] = 'Escribe el precio.';
    if (this.fYearly() === '' || !(yearly >= 0)) errors['price_yearly'] = 'Escribe el precio.';
    this.fields.set(errors);
    if (Object.keys(errors).length) return;
    const num = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v))));
    const draft: PlanDraft = {
      name: this.fName().trim(), description: this.fDesc().trim(), price_monthly: monthly, price_yearly: yearly,
      limits: { max_properties: num(this.fProps()), max_users: num(this.fUsers()), features: this.fFeatures() },
      ...(p ? { is_active: this.fActive() } : {}),
    };
    this.busy.set(true);
    try {
      const saved = p ? await this.api.updatePlan(p.id, draft) : await this.api.createPlan({ ...draft, key: this.fKey().trim() });
      this.plans.update((l) => (p ? (l ?? []).map((x) => (x.id === saved.id ? saved : x)) : [...(l ?? []), saved]));
      this.toast.success(p ? `Guardamos ${saved.name}.` : `Creaste el plan ${saved.name}.`);
      this.editing.set(undefined);
    } catch (e) {
      const err = toApiError(e);
      const f: Record<string, string> = {};
      for (const x of err.errors) f[x.location.replace(/^body\./, '').split('.')[0]] = x.message;
      this.fields.set(f);
      if (!err.errors.length) this.formError.set(err.detail);
    } finally {
      this.busy.set(false);
    }
  }
}
