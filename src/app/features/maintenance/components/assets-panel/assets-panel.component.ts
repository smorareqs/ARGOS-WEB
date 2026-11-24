import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MaintenanceStore } from '../../store/maintenance.store';
import { ASSET_STATUS, Asset, AssetStatus, CATEGORIES, CATEGORY_META, placeOf } from '../../models/maintenance.model';
import { CellDefDirective, DataTableComponent, TableColumn } from '../../../../shared/organisms/data-table/data-table.component';
import { FilterChipsComponent } from '../../../../shared/molecules/filter-chips/filter-chips.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { dayKey, gtq } from '../../../../shared/utils/time';

/**
 * W-G2 · Activos: tabla por lugar, categoría, estado, próximo preventivo,
 * proveedor y gasto del año. Los chips de estado ponen primero lo que falla.
 */
@Component({
  selector: 'app-assets-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DataTableComponent, CellDefDirective, FilterChipsComponent, EmptyStateComponent, IconComponent, InputComponent, SelectComponent, BadgeComponent],
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
      <app-data-table [columns]="cols" [rows]="filtered()" [rowKey]="key" [loading]="store.loading()" [activeKey]="active()" (rowClick)="opened.emit($event.id)">
        <ng-template appCell="name" let-a>
          <div class="flex items-center gap-3">
            <span class="cat flex h-9 w-9 shrink-0 items-center justify-center rounded-tile"><app-icon [name]="c(a).icon" [size]="17" /></span>
            <div class="min-w-0">
              <div class="truncate text-[13px] font-bold text-primary">{{ a.name }}</div>
              <div class="truncate text-[11.5px] text-text-secondary">{{ c(a).label }}@if (a.brand) { · {{ a.brand }} }@if (a.location) { · {{ a.location }} }</div>
            </div>
          </div>
        </ng-template>
        <ng-template appCell="place" let-a>
          <span class="block truncate text-[12px] font-bold text-primary" [class.font-mono]="!!a.property_code">{{ where(a) }}</span>
          @if (!a.property_id) { <span class="block text-[11px] text-text-secondary">Edificio completo</span> }
        </ng-template>
        <ng-template appCell="status" let-a>
          <app-badge [tone]="s(a).tone" size="sm">{{ s(a).label }}</app-badge>
          @if (!a.is_active) { <span class="ml-1 text-[11px] text-text-muted">inactivo</span> }
        </ng-template>
        <ng-template appCell="next" let-a>
          @if (a.next_due_at) {
            <span class="tabular" [class.text-danger]="a.next_due_at < today" [class.font-bold]="a.next_due_at < today">{{ asDate(a.next_due_at) | date: 'd MMM y' }}</span>
          } @else {
            <span class="text-text-muted">Sin plan</span>
          }
        </ng-template>
        <ng-template appCell="open" let-a>
          @if (a.open_tickets) { <span class="tabular font-bold text-danger">{{ a.open_tickets }}</span> } @else { <span class="text-text-muted">0</span> }
        </ng-template>
        <ng-template appCell="cost" let-a><span class="tabular">{{ money(a.cost_year) }}</span></ng-template>
      </app-data-table>
    }
  `,
  styles: `.cat { background: var(--color-teal-washed); color: var(--color-teal-muted); }`,
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
  protected readonly key = (a: Asset) => a.id;
  protected readonly asDate = (d: string) => new Date(`${d}T12:00:00`);

  protected readonly categoryOptions = [
    { value: 'all', label: 'Toda categoría' },
    ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label })),
  ];
  protected readonly cols: TableColumn<Asset>[] = [
    { key: 'name', label: 'Activo', value: (a) => a.name },
    { key: 'place', label: 'Lugar', width: '150px', value: (a) => placeOf(a) },
    { key: 'status', label: 'Estado', width: '170px' },
    { key: 'next', label: 'Próximo preventivo', width: '150px', priority: 'md', value: (a) => a.next_due_at ?? '9999' },
    { key: 'open', label: 'Abiertas', align: 'right', width: '90px', priority: 'lg', value: (a) => a.open_tickets },
    { key: 'cost', label: 'Gasto del año', align: 'right', width: '120px', priority: 'lg', value: (a) => a.cost_year },
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

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const s = this.status();
    return this.store.assets().filter((a) =>
      (s === 'all' || (s === 'failing' ? a.status !== 'operational' : a.status === s)) &&
      (this.category() === 'all' || a.category === this.category()) &&
      (this.place() === 'all' || a.property_id === this.place() || `b:${a.building_id}` === this.place()) &&
      (!q || [a.name, a.brand, a.model, a.serial, a.location, a.property_code].some((v) => v?.toLowerCase().includes(q))),
    );
  });
}
