import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MaintenanceStore } from '../../store/maintenance.store';
import { CATEGORY_META } from '../../models/maintenance.model';
import { StatTileComponent } from '../../../../shared/molecules/stat-tile/stat-tile.component';
import { BarChartComponent, ChartDatum } from '../../../../shared/molecules/bar-chart/bar-chart.component';
import { LineChartComponent } from '../../../../shared/molecules/line-chart/line-chart.component';
import { gtq } from '../../../../shared/utils/time';
import { plural } from '../../../../shared/utils/plural';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * W-G5 · Indicadores: abiertas, urgentes, preventivos y gasto; dónde se
 * concentra el trabajo (barras), cuánto tarda resolver (línea mensual) y en
 * qué se gasta (barras por categoría). Una serie por gráfico, el dato a
 * mirar en dorado (skill dataviz).
 */
@Component({
  selector: 'app-metrics-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatTileComponent, BarChartComponent, LineChartComponent],
  template: `
    @if (store.metrics(); as m) {
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <app-stat-tile label="Abiertas" [value]="m.open" icon="maintenance" tone="danger" [note]="plural(m.urgent, 'urgente', 'urgentes') + ' · ' + plural(m.unassigned, 'sin responsable', 'sin responsable')" />
        <app-stat-tile label="Resuelven en" [value]="avg()" icon="clock" tone="gold" note="Horas promedio, últimos 90 días" />
        <app-stat-tile label="Gasto del mes (Q)" [value]="m.cost_month" icon="metrics" tone="primary" [note]="'Q ' + money(m.cost_year) + ' en el año'" />
        <app-stat-tile label="Preventivos vencidos" [value]="m.overdue_plans" icon="alert-triangle" tone="warning" [note]="plural(m.due_plans, 'toca pronto', 'tocan pronto')" />
      </div>
      <div class="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section class="rounded-card border border-border-card bg-surface p-5 shadow-e1">
          <h2 class="text-[13px] font-bold text-primary">Abiertas por lugar</h2>
          <p class="mb-4 text-[12px] text-text-secondary">Dónde se concentra el trabajo pendiente.</p>
          @if (byPlace().length) {
            <app-bar-chart [data]="byPlace()" [horizontal]="true" ariaLabel="Incidencias abiertas por propiedad o edificio" />
          } @else {
            <p class="py-10 text-center text-[12.5px] text-text-secondary">No hay incidencias abiertas.</p>
          }
        </section>
        <section class="rounded-card border border-border-card bg-surface p-5 shadow-e1">
          <h2 class="text-[13px] font-bold text-primary">Tiempo promedio de resolución</h2>
          <p class="mb-2 text-[12px] text-text-secondary">Horas desde el reporte hasta resolverla, por mes.</p>
          @if (resolution().length > 1) {
            <app-line-chart [data]="resolution()" [format]="hours" ariaLabel="Horas promedio de resolución por mes" />
          } @else {
            <p class="py-10 text-center text-[12.5px] text-text-secondary">Hace falta resolver incidencias en al menos dos meses para ver la tendencia.</p>
          }
        </section>
        <section class="rounded-card border border-border-card bg-surface p-5 shadow-e1 xl:col-span-2">
          <h2 class="text-[13px] font-bold text-primary">Gasto por categoría</h2>
          <p class="mb-4 text-[12px] text-text-secondary">Costo de las incidencias del año según el tipo de activo.</p>
          @if (byCategory().length) {
            <app-bar-chart [data]="byCategory()" [horizontal]="true" [format]="moneyQ" ariaLabel="Gasto por categoría en quetzales" />
          } @else {
            <p class="py-10 text-center text-[12.5px] text-text-secondary">Aún no hay costos registrados este año.</p>
          }
        </section>
      </div>
    } @else {
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        @for (i of [0, 1, 2, 3]; track i) { <div class="skeleton h-[136px] !rounded-card"></div> }
      </div>
      <div class="skeleton mt-5 h-[320px] !rounded-card"></div>
    }
  `,
})
export class MetricsPanelComponent {
  protected readonly store = inject(MaintenanceStore);
  protected readonly plural = plural;
  protected readonly money = (v: number) => gtq(v, 0).replace(/^Q\s?/, '');
  protected readonly moneyQ = (v: number) => gtq(v, 0);
  protected readonly hours = (v: number) => `${v} h`;

  constructor() {
    void this.store.loadMetrics();
  }

  protected readonly avg = computed(() => Math.round(this.store.metrics()?.avg_hours ?? 0));

  protected readonly byPlace = computed<ChartDatum[]>(() => {
    const list = this.store.metrics()?.open_by_place ?? [];
    return list.map((p, i) => ({ label: p.code ?? p.name, value: p.open, highlight: i === 0 }));
  });

  protected readonly resolution = computed<ChartDatum[]>(() =>
    // Un mes sin resoluciones no es "0 horas": se omite para no hundir la línea.
    (this.store.metrics()?.resolution ?? []).filter((r) => r.resolved > 0 && r.hours !== null).map((r, i, all) => ({
      label: MONTHS[Number(r.month.slice(5, 7)) - 1], value: Math.round(r.hours ?? 0), highlight: i === all.length - 1,
    })),
  );

  protected readonly byCategory = computed<ChartDatum[]>(() =>
    (this.store.metrics()?.cost_by_category ?? []).map((c, i) => ({ label: CATEGORY_META[c.category].label, value: Math.round(c.cost), highlight: i === 0 })),
  );
}
