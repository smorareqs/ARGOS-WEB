import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { MaintenanceStore } from '../../store/maintenance.store';
import { Asset, Plan, Vendor } from '../../models/maintenance.model';
import { TicketsPanelComponent } from '../../components/tickets-panel/tickets-panel.component';
import { TicketDetailComponent } from '../../components/ticket-detail/ticket-detail.component';
import { TicketFormComponent } from '../../components/ticket-form/ticket-form.component';
import { AssetsPanelComponent } from '../../components/assets-panel/assets-panel.component';
import { AssetDetailComponent } from '../../components/asset-detail/asset-detail.component';
import { AssetFormComponent } from '../../components/asset-form/asset-form.component';
import { PlansPanelComponent } from '../../components/plans-panel/plans-panel.component';
import { PlanFormComponent } from '../../components/plan-form/plan-form.component';
import { VendorDetailComponent, VendorsPanelComponent } from '../../components/vendors-panel/vendors-panel.component';
import { VendorFormComponent } from '../../components/vendor-form/vendor-form.component';
import { MetricsPanelComponent } from '../../components/metrics-panel/metrics-panel.component';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { TabsComponent } from '../../../../shared/molecules/tabs/tabs.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { SpinnerComponent } from '../../../../shared/atoms/spinner/spinner.component';
import { plural } from '../../../../shared/utils/plural';

type Tab = 'incidencias' | 'activos' | 'preventivos' | 'proveedores' | 'indicadores';
type Form = { kind: 'asset'; asset: Asset | null } | { kind: 'plan'; plan: Plan | null; assetId: string | null } | { kind: 'vendor'; vendor: Vendor | null };

/**
 * Screen · Mantenimiento (fase 3, API real): W-G1 incidencias (tablero o
 * tabla), W-G2 activos, W-G3 preventivos, W-G4 proveedores, W-G5
 * indicadores. Pestaña y fichas van en la URL (?tab=, ?ver=, ?activo=,
 * ?proveedor=, ?nueva=1) para enlazarlas desde alertas e Inicio.
 */
@Component({
  selector: 'app-maintenance-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TicketsPanelComponent, TicketDetailComponent, TicketFormComponent, AssetsPanelComponent, AssetDetailComponent, AssetFormComponent,
    PlansPanelComponent, PlanFormComponent, VendorsPanelComponent, VendorDetailComponent, VendorFormComponent, MetricsPanelComponent,
    PageHeaderComponent, DemoDataNoteComponent, TabsComponent, EmptyStateComponent, DrawerComponent, ButtonComponent, IconComponent, SpinnerComponent,
  ],
  providers: [MaintenanceStore],
  template: `
    <app-page-header title="Mantenimiento" eyebrow="Operación" [subtitle]="store.loading() ? 'Cargando mantenimiento…' : subtitle()">
      @switch (tab()) {
        @case ('activos') { @if (store.canManage()) { <app-button variant="primary" (pressed)="form.set({ kind: 'asset', asset: null })"><app-icon name="plus" [size]="17" /> Nuevo activo</app-button> } }
        @case ('preventivos') { @if (store.canManage()) { <app-button variant="primary" (pressed)="form.set({ kind: 'plan', plan: null, assetId: null })"><app-icon name="plus" [size]="17" /> Nuevo preventivo</app-button> } }
        @case ('proveedores') { @if (store.canManage()) { <app-button variant="primary" (pressed)="form.set({ kind: 'vendor', vendor: null })"><app-icon name="plus" [size]="17" /> Nuevo proveedor</app-button> } }
        @default { @if (store.canReport()) { <app-button variant="primary" (pressed)="set({ nueva: '1' })"><app-icon name="plus" [size]="17" /> Reportar incidencia</app-button> } }
      }
    </app-page-header>
    <app-demo-data-note module="maintenance" label="Mantenimiento" />

    @if (store.error(); as err) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="error" title="No pudimos cargar mantenimiento" [message]="err">
          <app-button variant="secondary" (pressed)="store.load()"><app-icon name="refresh" [size]="16" /> Reintentar</app-button>
        </app-empty-state>
      </div>
    } @else {
      <app-tabs [options]="tabs()" [value]="tab()" (valueChange)="set({ tab: $event === 'incidencias' ? null : $event })" ariaLabel="Secciones de mantenimiento" />
      <div class="mt-5">
        @switch (tab()) {
          @case ('activos') { <app-assets-panel [active]="activo() ?? null" (opened)="set({ activo: $event })" /> }
          @case ('preventivos') { <app-plans-panel (opened)="openPlan($event)" /> }
          @case ('proveedores') { <app-vendors-panel (opened)="set({ proveedor: $event })" /> }
          @case ('indicadores') { <app-metrics-panel /> }
          @default { <app-tickets-panel [view]="vista() === 'tabla' ? 'tabla' : 'tablero'" [active]="ver() ?? null" (viewChange)="set({ vista: $event === 'tabla' ? 'tabla' : null })" (opened)="set({ ver: $event })" /> }
        }
      </div>
    }

    <app-drawer [open]="!!ver()" (openChange)="!$event && set({ ver: null })" label="Incidencia" [width]="540">
      @if (store.ticket(); as t) {
        <app-ticket-detail [ticket]="t" />
      } @else if (ver()) {
        <div class="flex justify-center py-16"><app-spinner /></div>
      }
    </app-drawer>

    <app-drawer [open]="!!activo()" (openChange)="!$event && set({ activo: null })" label="Activo" [width]="540">
      @if (store.asset(); as a) {
        <app-asset-detail [asset]="a" (edit)="form.set({ kind: 'asset', asset: $event })" (newPlan)="form.set({ kind: 'plan', plan: null, assetId: $event })"
          (editPlan)="form.set({ kind: 'plan', plan: $event, assetId: $event.asset_id })" (openTicket)="set({ activo: null, ver: $event })"
          (report)="reportFrom($event)" />
      } @else if (activo()) {
        <div class="flex justify-center py-16"><app-spinner /></div>
      }
    </app-drawer>

    <app-drawer [open]="!!vendor()" (openChange)="!$event && set({ proveedor: null })" label="Proveedor" [width]="500">
      @if (vendor(); as v) {
        <app-vendor-detail [vendor]="v" (edit)="form.set({ kind: 'vendor', vendor: $event })" (openAsset)="set({ proveedor: null, activo: $event })" (openTicket)="set({ proveedor: null, ver: $event })" />
      }
    </app-drawer>

    <app-drawer [open]="!!nueva()" (openChange)="!$event && set({ nueva: null })" label="Reportar incidencia" [width]="500">
      @if (nueva()) {
        <app-ticket-form [propertyId]="preset().property" [assetId]="preset().asset" (cancel)="set({ nueva: null })" (created)="set({ nueva: null, ver: $event.id, tab: null })" />
      }
    </app-drawer>

    <app-drawer [open]="!!form()" (openChange)="!$event && form.set(null)" [label]="formLabel()" [width]="500">
      @if (form(); as f) {
        @switch (f.kind) {
          @case ('asset') { <app-asset-form [asset]="$any(f).asset" (cancel)="form.set(null)" (saved)="afterAsset($event)" /> }
          @case ('plan') { <app-plan-form [plan]="$any(f).plan" [assetId]="$any(f).assetId" (cancel)="form.set(null)" (saved)="form.set(null)" /> }
          @case ('vendor') { <app-vendor-form [vendor]="$any(f).vendor" (cancel)="form.set(null)" (saved)="form.set(null)" /> }
        }
      }
    </app-drawer>
  `,
})
export class MaintenanceComponent {
  protected readonly store = inject(MaintenanceStore);
  private readonly router = inject(Router);

  readonly tab = input<Tab, string | undefined>('incidencias', { transform: (v) => (['activos', 'preventivos', 'proveedores', 'indicadores'].includes(v ?? '') ? (v as Tab) : 'incidencias') });
  readonly vista = input<string | undefined>();
  readonly ver = input<string | undefined>();
  readonly activo = input<string | undefined>();
  readonly proveedor = input<string | undefined>();
  readonly nueva = input<string | undefined>();

  protected readonly form = signal<Form | null>(null);
  protected readonly preset = signal<{ property: string | null; asset: string | null }>({ property: null, asset: null });

  constructor() {
    void this.store.load();
    effect(() => {
      const id = this.ver();
      untracked(() => (id ? void this.store.openTicket(id) : this.store.closeTicket()));
    });
    effect(() => {
      const id = this.activo();
      untracked(() => (id ? void this.store.openAsset(id) : this.store.closeAsset()));
    });
    effect(() => {
      if (!this.nueva()) untracked(() => this.preset.set({ property: null, asset: null }));
    });
  }

  protected readonly vendor = computed(() => this.store.vendors().find((v) => v.id === this.proveedor()) ?? null);

  protected readonly tabs = computed(() => {
    const failing = this.store.assets().filter((a) => a.is_active && a.status !== 'operational').length;
    const unassigned = this.store.open().filter((t) => !t.assigned_to && !t.vendor_id).length;
    return [
      { value: 'incidencias', label: 'Incidencias', count: this.store.open().length, attention: unassigned > 0 },
      { value: 'activos', label: 'Activos', count: failing || null, attention: failing > 0 },
      { value: 'preventivos', label: 'Preventivos', count: this.store.overduePlans().length || null, attention: this.store.overduePlans().length > 0 },
      { value: 'proveedores', label: 'Proveedores' },
      { value: 'indicadores', label: 'Indicadores' },
    ];
  });

  protected readonly subtitle = computed(() => {
    const open = this.store.open();
    const parts = [plural(open.length, 'abierta', 'abiertas')];
    const unassigned = open.filter((t) => !t.assigned_to && !t.vendor_id).length;
    if (unassigned) parts.push(`${unassigned} sin responsable`);
    const overdue = this.store.overduePlans().length;
    if (overdue) parts.push(plural(overdue, 'preventivo vencido', 'preventivos vencidos'));
    return parts.join(' · ');
  });

  protected readonly formLabel = computed(() => {
    const f = this.form();
    return f?.kind === 'asset' ? 'Activo' : f?.kind === 'plan' ? 'Preventivo' : 'Proveedor';
  });

  protected set(q: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams: q, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected openPlan(p: Plan): void {
    if (this.store.canManage()) this.form.set({ kind: 'plan', plan: p, assetId: p.asset_id });
    else this.set({ activo: p.asset_id });
  }

  protected reportFrom(a: Asset): void {
    this.preset.set({ property: a.property_id, asset: a.id });
    this.set({ activo: null, nueva: '1' });
  }

  protected afterAsset(a: Asset): void {
    const editing = this.form()?.kind === 'asset' && !!(this.form() as { asset: Asset | null }).asset;
    this.form.set(null);
    if (!editing) this.set({ tab: 'activos', activo: a.id });
  }
}
