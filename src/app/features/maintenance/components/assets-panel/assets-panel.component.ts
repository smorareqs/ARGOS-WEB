import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MaintenanceStore } from '../../store/maintenance.store';
import { ASSET_STATUS, Asset, AssetStatus, CATEGORIES, CATEGORY_META, placeOf } from '../../models/maintenance.model';
import { FilterChipsComponent } from '../../../../shared/molecules/filter-chips/filter-chips.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { DimIconComponent } from '../../../../shared/atoms/dim-icon/dim-icon.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { dayKey, gtq } from '../../../../shared/utils/time';

/**
 * W-G2 · Activos como lista visual (mismo patrón que Inventario · Artículos):
 * el objeto de su categoría, dónde está, su estado con color, cuánto falta
 * para el preventivo y lo que tiene abierto. Lo que falla sube primero y
 * lleva una barra de color a la izquierda.
 */
@Component({
  selector: 'app-assets-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FilterChipsComponent, EmptyStateComponent, DimIconComponent, IconComponent, InputComponent, SelectComponent],
  template: `
    <app-filter-chips [options]="statusChips()" [(value)]="status" ariaLabel="Estado del activo" />
    <div class="mb-4 mt-3 flex flex-wrap items-center gap-3">
      <app-select class="w-full sm:w-[200px]" [compact]="true" [options]="categoryOptions" [(value)]="category" ariaLabel="Categoría" />
      <app-select class="w-full sm:w-[230px]" [compact]="true" [options]="placeOptions()" [(value)]="place" ariaLabel="Lugar" />
      <app-input class="min-w-0 flex-1 sm:max-w-[280px]" type="search" icon="search" [compact]="true" placeholder="Nombre, marca, modelo o serie" ariaLabel="Buscar activos" [(value)]="search" />
    </div>
    @if (!store.loading() && !store.assets().length) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="properties" title="Aún no hay activos" message="Registra elevadores, calentadores, A/C y bombas para llevar su mantenimiento, garantías y costos." />
      </div>
    } @else {
      <div class="overflow-hidden rounded-card border border-border-card bg-surface shadow-e1">
        <div class="flex items-center gap-4 border-b border-divider px-5 py-2.5 text-[10.5px] uppercase tracking-[1px] text-text-secondary">
          <span class="flex-1">Activo</span>
          <span class="hidden w-[170px] lg:block">Lugar</span>
          <span class="hidden w-[160px] md:block">Estado</span>
          <span class="hidden w-[150px] md:block">Preventivo</span>
          <span class="hidden w-[110px] text-right lg:block">Gasto del año</span>
        </div>
        @if (store.loading()) {
          @for (i of [0, 1, 2, 3]; track i) {
            <div class="flex items-center gap-4 border-b border-divider px-5 py-3.5"><span class="skeleton h-11 w-11 !rounded-[12px]"></span><span class="skeleton h-3 w-48"></span></div>
          }
        }
        <ul>
          @for (a of rows(); track a.id; let i = $index) {
            <li class="reveal-soft" [style.--i]="i">
              <button type="button" class="row" [class.is-active]="a.id === active()" [class.bad]="a.status !== 'operational'" [style.--st]="s(a).color" (click)="opened.emit(a.id)">
                <span class="tile" [style.background]="c(a).bg"><app-dim-icon [name]="c(a).dim" [size]="34" /></span>
                <span class="min-w-0 flex-1">
                  <span class="line-clamp-2 text-[14px] font-bold leading-snug text-primary">{{ a.name }}</span>
                  <span class="mt-0.5 block truncate text-[11.5px] text-text-secondary">{{ c(a).label }}@if (a.brand) { · {{ a.brand }} }@if (a.location) { · {{ a.location }} }</span>
                  <span class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 md:hidden">
                    <span class="state"><span class="dot"></span>{{ s(a).label }}</span>
                    <span class="text-[11.5px] text-text-secondary" [class.font-mono]="!!a.property_code">{{ where(a) }}</span>
                  </span>
                </span>
                <span class="hidden w-[170px] min-w-0 lg:block">
                  <span class="block truncate text-[12.5px] font-bold text-primary" [class.font-mono]="!!a.property_code">{{ where(a) }}</span>
                  <span class="block truncate text-[11px] text-text-secondary">{{ a.property_id ? a.property_name : 'Edificio completo' }}</span>
                </span>
                <span class="hidden w-[160px] md:block">
                  <span class="pill"><span class="dot"></span>{{ s(a).label }}</span>
                  @if (a.open_tickets) {
                    <span class="mt-1 flex items-center gap-1 text-[11px] font-bold text-danger"><app-icon name="maintenance" [size]="12" />{{ a.open_tickets }} {{ a.open_tickets === 1 ? 'abierta' : 'abiertas' }}</span>
                  }
                </span>
                <span class="hidden w-[150px] md:block">
                  @if (a.next_due_at; as d) {
                    <span class="due" [class]="'due-' + due(d).tone">{{ due(d).label }}</span>
                    <span class="mt-1 block text-[11px] text-text-secondary">{{ asDate(d) | date: 'd MMM y' }}</span>
                  } @else {
                    <span class="text-[12px] text-text-muted">Sin plan</span>
                  }
                </span>
                <span class="hidden w-[110px] text-right lg:block">
                  <span class="tabular block text-[15px] font-bold text-primary">{{ money(a.cost_year) }}</span>
                  @if (!a.is_active) { <span class="block text-[11px] text-text-muted">inactivo</span> }
                </span>
                <app-icon name="chevron-right" [size]="16" class="chev hidden text-text-muted sm:block" />
              </button>
            </li>
          } @empty {
            @if (!store.loading()) {
              <li class="px-5 py-10 text-center text-[13px] text-text-secondary">Ningún activo coincide con los filtros.</li>
            }
          }
        </ul>
      </div>
    }
  `,
  styles: `
    .row { position: relative; display: flex; width: 100%; align-items: center; gap: 12px; padding: 12px 16px; text-align: left;
      border-bottom: 1px solid var(--color-divider); transition: background-color var(--dur-fast); }
    @media (min-width: 640px) { .row { gap: 16px; padding: 12px 20px; } }
    li:last-child .row { border-bottom: 0; }
    .row:hover { background: var(--color-surface-soft); }
    .row.is-active { background: rgba(197, 135, 60, .07); }
    .row.bad::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: 0 3px 3px 0; background: var(--st); }
    .tile { display: grid; place-items: center; width: 46px; height: 46px; flex-shrink: 0; border-radius: 13px; box-shadow: inset 0 -2px 0 rgba(0,0,0,.05);
      transition: transform var(--spring-snappy-dur) var(--spring-snappy); }
    .row:hover .tile { transform: translateY(-2px) rotate(-3deg); }
    .dot { width: 7px; height: 7px; flex-shrink: 0; border-radius: 99px; background: var(--st); }
    .bad .dot { animation: beat 1.8s ease-in-out infinite; }
    .state { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: var(--st); }
    .pill { display: inline-flex; height: 24px; align-items: center; gap: 6px; padding: 0 10px; border-radius: 99px; font-size: 11.5px; font-weight: 700;
      color: var(--st); background: color-mix(in srgb, var(--st) 12%, transparent); }
    .due { display: inline-flex; height: 22px; align-items: center; padding: 0 9px; border-radius: 99px; font-size: 11.5px; font-weight: 700; }
    .due-ok { background: var(--color-teal-washed); color: var(--color-teal-muted); }
    .due-soon { background: #fbecd9; color: #8f5a12; }
    .due-late { background: #f6dcd8; color: #9b3423; }
    .chev { transition: transform var(--dur-fast); }
    .row:hover .chev { transform: translateX(3px); color: var(--color-primary); }
    @keyframes beat { 50% { transform: scale(1.5); opacity: .6; } }
    @media (prefers-reduced-motion: reduce) { .dot { animation: none !important; } }
  `,
})
export class AssetsPanelComponent {
  protected readonly store = inject(MaintenanceStore);

  readonly active = input<string | null>(null);
  readonly opened = output<string>();

  protected readonly status = signal('all');
  protected readonly category = signal('all');
  protected readonly place = signal('all');
  protected readonly search = signal('');

  protected readonly today = dayKey();
  protected readonly c = (a: Asset) => CATEGORY_META[a.category];
  protected readonly s = (a: Asset) => ASSET_STATUS[a.status];
  protected readonly where = placeOf;
  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly asDate = (d: string) => new Date(`${d}T12:00:00`);

  protected readonly categoryOptions = [
    { value: 'all', label: 'Toda categoría' },
    ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label })),
  ];

  protected readonly statusChips = computed(() => {
    const list = this.store.assets();
    const count = (s: AssetStatus) => list.filter((a) => a.status === s).length;
    return [
      { value: 'all', label: 'Todos', count: list.length },
      { value: 'failing', label: 'Con falla', count: list.filter((a) => a.status !== 'operational').length, dot: 'var(--color-danger)' },
      ...(['operational', 'needs_attention', 'in_repair', 'out_of_service'] as AssetStatus[]).map((s) => ({ value: s, label: ASSET_STATUS[s].label, count: count(s) })),
    ].filter((c) => c.value === 'all' || c.count > 0);
  });

  protected readonly placeOptions = computed(() => {
    const seen = new Map<string, string>();
    for (const a of this.store.assets()) {
      const k = a.property_id ?? `b:${a.building_id}`;
      if (!seen.has(k)) seen.set(k, a.property_code ? `${a.property_code} · ${a.property_name}` : `${a.building_name} (edificio)`);
    }
    return [{ value: 'all', label: 'Todos los lugares' }, ...[...seen].sort((x, y) => x[1].localeCompare(y[1])).map(([value, label]) => ({ value, label }))];
  });

  /** Filtrados; primero lo que falla, luego el preventivo más cercano. */
  protected readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const s = this.status();
    return this.store.assets()
      .filter((a) =>
        (s === 'all' || (s === 'failing' ? a.status !== 'operational' : a.status === s)) &&
        (this.category() === 'all' || a.category === this.category()) &&
        (this.place() === 'all' || a.property_id === this.place() || `b:${a.building_id}` === this.place()) &&
        (!q || [a.name, a.brand, a.model, a.serial, a.location, a.property_code].some((v) => v?.toLowerCase().includes(q))),
      )
      .sort((a, b) => ASSET_STATUS[a.status].rank - ASSET_STATUS[b.status].rank || (a.next_due_at ?? '9999').localeCompare(b.next_due_at ?? '9999'));
  });

  /** "en 12 d", "hoy", "vencido hace 3 d". */
  protected due(d: string): { label: string; tone: 'ok' | 'soon' | 'late' } {
    const days = Math.round((Date.parse(`${d}T12:00:00`) - Date.parse(`${this.today}T12:00:00`)) / 86_400_000);
    if (days < 0) return { label: `Vencido hace ${-days} d`, tone: 'late' };
    if (days === 0) return { label: 'Toca hoy', tone: 'soon' };
    return { label: `En ${days} d`, tone: days <= 7 ? 'soon' : 'ok' };
  }
}
