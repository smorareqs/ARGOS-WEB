import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { PropertiesStore, PropertyFilters, StatusFilter } from '../../store/properties.store';
import { Property, PropertyDraft, TYPE_LABEL } from '../../models/property.model';
import { STATUS_META, statusOf } from '../../models/property-status';
import { PropertyCardComponent } from '../../components/property-card/property-card.component';
import { PropertyDetailComponent } from '../../components/property-detail/property-detail.component';
import { PropertyFormComponent } from '../../components/property-form/property-form.component';
import { CanDirective } from '../../../../core/auth/can.directive';
import { ToastService } from '../../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { FilterChipsComponent, ChipOption } from '../../../../shared/molecules/filter-chips/filter-chips.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { AvatarStackComponent } from '../../../../shared/molecules/avatar-stack/avatar-stack.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import {
  CellDefDirective,
  DataTableComponent,
  TableColumn,
} from '../../../../shared/organisms/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';

/**
 * Screen · Propiedades (W-C1). list-page: filtros con estado en la URL,
 * cuadrícula guiada por imagen o tabla, drawer de detalle que mantiene la
 * lista detrás (`?ver=CODIGO` → enlace directo) y alta en drawer.
 */
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
@Component({
  selector: 'app-properties-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoDataNoteComponent,
    PropertyCardComponent,
    PropertyDetailComponent,
    PropertyFormComponent,
    CanDirective,
    PageHeaderComponent,
    FilterChipsComponent,
    SegmentedComponent,
    EmptyStateComponent,
    AvatarStackComponent,
    DrawerComponent,
    DataTableComponent,
    CellDefDirective,
    ButtonComponent,
    IconComponent,
    InputComponent,
    SelectComponent,
    BadgeComponent,
    RelativeDatePipe,
  ],
  providers: [PropertiesStore],
  templateUrl: './properties-list.component.html',
  styles: `
    .filters { background: var(--glass-bg); -webkit-backdrop-filter: var(--glass-filter); backdrop-filter: var(--glass-filter); }
  `,
})
export class PropertiesListComponent {
  protected readonly store = inject(PropertiesStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Query params (withComponentInputBinding): el estado vive en la URL. */
  readonly q = input<string | undefined>();
  readonly estado = input<string | undefined>();
  readonly edificio = input<string | undefined>();
  readonly vista = input<string | undefined>();
  readonly ver = input<string | undefined>();

  protected readonly search = signal('');
  protected readonly creating = signal(false);

  protected readonly filters = computed<PropertyFilters>(() => ({
    q: this.q() ?? '',
    status: (this.estado() as StatusFilter) ?? 'all',
    building: this.edificio() ?? 'all',
  }));
  protected readonly view = computed(() => (this.vista() === 'tabla' ? 'tabla' : 'tarjetas'));
  protected readonly results = computed(() => this.store.apply(this.filters()));
  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return f.q.trim().length >= 2 || f.status !== 'all' || f.building !== 'all';
  });

  protected readonly chips = computed<ChipOption[]>(() => {
    const c = this.store.counts(this.filters());
    const opt = (value: StatusFilter, label: string, dot?: string): ChipOption => ({ value, label, count: c[value], dot });
    return [
      opt('all', 'Todas'),
      opt('ready', 'Listas', STATUS_META.ready.dot),
      opt('cleaning', 'En limpieza', STATUS_META.cleaning.dot),
      opt('pending', 'Por limpiar', STATUS_META.pending.dot),
      opt('occupied', 'Ocupadas', STATUS_META.occupied.dot),
      opt('incident', 'Con incidencia', 'var(--color-danger)'),
      opt('inactive', 'Inactivas'),
    ];
  });

  protected readonly buildingOptions = computed(() => [
    { value: 'all', label: 'Todos los edificios' },
    ...this.store.buildings().map((b) => ({ value: b.id, label: b.name })),
  ]);

  protected readonly viewOptions = [
    { value: 'tarjetas', label: 'Tarjetas', icon: 'grid' as const },
    { value: 'tabla', label: 'Tabla', icon: 'list' as const },
  ];

  protected readonly selected = computed(() => {
    const code = this.ver();
    return code ? (this.store.items().find((p) => p.code === code) ?? null) : null;
  });

  protected readonly columns: TableColumn<Property>[] = [
    { key: 'name', label: 'Propiedad', sortable: true, value: (p) => p.name },
    { key: 'building', label: 'Edificio', sortable: true, priority: 'lg', value: (p) => p.building_name ?? p.zone },
    { key: 'assigned', label: 'Asignados', priority: 'md' },
    { key: 'last', label: 'Última limpieza', sortable: true, priority: 'md', value: (p) => p.last_cleaning_at ?? '' },
    { key: 'status', label: 'Hoy', sortable: true, value: (p) => statusOf(p).label },
    { key: 'incidents', label: 'Incid.', sortable: true, align: 'right', value: (p) => p.open_incidents },
  ];
  protected readonly rowKey = (p: Property) => p.code;
  protected readonly statusOf = statusOf;
  protected readonly typeName = (p: Property) => TYPE_LABEL[p.type];

  constructor() {
    void this.store.load();

    // La caja de búsqueda escribe en la URL con 300 ms de retardo (ux-ui.md §3.2).
    effect(() => {
      const fromUrl = this.q() ?? '';
      untracked(() => {
        if (fromUrl !== this.search()) this.search.set(fromUrl);
      });
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const text = this.search();
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (text !== (untracked(this.q) ?? '')) this.setParam('q', text.trim() ? text : null);
      }, 300);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  protected setParam(key: string, value: string | null): void {
    void this.router.navigate([], {
      queryParams: { [key]: value },
      queryParamsHandling: 'merge',
      replaceUrl: key !== 'ver',
    });
  }

  protected setStatus(v: string): void {
    this.setParam('estado', v === 'all' ? null : v);
  }

  protected setBuilding(v: string): void {
    this.setParam('edificio', v === 'all' ? null : v);
  }

  protected setView(v: string): void {
    this.setParam('vista', v === 'tabla' ? 'tabla' : null);
  }

  protected clearFilters(): void {
    this.search.set('');
    void this.router.navigate([], { queryParams: { vista: this.vista() ?? null }, replaceUrl: true });
  }

  protected openProperty(p: Property): void {
    this.setParam('ver', p.code);
  }

  protected closeDetail(open: boolean): void {
    if (!open) this.setParam('ver', null);
  }

  protected openCreate(): void {
    this.store.clearSaveError();
    this.creating.set(true);
  }

  protected async create(draft: PropertyDraft): Promise<void> {
    const created = await this.store.create(draft);
    if (created) this.creating.set(false);
  }

  protected soon(what: string): void {
    this.toast.show(`${what} llega con la ficha de propiedad (W-C2) en esta misma fase.`);
  }
}
