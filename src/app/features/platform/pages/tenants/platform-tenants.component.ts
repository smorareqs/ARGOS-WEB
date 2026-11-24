import { ChangeDetectionStrategy, Component, WritableSignal, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../../core/http/api-error';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent, SelectOption } from '../../../../shared/atoms/select/select.component';
import { SpinnerComponent } from '../../../../shared/atoms/spinner/spinner.component';
import { TenantMarkComponent } from '../../../../shared/atoms/tenant-mark/tenant-mark.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { StatTileComponent } from '../../../../shared/molecules/stat-tile/stat-tile.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { plural } from '../../../../shared/utils/plural';
import {
  PLATFORM_FEATURES,
  PlatformApi,
  PlatformFeature,
  PlatformTenant,
} from '../../services/platform-api.service';

const ZONES: readonly SelectOption[] = [
  { value: 'America/Guatemala', label: 'Guatemala (GMT-6)' },
  { value: 'America/El_Salvador', label: 'El Salvador (GMT-6)' },
  { value: 'America/Tegucigalpa', label: 'Honduras (GMT-6)' },
  { value: 'America/Costa_Rica', label: 'Costa Rica (GMT-6)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Panama', label: 'Panamá (GMT-5)' },
];

type Feats = Partial<Record<PlatformFeature, boolean>>;

/**
 * Screen · Empresas de la plataforma (W-P1). Alta con schema propio, siete
 * roles y quien la administra (cuenta existente o invitación), módulos por
 * empresa y suspensión, que cierra todas sus sesiones. Todo queda en la
 * bitácora de plataforma.
 */
@Component({
  selector: 'app-platform-tenants-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeaderComponent,
    StatTileComponent,
    ButtonComponent,
    CheckboxComponent,
    IconComponent,
    InputComponent,
    SelectComponent,
    SpinnerComponent,
    TenantMarkComponent,
    EmptyStateComponent,
    FormFieldComponent,
    FormSheetComponent,
    DrawerComponent,
  ],
  template: `
    <app-page-header
      eyebrow="Administración ARGOS"
      title="Empresas"
      subtitle="Cada empresa trabaja en su propio espacio de datos, aislado de las demás."
    >
      <app-button variant="tertiary" routerLink="/plataforma/bitacora"><app-icon name="logbook" [size]="17" /> Bitácora</app-button>
      <app-button (pressed)="openCreate()"><app-icon name="plus" [size]="17" /> Nueva empresa</app-button>
    </app-page-header>

    <div class="mb-6 mt-6 grid gap-3 sm:grid-cols-3">
      <app-stat-tile label="Empresas activas" [value]="activeCount()" [total]="tenants().length" icon="apartments" />
      <app-stat-tile label="Personas con acceso" [value]="peopleCount()" icon="employees" tone="success" />
      <app-stat-tile label="Suspendidas" [value]="tenants().length - activeCount()" icon="ban" [tone]="tenants().length - activeCount() ? 'warning' : 'primary'" />
    </div>

    <div class="mb-4 max-w-[360px]">
      <app-input type="search" icon="search" placeholder="Buscar por nombre o identificador" ariaLabel="Buscar empresa" [value]="query()" (valueChange)="query.set($event)" />
    </div>

    @if (loading()) {
      <div class="flex items-center gap-3 py-16 text-[13px] text-text-secondary"><app-spinner [size]="18" /> Cargando empresas…</div>
    } @else if (!filtered().length) {
      <app-empty-state kind="search" title="No hay empresas con ese nombre" message="Prueba con otra palabra o da de alta una nueva." />
    } @else {
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (t of filtered(); track t.id; let i = $index) {
          <article class="tenant reveal flex flex-col rounded-card border border-border-card bg-surface shadow-e1" [class.is-off]="!t.is_active" [style.--i]="i">
            <div class="flex items-start gap-3 p-5 pb-4">
              <app-tenant-mark [name]="t.name" [logo]="t.logo_url" [size]="48" />
              <div class="min-w-0 flex-1">
                <div class="truncate font-display text-[19px] font-semibold text-primary">{{ t.name }}</div>
                <div class="truncate font-mono text-[11.5px] text-text-secondary">{{ t.schema_name }}</div>
              </div>
              <span class="shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold" [class]="t.is_active ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'">
                {{ t.is_active ? 'Activa' : 'Suspendida' }}
              </span>
            </div>
            <dl class="grid grid-cols-2 gap-3 px-5 text-[12.5px]">
              <div>
                <dt class="text-[11px] uppercase tracking-[0.8px] text-text-secondary">Personas</dt>
                <dd class="tabular font-bold text-primary">{{ t.active_members }} <span class="font-normal text-text-secondary">de {{ t.members }}</span></dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.8px] text-text-secondary">Última actividad</dt>
                <dd class="font-bold text-primary">{{ ago(t.last_activity) }}</dd>
              </div>
            </dl>
            <div class="mt-4 flex flex-wrap gap-1.5 px-5">
              @for (f of enabled(t); track f) {
                <span class="rounded-pill bg-background px-2.5 py-1 text-[11px] font-bold text-text-body">{{ f }}</span>
              } @empty {
                <span class="text-[12px] text-text-secondary">Solo operación base (sin módulos extra)</span>
              }
            </div>
            <div class="mt-auto flex items-center justify-end gap-2 border-t border-divider px-4 py-3">
              <app-button variant="ghost" size="sm" (pressed)="openEdit(t)"><app-icon name="settings" [size]="16" /> Editar</app-button>
              <app-button variant="ghost" size="sm" [loading]="busy() === t.id" (pressed)="toggle(t)">
                <app-icon [name]="t.is_active ? 'ban' : 'refresh'" [size]="16" /> {{ t.is_active ? 'Suspender' : 'Reactivar' }}
              </app-button>
            </div>
          </article>
        }
      </div>
    }

    <!-- Alta -->
    <app-drawer [open]="creating()" (openChange)="!$event && creating.set(false)" label="Nueva empresa" [width]="480">
      @if (creating()) {
        <app-form-sheet
          eyebrow="Nueva empresa"
          title="Dar de alta una empresa"
          subtitle="Creamos su espacio de datos, los siete roles y le enviamos el acceso a quien la administrará."
          spot="companies"
          submitLabel="Crear empresa"
          [saving]="saving()"
          [error]="formError()"
          (submitted)="create()"
          (cancel)="creating.set(false)"
        >
          <app-form-field label="Nombre" for="nt-name" [required]="true" [error]="err('name') ?? (tried() && !fName().trim() ? 'Escribe el nombre.' : null)">
            <app-input inputId="nt-name" placeholder="Ej. Lago Azul Rentals" [value]="fName()" (valueChange)="onName($event)" />
          </app-form-field>
          <app-form-field label="Identificador" for="nt-slug" [required]="true" hint="Minúsculas, números y guion bajo. No se cambia después." [error]="err('slug')">
            <app-input inputId="nt-slug" [mono]="true" placeholder="lago_azul" [value]="fSlug()" (valueChange)="onSlug($event)" />
          </app-form-field>
          <app-form-field label="Zona horaria" for="nt-zone" [error]="err('timezone')">
            <app-select selectId="nt-zone" [options]="zones" [(value)]="fZone" ariaLabel="Zona horaria" />
          </app-form-field>
          <app-form-field
            label="Correo de quien la administrará"
            for="nt-admin"
            [optional]="true"
            hint="Si ya tiene cuenta en ARGOS queda con el rol de administración; si no, le llega una invitación."
            [error]="err('admin_email')"
          >
            <app-input type="email" icon="mail" inputId="nt-admin" placeholder="nombre@empresa.com" [value]="fAdmin()" (valueChange)="fAdmin.set($event)" />
          </app-form-field>
          <fieldset>
            <legend class="mb-2 text-[12.5px] font-bold text-text-body">Módulos del plan</legend>
            <div class="flex flex-col gap-2.5">
              @for (f of features; track f.key) {
                <app-checkbox [checked]="!!fFeats()[f.key]" (checkedChange)="setFeat(fFeats, f.key, $event)">
                  <span class="font-bold text-primary">{{ f.label }}</span>
                  <span class="block text-[11.5px] text-text-secondary">{{ f.hint }}</span>
                </app-checkbox>
              }
            </div>
          </fieldset>
        </app-form-sheet>
      }
    </app-drawer>

    <!-- Edición -->
    <app-drawer [open]="!!editing()" (openChange)="!$event && editing.set(null)" label="Editar empresa" [width]="480">
      @if (editing(); as t) {
        <app-form-sheet
          eyebrow="Empresa"
          [title]="t.name"
          subtitle="Los módulos se reflejan en el menú de todos sus usuarios al volver a entrar."
          spot="features"
          submitLabel="Guardar cambios"
          [saving]="saving()"
          [error]="formError()"
          (submitted)="save(t)"
          (cancel)="editing.set(null)"
        >
          <app-form-field label="Nombre" for="et-name" [required]="true" [error]="err('name')">
            <app-input inputId="et-name" [value]="eName()" (valueChange)="eName.set($event)" />
          </app-form-field>
          <fieldset>
            <legend class="mb-2 text-[12.5px] font-bold text-text-body">Módulos del plan</legend>
            <div class="flex flex-col gap-2.5">
              @for (f of features; track f.key) {
                <app-checkbox [checked]="!!eFeats()[f.key]" (checkedChange)="setFeat(eFeats, f.key, $event)">
                  <span class="font-bold text-primary">{{ f.label }}</span>
                  <span class="block text-[11.5px] text-text-secondary">{{ f.hint }}</span>
                </app-checkbox>
              }
            </div>
          </fieldset>
        </app-form-sheet>
      }
    </app-drawer>
  `,
  styles: `
    :host { display: block; }
    .tenant { transition: box-shadow var(--dur-base), transform var(--spring-standard-dur) var(--spring-standard); }
    .tenant:hover { box-shadow: var(--shadow-e2); transform: translateY(-1px); }
    .tenant.is-off { background: color-mix(in srgb, var(--color-background) 55%, white); }
  `,
})
export class PlatformTenantsComponent {
  private readonly api = inject(PlatformApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly features = PLATFORM_FEATURES;
  protected readonly zones = ZONES;
  protected readonly tenants = signal<readonly PlatformTenant[]>([]);
  protected readonly loading = signal(true);
  protected readonly query = signal('');
  protected readonly busy = signal<string | null>(null);

  protected readonly creating = signal(false);
  protected readonly editing = signal<PlatformTenant | null>(null);
  protected readonly saving = signal(false);
  protected readonly tried = signal(false);
  protected readonly formError = signal<string | null>(null);
  private readonly fieldErrors = signal<Record<string, string>>({});

  protected readonly fName = signal('');
  protected readonly fSlug = signal('');
  private slugTouched = false;
  protected readonly fZone = signal('America/Guatemala');
  protected readonly fAdmin = signal('');
  protected readonly fFeats = signal<Feats>({});
  protected readonly eName = signal('');
  protected readonly eFeats = signal<Feats>({});

  protected readonly activeCount = computed(() => this.tenants().filter((t) => t.is_active).length);
  protected readonly peopleCount = computed(() => this.tenants().reduce((n, t) => n + t.active_members, 0));
  protected readonly filtered = computed(() => {
    const q = normalize(this.query());
    return this.tenants().filter((t) => !q || normalize(t.name).includes(q) || t.slug.includes(q));
  });

  constructor() {
    void this.load();
  }

  protected err(field: string): string | null {
    return this.fieldErrors()[field] ?? null;
  }

  protected enabled(t: PlatformTenant): string[] {
    return PLATFORM_FEATURES.filter((f) => t.features[f.key]).map((f) => f.label);
  }

  protected setFeat(target: WritableSignal<Feats>, key: PlatformFeature, on: boolean): void {
    target.update((f) => ({ ...f, [key]: on }));
  }

  protected onName(v: string): void {
    this.fName.set(v);
    if (!this.slugTouched) this.fSlug.set(slugify(v));
  }

  protected onSlug(v: string): void {
    this.slugTouched = true;
    this.fSlug.set(v.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  }

  protected openCreate(): void {
    this.fName.set('');
    this.fSlug.set('');
    this.slugTouched = false;
    this.fZone.set('America/Guatemala');
    this.fAdmin.set('');
    this.fFeats.set({ reservations: true });
    this.resetForm();
    this.creating.set(true);
  }

  protected openEdit(t: PlatformTenant): void {
    this.eName.set(t.name);
    this.eFeats.set({ ...t.features });
    this.resetForm();
    this.editing.set(t);
  }

  protected async create(): Promise<void> {
    this.tried.set(true);
    if (!this.fName().trim() || !this.fSlug()) return;
    this.saving.set(true);
    this.resetForm(true);
    try {
      const t = await this.api.create({
        name: this.fName().trim(),
        slug: this.fSlug(),
        timezone: this.fZone(),
        admin_email: this.fAdmin().trim() || undefined,
        features: this.fFeats(),
      });
      this.tenants.update((list) => [...list, t].sort((a, b) => a.name.localeCompare(b.name)));
      this.creating.set(false);
      this.toast.success(
        this.fAdmin().trim()
          ? `${t.name} está lista. Avisamos por correo a ${this.fAdmin().trim()}.`
          : `${t.name} está lista. Falta invitar a quien la administre.`,
      );
    } catch (e) {
      this.fail(e);
    } finally {
      this.saving.set(false);
    }
  }

  protected async save(t: PlatformTenant): Promise<void> {
    if (!this.eName().trim()) {
      this.fieldErrors.set({ name: 'Escribe el nombre.' });
      return;
    }
    this.saving.set(true);
    this.resetForm(true);
    try {
      const updated = await this.api.update(t.id, { name: this.eName().trim(), features: this.eFeats() });
      this.replace(updated);
      this.editing.set(null);
      this.toast.success('Guardamos los cambios de la empresa.');
    } catch (e) {
      this.fail(e);
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggle(t: PlatformTenant): Promise<void> {
    const suspend = t.is_active;
    const ok = await this.confirm.ask({
      title: suspend ? `¿Suspender ${t.name}?` : `¿Reactivar ${t.name}?`,
      message: suspend
        ? `Nadie podrá entrar a la empresa y se cierran las sesiones de ${plural(t.active_members, 'persona', 'personas')} en la web y en la app. Sus datos se conservan.`
        : 'Sus personas podrán volver a iniciar sesión con sus cuentas.',
      confirmLabel: suspend ? 'Suspender' : 'Reactivar',
      tone: suspend ? 'danger' : 'primary',
    });
    if (!ok) return;
    this.busy.set(t.id);
    try {
      this.replace(await this.api.update(t.id, { is_active: !suspend }));
      this.toast.show(suspend ? `${t.name} quedó suspendida.` : `${t.name} está activa de nuevo.`);
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    } finally {
      this.busy.set(null);
    }
  }

  protected ago(iso: string | null): string {
    if (!iso) return 'Sin actividad';
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 2) return 'Ahora';
    if (min < 60) return `Hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `Hace ${h} h`;
    const d = Math.round(h / 24);
    return d === 1 ? 'Ayer' : `Hace ${d} días`;
  }

  private async load(): Promise<void> {
    try {
      this.tenants.set(await this.api.tenants());
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    } finally {
      this.loading.set(false);
    }
  }

  private replace(t: PlatformTenant): void {
    this.tenants.update((list) => list.map((x) => (x.id === t.id ? { ...x, ...t, members: x.members, active_members: x.active_members, last_activity: x.last_activity } : x)));
  }

  private resetForm(keepTried = false): void {
    this.fieldErrors.set({});
    this.formError.set(null);
    if (!keepTried) this.tried.set(false);
  }

  private fail(e: unknown): void {
    const err = toApiError(e);
    if (err.status === 409) {
      this.fieldErrors.set({ slug: 'Ya hay una empresa con ese identificador.' });
      return;
    }
    const fields: Record<string, string> = {};
    for (const f of ['name', 'slug', 'timezone', 'admin_email']) {
      const msg = err.field(f);
      if (msg) fields[f] = msg;
    }
    if (Object.keys(fields).length) this.fieldErrors.set(fields);
    else if (err.status === 422 && /slug/i.test(err.detail)) this.fieldErrors.set({ slug: err.detail });
    else this.formError.set(err.detail);
  }
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function slugify(s: string): string {
  return normalize(s).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 56);
}
