import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { MaintenanceStore } from '../../store/maintenance.store';
import { ACTIVE_STATUSES, CATEGORY_META, TICKET_STATUS, Ticket, TicketStatus, URGENCY_META, Urgency, placeOf } from '../../models/maintenance.model';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { BoardCardDirective, BoardComponent, BoardMove } from '../../../../shared/organisms/board/board.component';
import { CellDefDirective, DataTableComponent, TableColumn } from '../../../../shared/organisms/data-table/data-table.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { initials } from '../../../../core/store/session.store';
import { gtq } from '../../../../shared/utils/time';

const BOARD: readonly TicketStatus[] = ['open', 'assigned', 'in_progress', 'resolved'];

/**
 * W-G1 · Incidencias: tablero por estado (patrón de Linear: contador por
 * columna, tarjetas con urgencia, lugar, edad y responsable) o tabla con
 * todas, incluidas cerradas y rechazadas. Arrastrar solo inicia (es el
 * único paso sin datos); asignar, resolver y cerrar se hace en la ficha.
 */
@Component({
  selector: 'app-tickets-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SegmentedComponent, EmptyStateComponent, BoardComponent, BoardCardDirective, DataTableComponent, CellDefDirective, IconComponent, InputComponent, SelectComponent, BadgeComponent, AvatarComponent],
  template: `
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <app-segmented [options]="viewOptions" [value]="view()" (valueChange)="viewChange.emit($event)" [iconOnly]="true" ariaLabel="Vista" />
      <app-select class="w-full sm:w-[170px]" [compact]="true" [options]="urgencyOptions" [(value)]="urgency" ariaLabel="Urgencia" />
      <app-select class="w-full sm:w-[210px]" [compact]="true" [options]="placeOptions()" [(value)]="place" ariaLabel="Lugar" />
      <app-input class="min-w-0 flex-1 sm:max-w-[280px]" type="search" icon="search" [compact]="true" placeholder="Buscar por título, lugar o #folio" ariaLabel="Buscar incidencias" [(value)]="search" />
      @if (mine()) {
        <button type="button" class="chip-on inline-flex h-9 items-center gap-1.5 rounded-pill px-3 text-[12px] font-bold" (click)="onlyMine.set(!onlyMine())" [attr.aria-pressed]="onlyMine()">
          <app-icon name="user-plus" [size]="14" /> Mías
        </button>
      }
    </div>

    @if (store.loading()) {
      <div class="skeleton h-[420px] w-full !rounded-card"></div>
    } @else if (!store.tickets().length) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="done" title="Sin incidencias" message="Cuando alguien reporte una falla desde la app o desde aquí, aparece en este tablero." />
      </div>
    } @else if (view() === 'tabla') {
      <app-data-table [columns]="cols" [rows]="filtered()" [rowKey]="key" [activeKey]="active() ?? null" (rowClick)="opened.emit($event.id)">
        <ng-template appCell="title" let-t>
          <div class="flex items-center gap-2.5">
            <span class="h-2.5 w-2.5 shrink-0 rounded-pill" [style.background]="u(t).dot"></span>
            <div class="min-w-0"><div class="truncate text-[13px] font-bold text-primary">{{ t.title }}</div><div class="text-[11px] text-text-secondary"><span class="font-mono">#{{ t.number }}</span> · <span [class.font-mono]="!!t.property_code">{{ where(t) }}</span></div></div>
          </div>
        </ng-template>
        <ng-template appCell="status" let-t><app-badge [tone]="s(t).tone" size="sm">{{ s(t).label }}</app-badge></ng-template>
        <ng-template appCell="age" let-t><span class="tabular">{{ age(t) }}</span></ng-template>
        <ng-template appCell="who" let-t>{{ t.vendor_name ?? t.assignee_name ?? '—' }}</ng-template>
        <ng-template appCell="cost" let-t><span class="tabular">{{ t.cost === null ? '—' : money(t.cost) }}</span></ng-template>
      </app-data-table>
    } @else {
      <app-board [columns]="columns" [items]="boardItems()" [columnOf]="columnOf" [keyOf]="key" [canDrag]="canDrag" (moved)="onMove($event)">
        <ng-template appBoardCard let-t>
          <button type="button" class="icard w-full rounded-tile border border-border-card bg-surface p-3.5 text-left shadow-e1" [class.is-active]="t.id === active()" (click)="opened.emit(t.id)">
            <span class="flex items-center justify-between gap-2">
              <app-badge [tone]="u(t).tone" size="sm">{{ u(t).label }}</app-badge>
              <span class="tabular text-[11.5px] text-text-secondary">#{{ t.number }} · {{ age(t) }}</span>
            </span>
            <span class="mt-2 block text-[13.5px] font-bold leading-snug text-primary">{{ t.title }}</span>
            <span class="mt-1 flex items-center gap-1.5 truncate text-[12px] text-text-secondary">
              @if (t.asset_category) { <app-icon [name]="c(t).icon" [size]="13" /> }
              <span class="shrink-0" [class.font-mono]="!!t.property_code">{{ where(t) }}</span>@if (t.asset_name) { <span class="truncate">· {{ t.asset_name }}</span> }
            </span>
            @if (t.plan_name) {
              <span class="plan mt-2 inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-[10.5px] font-bold"><app-icon name="calendar-check" [size]="12" /> Preventivo</span>
            }
            <span class="mt-3 flex items-center gap-2 border-t border-divider pt-2.5 text-[12px]">
              @if (t.assignee_name) {
                <app-avatar [initials]="ini(t.assignee_name)" [name]="t.assignee_name" [size]="20" /><span class="truncate text-text-body">{{ t.assignee_name }}</span>
              }
              @if (t.vendor_name) {
                <span class="inline-flex min-w-0 items-center gap-1 text-text-body"><app-icon name="building" [size]="13" class="text-text-secondary" /><span class="truncate">{{ t.vendor_name }}</span></span>
              }
              @if (!t.assignee_name && !t.vendor_name) {
                <span class="font-bold text-danger">Sin responsable</span>
              }
              @if (t.photos_count) {
                <span class="ml-auto inline-flex items-center gap-1 text-text-secondary"><app-icon name="camera" [size]="13" />{{ t.photos_count }}</span>
              }
            </span>
          </button>
        </ng-template>
      </app-board>
      <p class="mt-3 text-[12px] text-text-secondary">{{ boardHint() }}</p>
    }
  `,
  styles: `
    .icard { transition: box-shadow var(--dur-fast), transform var(--spring-snappy-dur) var(--spring-snappy); }
    .icard:hover { box-shadow: var(--shadow-e2); transform: translateY(-1px); }
    .icard.is-active { box-shadow: 0 0 0 2px var(--color-secondary); }
    .plan { background: var(--color-teal-washed); color: var(--color-teal-muted); }
    .chip-on { border: 1px solid var(--color-border-field); color: var(--color-text-body); background: var(--color-surface); }
    .chip-on[aria-pressed='true'] { border-color: var(--color-primary); background: var(--color-primary); color: #fff; }
    @media (prefers-reduced-motion: reduce) { .icard { transition: none; } }
  `,
})
export class TicketsPanelComponent {
  protected readonly store = inject(MaintenanceStore);

  readonly view = input<string>('tablero');
  readonly active = input<string | null>(null);
  readonly viewChange = output<string>();
  readonly opened = output<string>();

  protected readonly urgency = signal('all');
  protected readonly place = signal('all');
  protected readonly search = signal('');
  protected readonly onlyMine = signal(false);

  // Las filas de ng-template llegan sin tipo: estos accesos lo recuperan.
  protected readonly u = (t: Ticket) => URGENCY_META[t.urgency];
  protected readonly s = (t: Ticket) => TICKET_STATUS[t.status];
  protected readonly c = (t: Ticket) => CATEGORY_META[t.asset_category ?? 'other'];
  protected readonly ini = initials;
  protected readonly where = placeOf;
  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly key = (t: Ticket) => t.id;
  protected readonly columnOf = (t: Ticket) => t.status;

  protected readonly viewOptions = [
    { value: 'tablero', label: 'Tablero', icon: 'grid' as const },
    { value: 'tabla', label: 'Tabla', icon: 'list' as const },
  ];
  protected readonly urgencyOptions = [
    { value: 'all', label: 'Toda urgencia' },
    ...(['critical', 'high', 'medium', 'low'] as Urgency[]).map((u) => ({ value: u, label: URGENCY_META[u].label })),
  ];
  protected readonly columns = BOARD.map((k) => ({
    key: k,
    label: TICKET_STATUS[k].column,
    color: TICKET_STATUS[k].color,
    empty: k === 'open' ? 'Nada nuevo por revisar' : k === 'resolved' ? 'Las resueltas esperan su cierre aquí' : 'Sin incidencias aquí',
  }));
  protected readonly cols: TableColumn<Ticket>[] = [
    { key: 'title', label: 'Incidencia' },
    { key: 'status', label: 'Estado', width: '130px' },
    { key: 'who', label: 'Responsable', priority: 'md' },
    { key: 'cost', label: 'Costo', align: 'right', width: '100px', priority: 'md' },
    { key: 'age', label: 'Edad', align: 'right', width: '90px' },
  ];

  /** Si quien mira atiende incidencias, puede ver solo las suyas. */
  protected readonly mine = computed(() => this.store.canExecute() && this.store.tickets().some((t) => t.assigned_to === this.store.meId()));

  protected readonly placeOptions = computed(() => {
    const seen = new Map<string, string>();
    for (const t of this.store.tickets()) {
      const k = t.property_id ?? t.building_id ?? '';
      if (k && !seen.has(k)) seen.set(k, t.property_code ? `${t.property_code} · ${t.property_name}` : (t.building_name ?? ''));
    }
    return [{ value: 'all', label: 'Todos los lugares' }, ...[...seen].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label }))];
  });

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase().replace(/^#/, '');
    return this.store.tickets().filter((t) =>
      (this.urgency() === 'all' || t.urgency === this.urgency()) &&
      (this.place() === 'all' || t.property_id === this.place() || t.building_id === this.place()) &&
      (!this.onlyMine() || t.assigned_to === this.store.meId()) &&
      (!q || String(t.number) === q || `${t.title} ${placeOf(t)} ${t.property_name ?? ''} ${t.asset_name ?? ''}`.toLowerCase().includes(q)),
    );
  });

  /** El tablero muestra abiertas y las resueltas de los últimos 14 días. */
  protected readonly boardItems = computed(() => {
    const since = Date.now() - 14 * 86_400_000;
    return this.filtered().filter((t) => ACTIVE_STATUSES.includes(t.status) || (t.status === 'resolved' && Date.parse(t.resolved_at ?? t.updated_at) >= since));
  });

  protected readonly boardHint = computed(() =>
    this.store.canManage() || this.store.canExecute()
      ? 'Arrastra una tarjeta a "En curso" para iniciarla. Asignar, resolver y cerrar se hace en su ficha. Las cerradas están en la tabla.'
      : 'Las cerradas y rechazadas están en la vista de tabla.',
  );

  protected readonly canDrag = (t: Ticket) => this.store.canExecute() && (t.status === 'open' || t.status === 'assigned');

  protected onMove(m: BoardMove<Ticket>): void {
    void this.store.move(m.item, m.to);
  }

  protected age(t: Ticket): string {
    const end = t.resolved_at ? Date.parse(t.resolved_at) : Date.now();
    const h = Math.max(0, Math.round((end - Date.parse(t.created_at)) / 3_600_000));
    return h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
  }
}
