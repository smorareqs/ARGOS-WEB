import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { PropertiesStore, PropertyFilters, StatusFilter } from '../../store/properties.store';
import { Property, PropertyDraft, TYPE_LABEL } from '../../models/property.model';
import { STATUS_META, statusOf } from '../../models/property-status';
import { PropertyCardComponent, placeOf } from '../../components/property-card/property-card.component';
import { PropertyDetailComponent } from '../../components/property-detail/property-detail.component';
import { PropertyFormComponent } from '../../components/property-form/property-form.component';
import { PropertyCoverComponent } from '../../components/property-cover/property-cover.component';
import { BuildingsPanelComponent } from '../../components/buildings-panel/buildings-panel.component';
import { TemplatesPanelComponent } from '../../components/templates-panel/templates-panel.component';
import { CanDirective } from '../../../../core/auth/can.directive';
import { initials } from '../../../../core/store/session.store';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { FilterChipsComponent, ChipOption } from '../../../../shared/molecules/filter-chips/filter-chips.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { TabOption, TabsComponent } from '../../../../shared/molecules/tabs/tabs.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { AvatarStackComponent } from '../../../../shared/molecules/avatar-stack/avatar-stack.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { CellDefDirective, DataTableComponent, TableColumn } from '../../../../shared/organisms/data-table/data-table.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';

type Tab = 'propiedades' | 'edificios' | 'checklists';

/**
 * Screen · Propiedades (W-C1) con sus subpantallas como pestañas: Edificios
 * (W-C3) y Checklists (W-C4). list-page: filtros con estado en la URL,
 * cuadrícula guiada por imagen o tabla, drawer de resumen que mantiene la
 * lista detrás (`?ver=CODIGO`) y "Abrir ficha" (W-C2, /propiedades/CODIGO).
 */
@Component({
  selector: 'app-properties-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PropertyCardComponent,
    PropertyDetailComponent,
    PropertyFormComponent,
    PropertyCoverComponent,
    BuildingsPanelComponent,
    TemplatesPanelComponent,
    CanDirective,
    PageHeaderComponent,
    FilterChipsComponent,
    SegmentedComponent,
    TabsComponent,
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
  ],
  providers: [PropertiesStore],
  templateUrl: './properties-list.component.html',
})
export class PropertiesListComponent {
  protected readonly store = inject(PropertiesStore);
  private readonly router = inject(Router);

  /** Query params (withComponentInputBinding): el estado vive en la URL. */
  readonly q = input<string | undefined>();
  readonly estado = input<string | undefined>();
  readonly edificio = input<string | undefined>();
  readonly vista = input<string | undefined>();
  readonly ver = input<string | undefined>();
  readonly seccion = input<string | undefined>();

  protected readonly buildingsPanel = viewChild(BuildingsPanelComponent);
  protected readonly templatesPanel = viewChild(TemplatesPanelComponent);

  protected readonly search = signal('');
  protected readonly creating = signal(false);

  protected readonly tab = computed<Tab>(() => {
    const s = this.seccion();
    return s === 'edificios' || s === 'checklists' ? s : 'propiedades';
  });
  protected readonly tabOptions = computed<TabOption[]>(() => [
    { value: 'propiedades', label: 'Propiedades', count: this.store.loading() ? null : this.store.items().length },
    { value: 'edificios', label: 'Edificios', count: this.store.loading() ? null : this.store.buildings().length },
    { value: 'checklists', label: 'Checklists', count: this.store.loading() ? null : this.store.templates().length },
  ]);

  protected readonly subtitle = computed(() => {
    if (this.store.loading()) return 'Cargando tus propiedades…';
    const s = this.store.summary();
    const parts = [`${s.active} activas`, `${s.buildings} ${s.buildings === 1 ? 'edificio' : 'edificios'}`];
    if (s.unassigned) parts.push(`${s.unassigned} sin asignados`);
    return parts.join(' · ');
  });

  protected readonly emptyMessage = computed(() =>
    this.store.canManage()
      ? 'Crea la primera para empezar a programar limpiezas y asignar a tu equipo.'
      : 'Todavía no tienes propiedades asignadas. Pídele a tu supervisor que te asigne.',
  );

  protected readonly filters = computed<PropertyFilters>(() => ({
    q: this.q() ?? '',
    status: (this.estado() as StatusFilter) ?? 'all',
    building: this.edificio() ?? 'all',
  }));
  protected readonly view = computed(() => (this.vista() === 'tabla' ? 'tabla' : 'tarjetas'));
  protected readonly results = computed(() => this.store.apply(this.filters()));

  protected readonly chips = computed<ChipOption[]>(() => {
    const today: [StatusFilter, string, string][] = this.store.hasToday()
      ? [
          ['ready', 'Listas', STATUS_META.ready.dot],
          ['cleaning', 'En limpieza', STATUS_META.cleaning.dot],
          ['pending', 'Por limpiar', STATUS_META.pending.dot],
          ['occupied', 'Ocupadas', STATUS_META.occupied.dot],
        ]
      : [];
    const all: [StatusFilter, string, string?][] = [
      ['all', 'Todas'],
      ...today,
      ['active', 'Activas', STATUS_META.active.dot],
      ['unassigned', 'Sin asignados', 'var(--color-warning)'],
      ['no-checklist', 'Sin checklist', 'var(--color-warning)'],
      ['no-access', 'Sin acceso'],
      ['inactive', 'Inactivas'],
    ];
    const counts = this.store.counts(this.filters(), all.map(([k]) => k));
    return all
      .filter(([k]) => k === 'all' || k === 'active' || counts[k] > 0 || k === this.filters().status)
      .map(([value, label, dot]) => ({ value, label, count: counts[value], dot }));
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
    { key: 'name', label: 'Propiedad', sortable: true, value: (p) => p.code },
    { key: 'building', label: 'Edificio o zona', sortable: true, priority: 'lg', value: (p) => placeOf(p) },
    { key: 'assigned', label: 'Asignados', priority: 'md', sortable: true, value: (p) => p.assigned.length },
    { key: 'checklist', label: 'Checklist', priority: 'lg', sortable: true, value: (p) => p.checklist_template_name ?? '' },
    { key: 'access', label: 'Acceso', priority: 'md', align: 'center' },
    { key: 'status', label: 'Estado', sortable: true, value: (p) => statusOf(p).label },
  ];
  protected readonly rowKey = (p: Property) => p.code;
  protected readonly statusOf = statusOf;
  protected readonly place = placeOf;
  protected readonly typeName = (p: Property) => TYPE_LABEL[p.type];
  protected readonly stack = (p: Property) => p.assigned.map((a) => ({ name: a.full_name, initials: initials(a.full_name) }));

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
    void this.router.navigate([], { queryParams: { [key]: value }, queryParamsHandling: 'merge', replaceUrl: key !== 'ver' });
  }

  protected setTab(v: string): void {
    void this.router.navigate([], { queryParams: { seccion: v === 'propiedades' ? null : v } });
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

  protected openFicha(p: Property): void {
    void this.router.navigate(['/propiedades', p.code]);
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

  /** Abre "Nueva tarea" en el Itinerario con esta propiedad elegida. */
  protected schedule(p: Property): void {
    void this.router.navigate(['/itinerario'], { queryParams: { nueva: p.code } });
  }
}
