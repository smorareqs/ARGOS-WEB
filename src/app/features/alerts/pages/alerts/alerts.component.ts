import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AlertsStore } from '../../store/alerts.store';
import { Alert, AlertType, Severity, alertLink } from '../../services/alerts-api.service';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { FilterChipsComponent } from '../../../../shared/molecules/filter-chips/filter-chips.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { BadgeComponent, BadgeTone } from '../../../../shared/atoms/badge/badge.component';
import { SpotIconComponent, SpotIconName } from '../../../../shared/atoms/spot-icon/spot-icon.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';
import { plural } from '../../../../shared/utils/plural';

const TYPES: Record<AlertType, { label: string; spot: SpotIconName }> = {
  asset_failure: { label: 'Activos con falla', spot: 'maintenance' },
  maintenance_overdue: { label: 'Preventivos vencidos', spot: 'compliance' },
  task_late: { label: 'Tareas retrasadas', spot: 'cleaning' },
  low_stock: { label: 'Stock bajo', spot: 'inventory' },
  discrepancy_open: { label: 'Discrepancias', spot: 'evidence' },
  checkout_alarm_unattended: { label: 'Check-out sin atender', spot: 'arrivals' },
};

const SEV: Record<Severity, { label: string; tone: BadgeTone; color: string; rank: number }> = {
  high: { label: 'Alta', tone: 'danger', color: 'var(--color-danger)', rank: 0 },
  medium: { label: 'Media', tone: 'warning', color: 'var(--color-warning)', rank: 1 },
  low: { label: 'Baja', tone: 'muted', color: 'var(--color-text-muted)', rank: 2 },
};

/**
 * Screen · Alertas (W-L1): tarjetas por tipo con contador y severidad más
 * alta (ilustración propia, no ícono de librería), lista filtrable y
 * acciones Reconocer, Resolver y Ver (lleva a la entidad). Datos de la API
 * real (fase 3): las tareas e inventario las levanta el módulo de Persona B.
 */
@Component({
  selector: 'app-alerts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    DemoDataNoteComponent,
    FilterChipsComponent,
    SegmentedComponent,
    EmptyStateComponent,
    ButtonComponent,
    IconComponent,
    BadgeComponent,
    SpotIconComponent,
    RelativeDatePipe,
  ],
  providers: [AlertsStore],
  template: `
    <app-page-header title="Alertas" eyebrow="Control" [subtitle]="store.loading() ? 'Revisando…' : subtitle()" />
    <app-demo-data-note module="alerts" label="Alertas" />

    @if (store.error(); as err) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="error" title="No pudimos cargar las alertas" [message]="err">
          <app-button variant="secondary" (pressed)="store.load()"><app-icon name="refresh" [size]="16" /> Reintentar</app-button>
        </app-empty-state>
      </div>
    } @else {
      <div class="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        @for (t of typeCards(); track t.type; let i = $index) {
          <button type="button" class="tcard reveal flex flex-col items-start rounded-card border bg-surface p-3.5 text-left shadow-e1" [class.is-on]="tipo() === t.type" [style.--i]="i" [style.--sev]="t.color" (click)="go({ tipo: tipo() === t.type ? null : t.type })">
            <app-spot-icon [name]="t.spot" [size]="44" />
            <span class="mt-3 text-[12px] leading-tight text-text-body">{{ t.label }}</span>
            <span class="mt-1 flex items-baseline gap-1.5">
              <span class="tabular font-display text-[26px] font-semibold leading-none text-primary">{{ t.open }}</span>
              @if (t.open) { <span class="h-2 w-2 rounded-pill" [style.background]="t.color" [attr.aria-label]="'Severidad máxima ' + t.sevLabel"></span> }
            </span>
          </button>
        }
      </div>

      <div class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <app-filter-chips [options]="sevChips()" [value]="sev() ?? 'all'" (valueChange)="go({ sev: $event === 'all' ? null : $event })" ariaLabel="Severidad" />
        <app-segmented [options]="statusOptions" [value]="estado() ?? 'open'" (valueChange)="go({ estado: $event === 'open' ? null : $event })" [compact]="true" ariaLabel="Estado" />
      </div>

      <div class="mt-4 space-y-2.5">
        @if (store.loading()) {
          @for (i of [0, 1, 2, 3]; track i) { <div class="skeleton h-[88px] !rounded-card"></div> }
        } @else {
          @for (a of list(); track a.id; let i = $index) {
            <article class="arow reveal flex flex-col gap-3 rounded-card border border-border-card bg-surface py-4 pl-5 pr-4 shadow-e1 md:flex-row md:items-center" [style.--i]="i" [style.--sev]="sevColor(a)" [class.is-done]="a.status === 'resolved'">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <app-badge size="sm" [tone]="sevTone(a)">{{ sevLabel(a) }}</app-badge>
                  <span class="text-[11.5px] text-text-secondary">{{ typeLabel(a) }}@if (a.property_code) { · <span class="font-mono">{{ a.property_code }}</span> } · {{ a.created_at | relativeDate }}</span>
                  @if (a.status === 'acknowledged') { <app-badge size="sm" tone="neutral" icon="eye">Reconocida por {{ a.acknowledged_by_name }}</app-badge> }
                </div>
                <h3 class="mt-1.5 text-[14.5px] font-bold text-primary">{{ a.message }}</h3>
                @if (a.status === 'resolved') {
                  <p class="mt-0.5 text-[12.5px] text-text-secondary">{{ a.resolved_by_name ? 'La resolvió ' + a.resolved_by_name : 'Se resolvió sola cuando se corrigió la causa' }} · {{ a.resolved_at | relativeDate }}</p>
                } @else if (a.property_name) {
                  <p class="mt-0.5 text-[12.5px] text-text-secondary">{{ a.property_name }}</p>
                }
              </div>
              <div class="flex shrink-0 flex-wrap gap-2">
                <app-button variant="ghost" size="sm" (pressed)="open(a)">Ver <app-icon name="arrow-right" [size]="14" /></app-button>
                @if (store.canManage() && a.status === 'active') {
                  <app-button variant="tertiary" size="sm" [disabled]="store.busy() === a.id" (pressed)="store.acknowledge(a)">Reconocer</app-button>
                }
                @if (store.canManage() && a.status !== 'resolved') {
                  <app-button variant="secondary" size="sm" [disabled]="store.busy() === a.id" (pressed)="store.resolve(a)"><app-icon name="check" [size]="15" /> Resolver</app-button>
                }
              </div>
            </article>
          } @empty {
            <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="done" title="Nada pendiente aquí" message="Cuando algo necesite tu atención, aparece en esta lista y en la campana." /></div>
          }
        }
      </div>
    }
  `,
  styles: `
    .tcard { border-color: var(--color-border-card); transition: border-color var(--dur-fast), box-shadow var(--dur-fast), transform var(--spring-snappy-dur) var(--spring-snappy); }
    .tcard:hover { box-shadow: var(--shadow-e2); transform: translateY(-2px); }
    .tcard.is-on { border-color: var(--color-primary); box-shadow: 0 0 0 1px var(--color-primary), var(--shadow-e2); }
    .arow { position: relative; overflow: hidden; }
    .arow::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--sev); }
    .arow.is-done { opacity: 0.6; }
  `,
})
export class AlertsComponent {
  protected readonly store = inject(AlertsStore);
  private readonly router = inject(Router);

  readonly tipo = input<string | undefined>();
  readonly sev = input<string | undefined>();
  readonly estado = input<string | undefined>();

  protected readonly statusOptions = [
    { value: 'open', label: 'Pendientes' },
    { value: 'resolved', label: 'Resueltas' },
    { value: 'all', label: 'Todas' },
  ];

  protected readonly subtitle = computed(() => {
    const open = this.store.open();
    const high = open.filter((a) => a.severity === 'high').length;
    return `${plural(open.length, 'alerta pendiente', 'alertas pendientes')} · ${plural(high, 'alta', 'altas')} · ${plural(open.filter((a) => a.status === 'active').length, 'sin reconocer', 'sin reconocer')}`;
  });
  protected readonly typeCards = computed(() =>
    (Object.keys(TYPES) as AlertType[]).map((type) => {
      const open = this.store.open().filter((a) => a.type === type);
      const top = open.map((a) => a.severity).sort((x, y) => SEV[x].rank - SEV[y].rank)[0];
      return { type, ...TYPES[type], open: open.length, color: top ? SEV[top].color : 'transparent', sevLabel: top ? SEV[top].label : '' };
    }),
  );
  private readonly byStatus = computed(() => {
    const e = this.estado() ?? 'open';
    return this.store.items().filter((a) => (e === 'all' ? true : e === 'resolved' ? a.status === 'resolved' : a.status !== 'resolved') && (!this.tipo() || a.type === this.tipo()));
  });
  protected readonly sevChips = computed(() => [
    { value: 'all', label: 'Todas', count: this.byStatus().length },
    ...(Object.keys(SEV) as Severity[]).map((s) => ({ value: s, label: SEV[s].label, dot: SEV[s].color, count: this.byStatus().filter((a) => a.severity === s).length })),
  ]);
  protected readonly list = computed(() =>
    this.byStatus()
      .filter((a) => !this.sev() || a.severity === this.sev())
      .sort((a, b) => SEV[a.severity].rank - SEV[b.severity].rank || b.created_at.localeCompare(a.created_at)),
  );

  constructor() {
    void this.store.load();
    effect(() => {
      if ((this.estado() ?? 'open') !== 'open') untracked(() => void this.store.loadResolved());
    });
  }

  protected go(params: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected open(a: Alert): void {
    const link = alertLink(a);
    void this.router.navigate([link.path], { queryParams: link.query });
  }

  protected sevLabel(a: Alert): string {
    return SEV[a.severity].label;
  }
  protected sevTone(a: Alert): BadgeTone {
    return SEV[a.severity].tone;
  }
  protected sevColor(a: Alert): string {
    return SEV[a.severity].color;
  }
  protected typeLabel(a: Alert): string {
    return TYPES[a.type].label;
  }
}
