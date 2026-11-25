import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { InventoryStore } from '../../store/inventory.store';
import {
  CATEGORY_LABEL,
  Custody,
  Discrepancy,
  Item,
  ItemCategory,
  ItemDraft,
  MOVEMENT_LABEL,
  Movement,
  MovementType,
  RestockRequest,
  StockChange,
} from '../../models/inventory.model';
import { StockFormComponent } from '../../components/stock-form/stock-form.component';
import { ItemFormComponent } from '../../components/item-form/item-form.component';
import { CATEGORY_META, ItemSort, ItemTableComponent } from '../../components/item-table/item-table.component';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { CanDirective } from '../../../../core/auth/can.directive';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { TabsComponent } from '../../../../shared/molecules/tabs/tabs.component';
import { StatTileComponent } from '../../../../shared/molecules/stat-tile/stat-tile.component';
import { FilterChipsComponent } from '../../../../shared/molecules/filter-chips/filter-chips.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { CellDefDirective, DataTableComponent, TableColumn } from '../../../../shared/organisms/data-table/data-table.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent, BadgeTone } from '../../../../shared/atoms/badge/badge.component';
import { downloadCsv } from '../../../../shared/utils/csv';

type Tab = 'articulos' | 'existencias' | 'movimientos' | 'custodias' | 'discrepancias' | 'reposicion';


/**
 * Screen · Inventario (W-F1 artículos, W-F2 existencias, W-F3 movimientos,
 * W-F4 custodias, W-F5 discrepancias, W-F6 reposición). Una pantalla con
 * pestañas; arriba, lo que pide atención (bajo mínimo, discrepancias,
 * solicitudes), como los paneles de suministros de Hospitable o Turno.
 */
@Component({
  selector: 'app-inventory-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    StockFormComponent,
    ItemFormComponent,
    ItemTableComponent,
    CanDirective,
    PageHeaderComponent,
    DemoDataNoteComponent,
    TabsComponent,
    StatTileComponent,
    FilterChipsComponent,
    EmptyStateComponent,
    DataTableComponent,
    CellDefDirective,
    DrawerComponent,
    ButtonComponent,
    IconComponent,
    InputComponent,
    SelectComponent,
    AvatarComponent,
    BadgeComponent,
  ],
  providers: [InventoryStore],
  template: `
    <app-page-header
      title="Inventario"
      eyebrow="Operación"
      [subtitle]="store.loading() ? 'Contando existencias…' : store.items().length + ' artículos en ' + store.warehouses().length + (store.warehouses().length === 1 ? ' bodega' : ' bodegas') + ' · ' + store.custodyUnits() + ' unidades en manos del equipo'"
    >
      <app-button *argosCan="'inventory.manage'" variant="tertiary" (pressed)="set('nuevo', 'articulo')"><app-icon name="plus" [size]="16" /> Nuevo artículo</app-button>
      <app-button *argosCan="'inventory.manage'" variant="primary" (pressed)="openStock('entry')"><app-icon name="inventory" [size]="17" /> Registrar entrada</app-button>
    </app-page-header>
    <app-demo-data-note module="inventory" label="Inventario" />

    @if (store.error(); as err) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="error" title="No pudimos cargar el inventario" [message]="err">
          <app-button variant="secondary" (pressed)="store.load()"><app-icon name="refresh" [size]="16" /> Reintentar</app-button>
        </app-empty-state>
      </div>
    } @else {
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <app-stat-tile class="reveal" style="--i: 1" label="Bajo mínimo" [value]="store.low().length" icon="alert-triangle" tone="warning" [note]="lowNote()" />
        <app-stat-tile class="reveal" style="--i: 2" label="Discrepancias" [value]="store.openDiscrepancies().length" icon="swap" tone="danger" note="Devoluciones incompletas al cerrar una tarea" />
        <app-stat-tile class="reveal" style="--i: 3" label="Solicitudes" [value]="store.pendingRequests().length" icon="inventory" tone="gold" note="Reposiciones por aprobar o surtir" />
        <app-stat-tile class="reveal" style="--i: 4" label="En custodia" [value]="store.custodyUnits()" icon="employees" tone="primary" [note]="store.custody().length + ' personas con artículos'" />
      </div>

      <app-tabs class="mt-7" [options]="tabs()" [value]="tab()" (valueChange)="set('tab', $event === 'articulos' ? null : $event)" ariaLabel="Secciones de inventario" />

      <div class="mt-5">
        @switch (tab()) {
          @case ('articulos') {
            <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <app-input class="min-w-0 lg:w-[320px]" type="search" icon="search" [compact]="true" placeholder="Buscar artículo o SKU" ariaLabel="Buscar artículos" [(value)]="search" />
              <app-filter-chips [options]="categoryChips()" [value]="cat() ?? 'all'" (valueChange)="set('cat', $event === 'all' ? null : $event)" ariaLabel="Categoría" />
              <app-select class="lg:ml-auto lg:w-[200px]" [compact]="true" [options]="sortOptions" [value]="itemSort()" (changed)="itemSort.set($any($event))" ariaLabel="Ordenar artículos" />
            </div>
            <app-item-table [items]="filteredItems()" [loading]="store.loading()" [sort]="itemSort()" [clickable]="store.canManage()" (picked)="openStock('adjustment', $event.id)" />
          }
          @case ('existencias') {
            <div class="mb-4 flex flex-wrap items-center gap-3">
              <app-select class="w-full sm:w-[280px]" [compact]="true" [options]="whOptions()" [value]="warehouse()" (changed)="set('bodega', $event)" ariaLabel="Bodega" />
              <p class="text-[12.5px] text-text-secondary">Toca una fila para ajustar o trasladar ese artículo.</p>
            </div>
            <app-data-table [columns]="stockCols" [rows]="store.items()" [rowKey]="itemKey" [loading]="store.loading()" (rowClick)="openStock('adjustment', $event.id)">
              <ng-template appCell="name" let-i>
                <div class="text-[13px] font-bold text-primary">{{ i.name }}</div>
                <div class="font-mono text-[11px] text-text-secondary">{{ i.sku }}</div>
              </ng-template>
              <ng-template appCell="qty" let-i>
                <span class="tabular font-bold" [class]="isLowHere(i) ? 'text-warning' : 'text-primary'">{{ qtyHere(i) }}</span>
                <span class="text-text-secondary"> {{ i.unit }}</span>
              </ng-template>
              <ng-template appCell="actions" let-i>
                @if (store.canManage()) {
                  <span class="flex justify-end gap-1.5">
                    <app-button variant="ghost" size="sm" (pressed)="$event.stopPropagation(); openStock('transfer', i.id)">Trasladar</app-button>
                    <app-button variant="ghost" size="sm" (pressed)="$event.stopPropagation(); openStock('adjustment', i.id)">Ajustar</app-button>
                  </span>
                }
              </ng-template>
            </app-data-table>
          }
          @case ('movimientos') {
            <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <app-filter-chips [options]="moveChips()" [value]="mtype() ?? 'all'" (valueChange)="set('tipo', $event === 'all' ? null : $event)" ariaLabel="Tipo de movimiento" />
              <app-button variant="tertiary" size="sm" (pressed)="exportMoves()"><app-icon name="arrow-up-right" [size]="15" /> Exportar CSV</app-button>
            </div>
            <app-data-table [columns]="moveCols" [rows]="filteredMoves()" [rowKey]="moveKey" [loading]="store.loading()">
              <ng-template appCell="at" let-m><span class="tabular whitespace-nowrap">{{ m.at | date: 'd MMM · HH:mm' }}</span></ng-template>
              <ng-template appCell="type" let-m><app-badge [tone]="moveTone(m)" size="sm">{{ moveLabel(m) }}</app-badge></ng-template>
              <ng-template appCell="item" let-m><span class="font-bold text-primary">{{ m.item_name }}</span></ng-template>
              <ng-template appCell="qty" let-m><span class="tabular font-bold" [class]="m.qty < 0 ? 'text-danger' : 'text-success'">{{ m.qty > 0 ? '+' : '' }}{{ m.qty }}</span></ng-template>
              <ng-template appCell="who" let-m>
                {{ m.person ?? '—' }}
                @if (m.task_number) {
                  <span class="text-text-secondary"> · tarea #{{ m.task_number }}</span>
                }
              </ng-template>
            </app-data-table>
          }
          @case ('custodias') {
            @if (!store.custody().length && !store.loading()) {
              <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="done" title="Nadie tiene artículos en custodia" message="Cuando alguien saque artículos en la app, aparecen aquí hasta que los devuelva." /></div>
            }
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              @for (g of store.custody(); track g.person_id; let i = $index) {
                <button type="button" class="pcard reveal rounded-card border border-border-card bg-surface p-5 text-left shadow-e1" [style.--i]="i" (click)="set('persona', g.person_id)">
                  <span class="flex items-center gap-3">
                    <app-avatar [initials]="g.person_name.slice(0, 1)" [name]="g.person_name" [size]="40" />
                    <span class="min-w-0">
                      <span class="block truncate text-[14px] font-bold text-primary">{{ g.person_name }}</span>
                      <span class="block text-[12px] text-text-secondary">{{ g.lines.length }} artículos · {{ g.units }} unidades</span>
                    </span>
                    <app-icon name="chevron-right" [size]="18" class="ml-auto text-text-muted" />
                  </span>
                  <span class="mt-4 flex flex-wrap gap-1.5">
                    @for (l of g.lines; track l.item_id) {
                      <span class="rounded-xs bg-teal-washed px-2 py-1 text-[11.5px] text-teal-muted"><b class="tabular text-primary">{{ l.qty }}</b> {{ l.item_name }}</span>
                    }
                  </span>
                </button>
              }
            </div>
          }
          @case ('discrepancias') {
            <div class="space-y-3">
              @for (d of discrepancies(); track d.id; let i = $index) {
                <article class="reveal flex flex-col gap-4 rounded-card border border-border-card bg-surface p-5 shadow-e1 md:flex-row md:items-center" [style.--i]="i" [class.opacity-60]="d.status === 'closed'">
                  <div class="flex min-w-0 flex-1 items-center gap-3.5">
                    <app-avatar [initials]="d.person_name.slice(0, 1)" [name]="d.person_name" [size]="40" />
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-[14px] font-bold text-primary">{{ d.person_name }}</span>
                        <app-badge [tone]="discTone(d)" size="sm">{{ discLabel(d) }}</app-badge>
                      </div>
                      <p class="mt-0.5 text-[13px] text-text-body">Devolvió <b class="tabular text-danger">{{ d.returned }}</b> de <b class="tabular">{{ d.expected }}</b> · {{ d.item_name }}</p>
                      <p class="mt-0.5 text-[12px] text-text-secondary">Tarea #{{ d.task_number }} en {{ d.property_code }} · {{ d.at | date: "d MMM, HH:mm" }}</p>
                      @if (d.note) {
                        <p class="mt-2 rounded-field bg-surface-soft px-3 py-2 text-[12.5px] text-text-body">“{{ d.note }}”</p>
                      }
                    </div>
                  </div>
                  @if (store.canReconcile() && d.status !== 'closed') {
                    <div class="flex shrink-0 gap-2">
                      @if (d.status === 'open') {
                        <app-button variant="tertiary" size="sm" [disabled]="store.busy() === d.id" (pressed)="justify(d)">Justificar</app-button>
                      }
                      <app-button variant="secondary" size="sm" [loading]="store.busy() === d.id" (pressed)="closeDisc(d)">Cerrar</app-button>
                    </div>
                  }
                </article>
              } @empty {
                <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="done" title="Sin discrepancias" message="Todas las devoluciones cuadraron con lo que salió de bodega." /></div>
              }
            </div>
          }
          @default {
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              @for (r of requests(); track r.id; let i = $index) {
                <article class="reveal flex flex-col rounded-card border border-border-card bg-surface p-5 shadow-e1" [style.--i]="i">
                  <header class="flex items-start gap-3">
                    <app-avatar [initials]="r.person_name.slice(0, 1)" [name]="r.person_name" [size]="36" />
                    <div class="min-w-0 flex-1">
                      <div class="text-[13.5px] font-bold text-primary">{{ r.person_name }}<span class="font-normal text-text-secondary"> para </span><span class="font-mono text-[12.5px]">{{ r.property_code }}</span></div>
                      <div class="text-[12px] text-text-secondary">{{ r.at | date: "EEEE d MMM, HH:mm" }}</div>
                    </div>
                    <app-badge [tone]="reqTone(r)" size="sm">{{ reqLabel(r) }}</app-badge>
                  </header>
                  <ul class="mt-4 divide-y divide-divider rounded-field border border-border-card">
                    @for (it of r.items; track it.item_id) {
                      <li class="flex items-center justify-between px-3.5 py-2.5 text-[13px]"><span class="text-text-body">{{ it.item_name }}</span><b class="tabular text-primary">{{ it.qty }}</b></li>
                    }
                  </ul>
                  @if (r.note) {
                    <p class="mt-3 text-[12.5px] text-text-secondary">“{{ r.note }}”</p>
                  }
                  <span class="min-h-4 flex-1"></span>
                  @if (store.canManage() && (r.status === 'pending' || r.status === 'approved')) {
                    <div class="mt-auto flex justify-end gap-2 border-t border-divider pt-4">
                      @if (r.status === 'pending') {
                        <app-button variant="ghost" size="sm" [disabled]="store.busy() === r.id" (pressed)="reject(r)">Rechazar</app-button>
                        <app-button variant="secondary" size="sm" [loading]="store.busy() === r.id" (pressed)="store.setRequest(r.id, 'approved')">Aprobar</app-button>
                      } @else {
                        <app-button variant="primary" size="sm" [loading]="store.busy() === r.id" (pressed)="store.setRequest(r.id, 'fulfilled')"><app-icon name="check" [size]="15" /> Marcar surtida</app-button>
                      }
                    </div>
                  }
                </article>
              }
            </div>
          }
        }
      </div>
    }

    <app-drawer [open]="!!person()" (openChange)="!$event && set('persona', null)" label="Custodia" [width]="460">
      @if (person(); as g) {
        <div class="px-6 pb-6 pt-7">
          <div class="flex items-center gap-3.5 pr-10">
            <app-avatar [initials]="g.person_name.slice(0, 1)" [name]="g.person_name" [size]="52" />
            <div>
              <div class="text-[11px] uppercase tracking-[1.6px] text-secondary">En custodia</div>
              <h2 class="font-display text-[24px] font-semibold leading-tight text-primary">{{ g.person_name }}</h2>
            </div>
          </div>
          <p class="mt-4 text-[13px] leading-relaxed text-text-body">Lo que sacó de bodega y todavía no devuelve. Al cerrar cada tarea, la app concilia lo que usó y lo que regresa.</p>
          <ul class="mt-5 space-y-2.5">
            @for (l of g.lines; track l.item_id) {
              <li class="flex items-center gap-3 rounded-card border border-border-card bg-surface px-4 py-3">
                <div class="min-w-0 flex-1">
                  <div class="text-[13.5px] font-bold text-primary">{{ l.item_name }}</div>
                  <div class="text-[12px] text-text-secondary"><b class="tabular text-primary">{{ l.qty }}</b> {{ l.unit }} · desde {{ l.since | date: 'd MMM' }}</div>
                </div>
                @if (store.canReconcile()) {
                  <app-button variant="tertiary" size="sm" [loading]="store.busy() === l.person_id + '|' + l.item_id" (pressed)="returnLine(l)">Registrar devolución</app-button>
                }
              </li>
            }
          </ul>
        </div>
      }
    </app-drawer>

    <app-drawer [open]="!!stockKind()" (openChange)="!$event && closeStock()" label="Movimiento de existencias" [width]="500">
      @if (stockKind(); as k) {
        <app-stock-form
          [items]="store.items()"
          [warehouses]="store.warehouses()"
          [stockOf]="stockOf"
          [initialKind]="k"
          [initialItem]="articulo() ?? null"
          [saving]="store.busy() === 'stock'"
          [serverError]="store.saveError()"
          (submitted)="saveStock($event)"
          (cancel)="closeStock()"
        />
      }
    </app-drawer>

    <app-drawer [open]="nuevo() === 'articulo'" (openChange)="!$event && set('nuevo', null)" label="Nuevo artículo" [width]="480">
      @if (nuevo() === 'articulo') {
        <app-item-form [saving]="store.busy() === 'item'" [serverError]="store.saveError()" (submitted)="saveItem($event)" (cancel)="set('nuevo', null)" />
      }
    </app-drawer>
  `,
  styles: `
    .pcard { transition: box-shadow var(--dur-fast), transform var(--spring-snappy-dur) var(--spring-snappy); }
    .pcard:hover { box-shadow: var(--shadow-e2); transform: translateY(-2px); }
  `,
})
export class InventoryComponent {
  protected readonly store = inject(InventoryStore);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly tab = input<Tab, string | undefined>('articulos', { transform: (v) => (v as Tab) || 'articulos' });
  readonly cat = input<string | undefined>();
  readonly tipo = input<string | undefined>();
  readonly bodega = input<string | undefined>();
  readonly persona = input<string | undefined>();
  readonly nuevo = input<string | undefined>();
  readonly mov = input<string | undefined>();
  readonly articulo = input<string | undefined>();

  protected readonly search = signal('');
  protected readonly mtype = computed(() => this.tipo());

  protected readonly tabs = computed(() => [
    { value: 'articulos', label: 'Artículos', count: this.store.items().length },
    { value: 'existencias', label: 'Existencias' },
    { value: 'movimientos', label: 'Movimientos' },
    { value: 'custodias', label: 'Custodias', count: this.store.custody().length },
    { value: 'discrepancias', label: 'Discrepancias', count: this.store.openDiscrepancies().length, attention: true },
    { value: 'reposicion', label: 'Reposición', count: this.store.pendingRequests().length, attention: true },
  ]);

  protected readonly lowNote = computed(() => {
    const l = this.store.low();
    return l.length ? l.slice(0, 2).map((i) => i.name).join(', ') + (l.length > 2 ? '…' : '') : 'Todo por encima del mínimo';
  });

  protected readonly categoryChips = computed(() => [
    { value: 'all', label: 'Todas', count: this.store.items().length },
    ...(Object.keys(CATEGORY_LABEL) as ItemCategory[]).map((c) => ({ value: c, label: CATEGORY_LABEL[c], dot: CATEGORY_META[c].dot, count: this.store.items().filter((i) => i.category === c).length })),
  ]);
  protected readonly filteredItems = computed(() => {
    const q = this.search().trim().toLowerCase();
    const c = this.cat();
    return this.store.items().filter((i) => (!c || i.category === c) && (q.length < 2 || `${i.sku} ${i.name}`.toLowerCase().includes(q)));
  });

  protected readonly whOptions = computed(() => this.store.warehouses().map((w) => ({ value: w.id, label: w.name })));
  protected readonly warehouse = computed(() => this.bodega() ?? this.store.warehouses()[0]?.id ?? '');

  protected readonly moveChips = computed(() => {
    const all = this.store.data()?.movements ?? [];
    return [
      { value: 'all', label: 'Todos', count: all.length },
      ...(['entry', 'consumption', 'checkout', 'return', 'transfer', 'adjustment'] as MovementType[]).map((t) => ({ value: t, label: MOVEMENT_LABEL[t], count: all.filter((m) => m.type === t).length })),
    ];
  });
  protected readonly filteredMoves = computed(() => {
    const t = this.mtype();
    return (this.store.data()?.movements ?? []).filter((m) => !t || m.type === t);
  });

  protected readonly discrepancies = computed(() => {
    const order = { open: 0, justified: 1, closed: 2 };
    return [...(this.store.data()?.discrepancies ?? [])].sort((a, b) => order[a.status] - order[b.status]);
  });
  protected readonly requests = computed(() => {
    const order = { pending: 0, approved: 1, fulfilled: 2, rejected: 3 };
    return [...(this.store.data()?.requests ?? [])].sort((a, b) => order[a.status] - order[b.status]);
  });
  protected readonly person = computed(() => this.store.custody().find((g) => g.person_id === this.persona()) ?? null);
  protected readonly stockKind = computed(() => (this.mov() === 'entry' || this.mov() === 'transfer' || this.mov() === 'adjustment' ? this.mov() as StockChange['kind'] : null));

  protected readonly itemSort = signal<ItemSort>('urgency');
  protected readonly sortOptions = [
    { value: 'urgency', label: 'Primero lo que falta' },
    { value: 'name', label: 'Por nombre' },
    { value: 'stock', label: 'Menor existencia' },
  ];
  protected readonly stockCols: TableColumn<Item>[] = [
    { key: 'name', label: 'Artículo', sortable: true, value: (i) => i.name },
    { key: 'qty', label: 'En esta bodega', align: 'right', value: (i) => this.qtyHere(i) },
    { key: 'min', label: 'Mínimo total', align: 'right', priority: 'md', value: (i) => i.min },
    { key: 'actions', label: '', align: 'right', priority: 'md' },
  ];
  protected readonly moveCols: TableColumn<Movement>[] = [
    { key: 'at', label: 'Fecha', sortable: true, value: (m) => m.at },
    { key: 'type', label: 'Tipo', priority: 'md' },
    { key: 'item', label: 'Artículo', sortable: true, value: (m) => m.item_name },
    { key: 'qty', label: 'Cantidad', align: 'right', sortable: true, value: (m) => m.qty },
    { key: 'warehouse', label: 'Bodega', priority: 'lg', value: (m) => m.warehouse },
    { key: 'who', label: 'Quién', priority: 'md' },
  ];
  protected readonly itemKey = (i: Item) => i.id;
  protected readonly moveKey = (m: Movement) => m.id;
  protected readonly stockOf = (item: string, wh: string) => this.store.qty(item, wh);

  constructor() {
    void this.store.load();
  }

  protected set(key: string, value: string | null): void {
    void this.router.navigate([], { queryParams: { [key]: value }, queryParamsHandling: 'merge', replaceUrl: key === 'tab' || key === 'cat' || key === 'tipo' || key === 'bodega' });
  }

  protected openStock(kind: StockChange['kind'], item?: string): void {
    if (!this.store.canManage()) return;
    this.store.clearSaveError();
    void this.router.navigate([], { queryParams: { mov: kind, articulo: item ?? null }, queryParamsHandling: 'merge' });
  }

  protected closeStock(): void {
    void this.router.navigate([], { queryParams: { mov: null, articulo: null }, queryParamsHandling: 'merge' });
  }

  protected async saveStock(c: StockChange): Promise<void> {
    if (await this.store.changeStock(c)) this.closeStock();
  }

  protected async saveItem(d: ItemDraft): Promise<void> {
    if (await this.store.createItem(d)) this.set('nuevo', null);
  }

  protected qtyHere(i: Item): number {
    return this.store.qty(i.id, this.warehouse());
  }
  protected isLowHere(i: Item): boolean {
    return i.min > 0 && i.total < i.min;
  }
  protected moveLabel(m: Movement): string {
    return MOVEMENT_LABEL[m.type];
  }
  protected moveTone(m: Movement): BadgeTone {
    return m.type === 'entry' || m.type === 'return' ? 'success' : m.type === 'adjustment' ? 'warning' : m.type === 'transfer' ? 'info' : 'neutral';
  }
  protected discLabel(d: Discrepancy): string {
    return { open: 'Abierta', justified: 'Justificada', closed: 'Cerrada' }[d.status];
  }
  protected discTone(d: Discrepancy): BadgeTone {
    return d.status === 'open' ? 'danger' : d.status === 'justified' ? 'warning' : 'muted';
  }
  protected reqLabel(r: RestockRequest): string {
    return { pending: 'Por aprobar', approved: 'Aprobada', rejected: 'Rechazada', fulfilled: 'Surtida' }[r.status];
  }
  protected reqTone(r: RestockRequest): BadgeTone {
    return r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'info' : r.status === 'fulfilled' ? 'success' : 'muted';
  }

  protected async returnLine(l: Custody): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Registrar devolución',
      message: `${l.person_name} devuelve ${l.qty} ${l.unit} de ${l.item_name} a la bodega principal.`,
      confirmLabel: 'Registrar devolución',
    });
    if (ok) await this.store.returnCustody(l);
  }

  protected async justify(d: Discrepancy): Promise<void> {
    const reason = await this.confirm.askReason({
      title: 'Justificar discrepancia',
      message: `${d.person_name} devolvió ${d.returned} de ${d.expected} (${d.item_name}).`,
      confirmLabel: 'Guardar justificación',
      reasons: ['Se quedó con el huésped', 'Artículo dañado', 'Se repuso en la propiedad'],
    });
    if (reason) await this.store.setDiscrepancy(d.id, 'justified', reason);
  }

  protected async closeDisc(d: Discrepancy): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Cerrar discrepancia',
      message: 'Sale de la lista de pendientes. Si falta mercadería, registra antes un ajuste de existencias.',
      confirmLabel: 'Cerrar',
    });
    if (ok) await this.store.setDiscrepancy(d.id, 'closed', null);
  }

  protected async reject(r: RestockRequest): Promise<void> {
    const reason = await this.confirm.askReason({
      title: 'Rechazar solicitud',
      message: `${r.person_name} verá el motivo en la app.`,
      confirmLabel: 'Rechazar',
      tone: 'danger',
      reasons: ['Hay suficiente en la propiedad', 'Se surte en la próxima compra'],
    });
    if (reason) await this.store.setRequest(r.id, 'rejected', reason);
  }

  protected exportMoves(): void {
    downloadCsv(
      `movimientos-inventario.csv`,
      ['Fecha', 'Tipo', 'Artículo', 'Cantidad', 'Bodega', 'Persona', 'Tarea', 'Nota'],
      this.filteredMoves().map((m) => [m.at, MOVEMENT_LABEL[m.type], m.item_name, m.qty, m.warehouse, m.person, m.task_number, m.note]),
    );
  }
}
