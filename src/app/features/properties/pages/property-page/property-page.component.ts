import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ToastService } from '../../../../core/services/toast.service';
import { initials } from '../../../../core/store/session.store';
import { AuditRecord, auditPhrase } from '../../../../core/http/audit-api';
import { TabOption, TabsComponent } from '../../../../shared/molecules/tabs/tabs.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { MenuComponent } from '../../../../shared/molecules/menu/menu.component';
import { PickerPerson, UserPickerComponent } from '../../../../shared/molecules/user-picker/user-picker.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent, IconName } from '../../../../shared/atoms/icon/icon.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { SpinnerComponent } from '../../../../shared/atoms/spinner/spinner.component';
import { SpotIconComponent } from '../../../../shared/atoms/spot-icon/spot-icon.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';
import { PropertyPageStore } from '../../store/property-page.store';
import { ChecklistItem, ChecklistTemplate, PropertyDraft, TYPE_LABEL, coordsText } from '../../models/property.model';
import { gapsOf, statusOf } from '../../models/property-status';
import { PropertyCoverComponent } from '../../components/property-cover/property-cover.component';
import { PropertyFormComponent } from '../../components/property-form/property-form.component';
import { AccessPanelComponent } from '../../components/access-panel/access-panel.component';
import { placeOf } from '../../components/property-card/property-card.component';

type Tab = 'datos' | 'acceso' | 'checklist' | 'asignados' | 'propietarios' | 'historial';

const IN_PROPERTY: Record<string, string> = {
  'property.created': 'dio de alta la propiedad',
  'property.updated': 'editó los datos',
  'property.deleted': 'borró la propiedad',
  'property.access_viewed': 'consultó la información de acceso',
  'property.assignments_changed': 'cambió los asignados',
  'property.owners_changed': 'cambió los propietarios',
};

const FIELD_LABEL: Record<string, string> = {
  code: 'código', name: 'nombre', type: 'tipo', building_id: 'edificio', address: 'dirección', zone: 'zona',
  lat: 'ubicación', bedrooms: 'habitaciones', bathrooms: 'baños', max_guests: 'huéspedes',
  checklist_template_id: 'checklist', cover_file_id: 'foto', notes: 'notas', is_active: 'estado', has_access_info: 'acceso',
};

/**
 * Screen · Ficha de propiedad (W-C2, /propiedades/CODIGO). detail-page: volver
 * y saltar a otra propiedad, portada (foto o escena), identidad con lo que le
 * falta para operar, Editar y menú (Desactivar, Borrar), y pestañas Datos,
 * Acceso (con quién lo consultó), Checklist, Asignados, Propietarios e
 * Historial (bitácora de la propiedad). Las pestañas viven en `?seccion=`.
 */
@Component({
  selector: 'app-property-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    TabsComponent,
    EmptyStateComponent,
    MenuComponent,
    UserPickerComponent,
    DrawerComponent,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    IconComponent,
    SelectComponent,
    SpinnerComponent,
    SpotIconComponent,
    RelativeDatePipe,
    PropertyCoverComponent,
    PropertyFormComponent,
    AccessPanelComponent,
  ],
  providers: [PropertyPageStore],
  templateUrl: './property-page.component.html',
  styles: `
    :host { display: block; }
    .hero { height: clamp(180px, 26vw, 300px); }
    .back { color: var(--color-teal-muted); }
    .back:hover, .link:hover { color: var(--color-primary); }
    .link { color: var(--color-teal-muted); }
    .timeline li::before { content: ''; position: absolute; left: 19px; top: 34px; bottom: 2px; width: 2px; background: var(--color-divider); }
    .timeline li:last-child::before { display: none; }
  `,
})
export class PropertyPageComponent {
  protected readonly store = inject(PropertyPageStore);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /** Parámetro de ruta y query param (withComponentInputBinding). */
  readonly code = input.required<string>();
  readonly seccion = input<string | undefined>();

  protected readonly editing = signal(false);
  protected readonly menu = signal(false);
  protected readonly accessDraft = signal('');
  protected readonly draftTeam = signal<readonly string[]>([]);
  protected readonly ini = initials;

  constructor() {
    effect(() => {
      const code = this.code();
      untracked(() => void this.store.load(code));
    });
    // El selector de equipo arranca con la lista actual de la pestaña.
    effect(() => {
      const p = this.store.property();
      const tab = this.tab();
      untracked(() => {
        if (!p) return;
        this.draftTeam.set((tab === 'propietarios' ? p.owners : p.assigned).map((x) => x.user_id));
      });
    });
  }

  protected readonly tab = computed<Tab>(() => {
    const s = this.seccion() as Tab | undefined;
    const allowed = this.tabOptions().map((t) => t.value);
    return s && allowed.includes(s) ? s : 'datos';
  });

  protected readonly tabOptions = computed<TabOption[]>(() => {
    const p = this.store.property();
    return [
      { value: 'datos', label: 'Datos' },
      ...(this.store.canSeeAccess() ? [{ value: 'acceso', label: 'Acceso' }] : []),
      { value: 'checklist', label: 'Checklist' },
      { value: 'asignados', label: 'Asignados', count: p?.assigned.length ?? null, attention: true },
      { value: 'propietarios', label: 'Propietarios', count: p?.owners.length ?? null },
      ...(this.store.canAudit() ? [{ value: 'historial', label: 'Historial' }] : []),
    ].map((t) => (t.value === 'asignados' ? { ...t, attention: (t.count ?? 0) === 0 } : t));
  });

  protected readonly status = computed(() => statusOf(this.store.property()!));
  protected readonly gaps = computed(() => gapsOf(this.store.property()!));
  protected readonly typeLabel = computed(() => TYPE_LABEL[this.store.property()!.type]);
  protected readonly place = computed(() => placeOf(this.store.property()!));

  protected readonly facts = computed<{ label: string; value: string; icon: IconName }[]>(() => {
    const p = this.store.property()!;
    const n = (v: number | null) => (v === null ? '—' : String(v));
    return [
      { label: 'Habitaciones', value: n(p.bedrooms), icon: 'bed' },
      { label: 'Baños', value: n(p.bathrooms), icon: 'bath' },
      { label: 'Huéspedes', value: n(p.max_guests), icon: 'guests' },
      { label: 'Checklist', value: p.checklist_template_name ?? 'Sin elegir', icon: 'checklist' },
    ];
  });

  protected readonly switchOptions = computed(() =>
    this.store.all().map((x) => ({ value: x.code, label: `${x.code} · ${x.name}` })),
  );

  protected readonly templateOptions = computed(() => [
    { value: '', label: 'Sin checklist' },
    ...this.store.templates().map((t) => ({ value: t.id, label: t.name + (t.is_default ? ' (por defecto)' : '') })),
  ]);

  protected readonly dataCards = computed(() => {
    const p = this.store.property()!;
    const coords = coordsText(p.lat, p.lng);
    return [
      {
        title: 'Básicos',
        rows: [
          { label: 'Código', value: p.code },
          { label: 'Tipo', value: TYPE_LABEL[p.type] },
          { label: 'Habitaciones', value: p.bedrooms?.toString() ?? '' },
          { label: 'Baños', value: p.bathrooms?.toString() ?? '' },
          { label: 'Huéspedes', value: p.max_guests?.toString() ?? '' },
        ],
      },
      {
        title: 'Ubicación',
        rows: [
          { label: 'Edificio', value: p.building_name ?? '' },
          { label: 'Zona', value: p.zone ?? '' },
          { label: 'Dirección', value: p.address ?? '' },
          {
            label: 'Mapa',
            value: coords ? 'Abrir en Google Maps' : '',
            href: coords ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}` : undefined,
          },
        ],
      },
    ] as { title: string; rows: { label: string; value: string; href?: string }[] }[];
  });

  private readonly peopleById = computed(() => new Map(this.store.people().map((x) => [x.user_id, x])));

  protected roleOf(userId: string): string {
    return this.peopleById().get(userId)?.role_name ?? '';
  }

  /** Asignables: quien ejecuta tareas primero; propietarios: el rol owner primero. */
  protected pickerPeople(kind: 'assigned' | 'owners'): PickerPerson[] {
    return this.store
      .people()
      .filter((x) => (kind === 'owners' ? x.role_key === 'owner' || this.draftTeam().includes(x.user_id) : x.role_key !== 'owner'))
      .map((x) => ({ id: x.user_id, name: x.full_name, detail: `${x.role_name} · ${x.email}`, muted: x.status === 'suspended' }));
  }

  protected teamDirty(kind: 'assigned' | 'owners'): boolean {
    const p = this.store.property();
    if (!p) return false;
    const cur = (kind === 'owners' ? p.owners : p.assigned).map((x) => x.user_id).sort();
    const next = [...this.draftTeam()].sort();
    return cur.join() !== next.join();
  }

  protected resetTeam(): void {
    const p = this.store.property();
    if (p) this.draftTeam.set((this.tab() === 'propietarios' ? p.owners : p.assigned).map((x) => x.user_id));
  }

  protected saveTeam(kind: 'assigned' | 'owners'): void {
    void this.store.setTeam(kind, this.draftTeam());
  }

  protected sectionsOf(t: ChecklistTemplate): { title: string; items: ChecklistItem[] }[] {
    const out: { title: string; items: ChecklistItem[] }[] = [];
    for (const it of t.items) {
      const last = out[out.length - 1];
      if (last && last.title === it.section) last.items.push(it);
      else out.push({ title: it.section, items: [it] });
    }
    return out;
  }

  /** Dentro de la ficha la propiedad ya se sabe: "editó los datos" basta. */
  protected phrase(r: AuditRecord): string {
    const text = IN_PROPERTY[r.action] ?? auditPhrase(r);
    return text.replace(/^./, (c) => c.toLowerCase());
  }

  /** "Cambió: nombre, huéspedes" a partir del antes y el después. */
  protected changes(r: AuditRecord): string | null {
    if (r.action !== 'property.updated' || !r.before || !r.after) return null;
    const keys = Object.keys(FIELD_LABEL).filter((k) => JSON.stringify(r.before![k]) !== JSON.stringify(r.after![k]));
    if (r.after['access_info_changed']) keys.push('has_access_info');
    const labels = [...new Set(keys.map((k) => FIELD_LABEL[k]))];
    return labels.length ? `Cambió ${labels.join(', ')}` : null;
  }

  protected setTab(v: string): void {
    void this.router.navigate([], { queryParams: { seccion: v === 'datos' ? null : v }, replaceUrl: true });
  }

  protected go(code: string): void {
    void this.router.navigate(['/propiedades', code], { queryParamsHandling: 'preserve' });
  }

  protected back(): void {
    void this.router.navigate(['/propiedades']);
  }

  protected reload(): void {
    void this.store.load(this.code());
  }

  protected openEdit(): void {
    this.store.clearSaveError();
    this.editing.set(true);
  }

  protected async saveData(draft: PropertyDraft): Promise<void> {
    const before = this.store.property()?.code;
    if (await this.store.update(draft)) {
      this.editing.set(false);
      if (before && draft.code !== before) void this.router.navigate(['/propiedades', draft.code], { replaceUrl: true });
    }
  }

  protected setTemplate(id: string): void {
    void this.store.update({ checklist_template_id: id || null }, 'checklist', id ? 'Checklist actualizado.' : 'La propiedad quedó sin checklist.');
  }

  protected async saveAccess(): Promise<void> {
    if (await this.store.update({ access_info: this.accessDraft().trim() }, 'acceso', 'Acceso guardado y cifrado.')) this.accessDraft.set('');
  }

  protected async clearAccess(): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Borrar la información de acceso?',
      message: 'El equipo dejará de ver llaves, códigos y wifi de esta propiedad.',
      confirmLabel: 'Borrar acceso',
      tone: 'danger',
    });
    if (ok) void this.store.update({ access_info: null }, 'acceso', 'Acceso borrado.');
  }

  protected pickPhoto(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('La foto pesa más de 5 MB. Usa una más liviana.');
      return;
    }
    void this.store.uploadCover(file);
  }

  protected removePhoto(): void {
    void this.store.update({ cover_file_id: null }, 'foto', 'Foto quitada. Se muestra la ilustración.');
  }

  protected async toggleActive(): Promise<void> {
    this.menu.set(false);
    const p = this.store.property()!;
    if (p.is_active) {
      const ok = await this.confirm.ask({
        title: `¿Desactivar ${p.code}?`,
        message: 'Deja de aparecer para programar limpiezas. Sus datos e historial se conservan.',
        confirmLabel: 'Desactivar',
      });
      if (!ok) return;
    }
    void this.store.update({ is_active: !p.is_active }, 'estado', p.is_active ? 'Propiedad desactivada.' : 'Propiedad activada.');
  }

  protected async remove(): Promise<void> {
    this.menu.set(false);
    const p = this.store.property()!;
    const ok = await this.confirm.ask({
      title: `¿Borrar ${p.name}?`,
      message: 'Desaparece de la lista y el código queda libre. Su historial se conserva en la bitácora.',
      confirmLabel: 'Borrar propiedad',
      tone: 'danger',
    });
    if (ok && (await this.store.remove())) void this.router.navigate(['/propiedades']);
  }
}
