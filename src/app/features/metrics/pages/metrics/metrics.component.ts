import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { MetricsStore } from '../../store/metrics.store';
import { Incentive, MetricsRange, PersonMetrics } from '../../services/metrics-api.service';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { TabsComponent } from '../../../../shared/molecules/tabs/tabs.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { StatTileComponent } from '../../../../shared/molecules/stat-tile/stat-tile.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { BarChartComponent, ChartDatum } from '../../../../shared/molecules/bar-chart/bar-chart.component';
import { CellDefDirective, DataTableComponent, TableColumn } from '../../../../shared/organisms/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { downloadCsv } from '../../../../shared/utils/csv';
import { dayKey, gtq } from '../../../../shared/utils/time';

/**
 * Screen · Métricas (W-K1 tablero por período, W-K2 metas e incentivos).
 * Como el panel de Stripe: selector de período arriba, cifras clave, un
 * gráfico de una sola serie y la tabla que explica el número.
 */
@Component({
  selector: 'app-metrics-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    DemoDataNoteComponent,
    TabsComponent,
    SegmentedComponent,
    StatTileComponent,
    EmptyStateComponent,
    BarChartComponent,
    DataTableComponent,
    CellDefDirective,
    ButtonComponent,
    IconComponent,
    AvatarComponent,
    BadgeComponent,
    CheckboxComponent,
  ],
  providers: [MetricsStore],
  template: `
    @let t = store.totals();
    <app-page-header title="Métricas" eyebrow="Equipo" [subtitle]="store.loading() ? 'Calculando…' : t.cleanings + ' limpiezas · ' + t.onTime + ' % a tiempo en ' + rangeLabel()">
      @if (tab() === 'tablero') {
        <app-segmented [options]="ranges" [value]="range()" (valueChange)="go({ periodo: $event === '30d' ? null : $event })" ariaLabel="Período" />
        @if (store.canExport()) {
          <app-button variant="tertiary" (pressed)="exportCsv()"><app-icon name="arrow-up-right" [size]="16" /> Exportar</app-button>
        }
      }
    </app-page-header>
    <app-demo-data-note module="metrics" label="Métricas" />

    @if (store.error(); as err) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="error" title="No pudimos calcular las métricas" [message]="err">
          <app-button variant="secondary" (pressed)="store.load(range())"><app-icon name="refresh" [size]="16" /> Reintentar</app-button>
        </app-empty-state>
      </div>
    } @else {
      <app-tabs [options]="tabs()" [value]="tab()" (valueChange)="go({ tab: $event === 'tablero' ? null : $event })" ariaLabel="Secciones de métricas" />
      <div class="mt-5">
        @if (store.loading()) {
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">@for (i of [0, 1, 2, 3]; track i) { <div class="skeleton h-[130px] !rounded-card"></div> }</div>
          <div class="skeleton mt-5 h-[300px] !rounded-card"></div>
        } @else if (tab() === 'tablero') {
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <app-stat-tile class="reveal" style="--i: 1" label="Limpiezas" [value]="t.cleanings" icon="broom" tone="primary" note="Finalizadas y validadas" />
            <app-stat-tile class="reveal" style="--i: 2" label="A tiempo" [value]="t.onTime" icon="clock" tone="success" note="% dentro de la ventana" />
            <app-stat-tile class="reveal" style="--i: 3" label="Duración media" [value]="t.avg" icon="itinerary" tone="gold" note="Minutos por limpieza" />
            <app-stat-tile class="reveal" style="--i: 4" label="Retrasos" [value]="t.late" icon="alert-triangle" tone="warning" note="Terminaron fuera de ventana" />
          </div>
          <div class="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
            <section class="rounded-card border border-border-card bg-surface p-5 shadow-e1">
              <h2 class="text-[13px] font-bold text-primary">Limpiezas por día</h2>
              <p class="mb-4 text-[12px] text-text-secondary">El día de hoy va en dorado.</p>
              <app-bar-chart [data]="perDay()" [height]="230" [showHighlightValue]="true" ariaLabel="Limpiezas por día" />
            </section>
            <section class="rounded-card border border-border-card bg-surface p-5 shadow-e1">
              <h2 class="text-[13px] font-bold text-primary">Duración media por propiedad</h2>
              <p class="mb-4 text-[12px] text-text-secondary">Minutos; la más lenta en dorado.</p>
              <app-bar-chart [data]="byProperty()" [horizontal]="true" [format]="mins" ariaLabel="Minutos promedio por propiedad" />
            </section>
          </div>
          <h2 class="mb-3 mt-7 font-display text-[20px] font-semibold text-primary">Ranking del equipo</h2>
          <app-data-table [columns]="cols" [rows]="ranking()" [rowKey]="key">
            <ng-template appCell="name" let-p>
              <div class="flex items-center gap-2.5">
                <span class="tabular w-5 text-right text-[12px] font-bold text-text-muted">{{ rankOf(p) }}</span>
                <app-avatar [initials]="p.name.slice(0, 1)" [name]="p.name" [size]="30" />
                <div class="min-w-0"><div class="truncate text-[13px] font-bold text-primary">{{ p.name }}</div><div class="truncate text-[11.5px] text-text-secondary">{{ p.role }}</div></div>
              </div>
            </ng-template>
            <ng-template appCell="on_time" let-p>
              <div class="flex items-center justify-end gap-2.5">
                <span class="hidden h-[5px] w-20 overflow-hidden rounded-pill bg-track sm:block"><span class="block h-full rounded-pill" [class]="p.on_time >= 95 ? 'bg-success' : p.on_time >= 88 ? 'bg-teal-muted' : 'bg-warning'" [style.width.%]="p.on_time"></span></span>
                <span class="tabular w-10 text-right font-bold text-primary">{{ p.on_time }}%</span>
              </div>
            </ng-template>
            <ng-template appCell="avg" let-p><span class="tabular">{{ p.avg_minutes }} min</span></ng-template>
            <ng-template appCell="late" let-p><span class="tabular" [class.text-warning]="p.late > 2" [class.font-bold]="p.late > 2">{{ p.late }}</span></ng-template>
          </app-data-table>
        } @else {
          <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section>
              <h2 class="mb-3 font-display text-[20px] font-semibold text-primary">Metas del mes</h2>
              <div class="space-y-3">
                @for (g of store.goals(); track g.id; let i = $index) {
                  @let pct = goalPct(g.current, g.target, g.unit);
                  <article class="reveal rounded-card border border-border-card bg-surface p-4 shadow-e1" [style.--i]="i">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="text-[14px] font-bold text-primary">{{ g.title }}</div>
                        <div class="text-[12px] text-text-secondary">{{ g.scope }} · premio: {{ g.reward }}</div>
                      </div>
                      <span class="tabular shrink-0 font-display text-[20px] font-semibold text-primary">{{ g.current }}<span class="text-[13px] text-text-secondary">/{{ g.target }}{{ g.unit === '%' ? '%' : '' }}</span></span>
                    </div>
                    <div class="mt-3 h-[6px] overflow-hidden rounded-pill bg-track"><div class="h-full rounded-pill" [class]="pct >= 100 ? 'bg-success' : pct >= 70 ? 'bg-teal-muted' : 'bg-warning'" [style.width.%]="pct"></div></div>
                    @if (pct >= 100) { <p class="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-success"><app-icon name="check-circle" [size]="14" /> Meta cumplida</p> }
                  </article>
                }
              </div>
            </section>
            <section>
              <div class="mb-3 flex items-center justify-between gap-3">
                <h2 class="font-display text-[20px] font-semibold text-primary">Incentivos por aprobar</h2>
                @if (store.canApprove() && selected().size) {
                  <div class="flex gap-2">
                    <app-button variant="ghost" size="sm" [disabled]="store.busy()" (pressed)="decide('rejected')">Rechazar</app-button>
                    <app-button variant="primary" size="sm" [loading]="store.busy()" (pressed)="decide('approved')">Aprobar {{ selected().size }}</app-button>
                  </div>
                }
              </div>
              <div class="rounded-card border border-border-card bg-surface shadow-e1">
                @if (pending().length && store.canApprove()) {
                  <div class="border-b border-divider px-4 py-3"><app-checkbox [checked]="allSelected()" (checkedChange)="toggleAll($event)">Seleccionar todos ({{ pending().length }})</app-checkbox></div>
                }
                <ul class="divide-y divide-divider">
                  @for (inc of store.incentives(); track inc.id) {
                    <li class="flex items-center gap-3 px-4 py-3">
                      @if (inc.status === 'pending' && store.canApprove()) {
                        <app-checkbox [checked]="selected().has(inc.id)" (checkedChange)="toggle(inc.id, $event)"><span class="sr-only">Seleccionar</span></app-checkbox>
                      }
                      <app-avatar [initials]="inc.person_name.slice(0, 1)" [name]="inc.person_name" [size]="30" />
                      <div class="min-w-0 flex-1">
                        <div class="truncate text-[13px] font-bold text-primary">{{ inc.person_name }}</div>
                        <div class="truncate text-[12px] text-text-secondary">{{ inc.goal_title }}</div>
                      </div>
                      <span class="tabular text-[13px] font-bold text-primary">{{ money(inc.amount) }}</span>
                      @if (inc.status !== 'pending') {
                        <app-badge size="sm" [tone]="inc.status === 'approved' ? 'success' : 'muted'">{{ inc.status === 'approved' ? 'Aprobado' : 'Rechazado' }}</app-badge>
                      }
                    </li>
                  }
                </ul>
              </div>
            </section>
          </div>
        }
      </div>
    }
  `,
})
export class MetricsComponent {
  protected readonly store = inject(MetricsStore);
  private readonly router = inject(Router);

  readonly tab = input<string, string | undefined>('tablero', { transform: (v) => v || 'tablero' });
  readonly periodo = input<string | undefined>();

  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly mins = (v: number) => `${v} min`;
  protected readonly ranges = [
    { value: '7d', label: '7 días' },
    { value: '30d', label: '30 días' },
    { value: 'month', label: 'Este mes' },
  ];
  protected readonly range = computed<MetricsRange>(() => (this.periodo() === '7d' || this.periodo() === 'month' ? this.periodo() as MetricsRange : '30d'));
  protected readonly rangeLabel = computed(() => ({ '7d': 'los últimos 7 días', '30d': 'los últimos 30 días', month: 'este mes' })[this.range()]);
  protected readonly tabs = computed(() => [
    { value: 'tablero', label: 'Tablero' },
    { value: 'metas', label: 'Metas e incentivos', count: this.pending().length || null, attention: true },
  ]);
  protected readonly perDay = computed<ChartDatum[]>(() => {
    const today = dayKey();
    const days = this.store.board()?.per_day ?? [];
    return days.map((d) => ({ label: days.length > 14 ? d.date.slice(8).replace(/^0/, '') : d.date.slice(8), value: d.count, highlight: d.date === today }));
  });
  protected readonly byProperty = computed<ChartDatum[]>(() => {
    const list = [...(this.store.board()?.properties ?? [])].sort((a, b) => b.avg_minutes - a.avg_minutes);
    return list.map((p, i) => ({ label: p.code, value: p.avg_minutes, highlight: i === 0 }));
  });
  protected readonly ranking = computed(() => [...(this.store.board()?.people ?? [])].sort((a, b) => b.cleanings * b.on_time - a.cleanings * a.on_time));
  protected readonly cols: TableColumn<PersonMetrics>[] = [
    { key: 'name', label: 'Colaborador', sortable: true, value: (p) => p.name },
    { key: 'cleanings', label: 'Limpiezas', sortable: true, align: 'right', value: (p) => p.cleanings },
    { key: 'on_time', label: 'A tiempo', sortable: true, align: 'right', value: (p) => p.on_time },
    { key: 'avg', label: 'Duración', sortable: true, align: 'right', priority: 'md', value: (p) => p.avg_minutes },
    { key: 'late', label: 'Retrasos', sortable: true, align: 'right', priority: 'md', value: (p) => p.late },
    { key: 'returned', label: 'Devueltas', sortable: true, align: 'right', priority: 'lg', value: (p) => p.returned },
  ];
  protected readonly key = (p: PersonMetrics) => p.id;

  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly pending = computed(() => this.store.incentives().filter((i: Incentive) => i.status === 'pending'));
  protected readonly allSelected = computed(() => this.pending().length > 0 && this.pending().every((i) => this.selected().has(i.id)));

  constructor() {
    effect(() => {
      const r = this.range();
      untracked(() => void this.store.load(r));
    });
  }

  protected go(params: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected rankOf(p: PersonMetrics): number {
    return this.ranking().indexOf(p) + 1;
  }

  protected goalPct(current: number, target: number, unit: string): number {
    if (unit.includes('máx')) return current <= target ? 100 : Math.max(0, Math.round((target / current) * 100));
    return Math.min(100, Math.round((current / Math.max(1, target)) * 100));
  }

  protected toggle(id: string, on: boolean): void {
    this.selected.update((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  protected toggleAll(on: boolean): void {
    this.selected.set(on ? new Set(this.pending().map((i) => i.id)) : new Set());
  }

  protected async decide(status: 'approved' | 'rejected'): Promise<void> {
    if (await this.store.decide([...this.selected()], status)) this.selected.set(new Set());
  }

  protected exportCsv(): void {
    downloadCsv(
      `metricas-${this.range()}.csv`,
      ['Colaborador', 'Rol', 'Limpiezas', 'A tiempo (%)', 'Duración media (min)', 'Retrasos', 'Devueltas'],
      this.ranking().map((p) => [p.name, p.role, p.cleanings, p.on_time, p.avg_minutes, p.late, p.returned]),
    );
  }
}
