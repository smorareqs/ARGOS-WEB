import { ChangeDetectionStrategy, Component, Injectable, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Permission } from '../../../../core/auth/permissions';
import { ApiError, toApiError } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { SessionStore } from '../../../../core/store/session.store';
import { CompanyChanges, CompanySettings, RoleDef, RoleDraft, SettingsApi } from '../../services/settings-api.service';
import { PERMISSION_GROUPS } from '../../models/permission-labels';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { TabsComponent } from '../../../../shared/molecules/tabs/tabs.component';
import { BillingApi } from '../../../billing/services/billing-api.service';
import { BillingPanelComponent } from '../../../billing/components/billing-panel/billing-panel.component';
import { ApiKeysPanelComponent } from '../../../billing/components/api-keys-panel/api-keys-panel.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent, SelectOption } from '../../../../shared/atoms/select/select.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { TenantMarkComponent } from '../../../../shared/atoms/tenant-mark/tenant-mark.component';
import { gtq } from '../../../../shared/utils/time';
import { plural } from '../../../../shared/utils/plural';

const MODULES: readonly { key: keyof CompanySettings['features']; label: string; hint: string }[] = [
  { key: 'reservations', label: 'Reservas', hint: 'Calendario de ocupación, huéspedes, depósitos e iCal.' },
  { key: 'shared_areas', label: 'Áreas comunes', hint: 'Piscinas y salones reservables desde la app del huésped.' },
  { key: 'parking', label: 'Parqueos', hint: 'Espacios por edificio, placas y alarma de salida.' },
  { key: 'payroll', label: 'Nómina', hint: 'Cálculo quincenal con IGSS, Bono 14 y aguinaldo.' },
  { key: 'guest_chat', label: 'Chat con huéspedes', hint: 'Mensajes en tiempo real con cada reserva.' },
  { key: 'smart_locks', label: 'Cerraduras inteligentes', hint: 'Códigos de acceso por estancia.' },
];

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const LOGO_MAX = 2 * 1024 * 1024;

/** Tienda de Configuración (W-O1, W-O3, W-O4). Vive con la pantalla. */
@Injectable()
export class SettingsStore {
  private readonly api = inject(SettingsApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);
  private readonly _company = signal<CompanySettings | null>(null);
  private readonly _roles = signal<readonly RoleDef[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _busy = signal<string | null>(null);
  private readonly _saveError = signal<ApiError | null>(null);
  private readonly _progress = signal<number | null>(null);
  readonly company = this._company.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly saveError = this._saveError.asReadonly();
  /** Avance de la subida del logo (0–100) o null. */
  readonly progress = this._progress.asReadonly();

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const [c, r] = await Promise.all([this.api.company(), this.api.roles()]);
      this._company.set(c);
      this._roles.set(r);
    } catch (err) {
      this._error.set(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }

  async saveCompany(changes: CompanyChanges): Promise<boolean> {
    this._busy.set('company');
    this._saveError.set(null);
    try {
      const before = this._company();
      this._company.set(await this.api.saveCompany(changes));
      this.toast.success('Datos de la empresa guardados.');
      if (before?.name !== this._company()?.name) void this.session.reload();
      return true;
    } catch (err) {
      const e = toApiError(err);
      this._saveError.set(e);
      if (!e.errors.length) this.toast.error(e.detail);
      return false;
    } finally {
      this._busy.set(null);
    }
  }

  async uploadLogo(file: File): Promise<void> {
    this._busy.set('logo');
    this._progress.set(0);
    try {
      this._company.set(await this.api.uploadLogo(file, (p) => this._progress.set(p)));
      this.toast.success('Logo actualizado. Se ve en el portal, la app y los correos.');
      void this.session.reload();
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this._busy.set(null);
      this._progress.set(null);
    }
  }

  async removeLogo(): Promise<void> {
    this._busy.set('logo');
    try {
      this._company.set(await this.api.removeLogo());
      this.toast.show('Quitamos el logo.');
      void this.session.reload();
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this._busy.set(null);
    }
  }

  async createRole(draft: RoleDraft): Promise<RoleDef | ApiError> {
    this._busy.set('create-role');
    try {
      const r = await this.api.createRole(draft);
      this._roles.update((l) => [...l, r]);
      this.toast.success(`Creaste el rol ${r.name}. Asígnalo desde Colaboradores.`);
      return r;
    } catch (err) {
      return toApiError(err);
    } finally {
      this._busy.set(null);
    }
  }

  async updateRole(role: RoleDef, changes: Partial<RoleDraft>): Promise<boolean> {
    this._busy.set('role');
    try {
      const r = await this.api.updateRole(role.id, changes);
      this._roles.update((l) => l.map((x) => (x.id === r.id ? r : x)));
      this.toast.success(
        r.members
          ? `Guardamos ${r.name}. ${plural(r.members, 'persona verá', 'personas verán')} el cambio en su próxima acción.`
          : `Guardamos ${r.name}.`,
      );
      return true;
    } catch (err) {
      this.toast.error(toApiError(err).detail);
      return false;
    } finally {
      this._busy.set(null);
    }
  }

  async deleteRole(role: RoleDef): Promise<boolean> {
    this._busy.set('delete-role');
    try {
      await this.api.deleteRole(role.id);
      this._roles.update((l) => l.filter((x) => x.id !== role.id));
      this.toast.show(`Borraste el rol ${role.name}.`);
      return true;
    } catch (err) {
      this.toast.error(toApiError(err).detail);
      return false;
    } finally {
      this._busy.set(null);
    }
  }
}

/**
 * Screen · Configuración (W-O1 empresa y módulos, W-O2 usuarios → enlaza a
 * Colaboradores, W-O3 roles con matriz de permisos, W-O4 facturación).
 *
 * Los siete roles del sistema los mantiene ARGOS (solo lectura); la empresa
 * ajusta permisos con roles personalizados, por ejemplo duplicando uno. Nadie
 * puede dar un permiso que no tiene.
 */
@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    PageHeaderComponent,
    DemoDataNoteComponent,
    TabsComponent,
    EmptyStateComponent,
    FormFieldComponent,
    FormSheetComponent,
    DrawerComponent,
    ButtonComponent,
    IconComponent,
    InputComponent,
    SelectComponent,
    BadgeComponent,
    CheckboxComponent,
    TenantMarkComponent,
    BillingPanelComponent,
    ApiKeysPanelComponent,
  ],
  providers: [SettingsStore],
  template: `
    <app-page-header title="Configuración" eyebrow="Control" subtitle="Datos de la empresa, qué módulos usa, quién puede hacer qué y tu plan." />
    <app-demo-data-note module="settings" label="Configuración" />

    @if (store.error(); as err) {
      <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="error" title="No pudimos cargar la configuración" [message]="err" /></div>
    } @else {
      <app-tabs [options]="tabs" [value]="tab()" (valueChange)="go({ tab: $event === 'empresa' ? null : $event })" ariaLabel="Secciones de configuración" />
      <div class="mt-5">
        @if (store.loading()) {
          <div class="skeleton h-[480px] !rounded-card"></div>
        } @else {
          @switch (tab()) {
            @case ('empresa') {
              @if (store.company(); as c) {
                <form class="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]" novalidate (submit)="$event.preventDefault(); saveCompany()">
                  <section class="space-y-5 rounded-card border border-border-card bg-surface p-6 shadow-e1">
                    <div class="flex items-center gap-4">
                      <div class="relative">
                        <app-tenant-mark [name]="c.name" [logo]="c.logo_url" [size]="72" />
                        @if (store.progress() !== null) {
                          <div class="absolute inset-0 flex items-center justify-center rounded-tile bg-white/80 text-[12px] font-bold text-primary tabular">{{ store.progress() }}%</div>
                        }
                      </div>
                      <div class="min-w-0">
                        <div class="font-display text-[20px] font-semibold text-primary">{{ c.name }}</div>
                        <div class="mt-1 flex flex-wrap items-center gap-3">
                          <label class="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-bold text-teal-muted hover:text-primary" [class.pointer-events-none]="store.busy() === 'logo'">
                            <app-icon name="arrow-up-right" [size]="14" /> {{ c.logo_url ? 'Cambiar logo' : 'Subir logo' }}
                            <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" (change)="pickLogo($event)" />
                          </label>
                          @if (c.logo_url) {
                            <button type="button" class="text-[12.5px] font-bold text-text-secondary hover:text-danger" [disabled]="store.busy() === 'logo'" (click)="removeLogo()">Quitar</button>
                          }
                        </div>
                        <p class="text-[11.5px] text-text-secondary">PNG, JPG o WebP cuadrado, hasta 2 MB. Se ve en el portal, la app y los correos.</p>
                      </div>
                    </div>
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <app-form-field label="Nombre comercial" for="st-name" [required]="true" [error]="fieldError('name')"><app-input inputId="st-name" [compact]="true" [(value)]="fName" /></app-form-field>
                      <app-form-field label="Razón social" for="st-legal" [error]="fieldError('legal_name')"><app-input inputId="st-legal" [compact]="true" [(value)]="fLegal" /></app-form-field>
                      <app-form-field label="NIT" for="st-nit" [error]="fieldError('nit')"><app-input inputId="st-nit" [compact]="true" [mono]="true" [(value)]="fNit" /></app-form-field>
                      <app-form-field label="Zona horaria" [error]="fieldError('timezone')"><app-select [compact]="true" [options]="tzOptions" [(value)]="fTz" ariaLabel="Zona horaria" /></app-form-field>
                      <app-form-field label="Moneda" [error]="fieldError('currency')"><app-select [compact]="true" [options]="currencyOptions" [(value)]="fCurrency" ariaLabel="Moneda" /></app-form-field>
                      <div class="grid grid-cols-3 gap-3">
                        <app-form-field label="Check-in" for="st-in" [error]="fieldError('checkin_time')"><input id="st-in" type="time" class="field-native" [value]="fIn()" (input)="fIn.set($any($event.target).value)" /></app-form-field>
                        <app-form-field label="Check-out" for="st-out" [error]="fieldError('checkout_time')"><input id="st-out" type="time" class="field-native" [value]="fOut()" (input)="fOut.set($any($event.target).value)" /></app-form-field>
                        <app-form-field label="Alarma (min)" for="st-al" [error]="fieldError('checkout_alarm_minutes')"><input id="st-al" type="number" min="0" max="240" step="5" class="field-native tabular" [value]="fAlarm()" (input)="fAlarm.set($any($event.target).value)" /></app-form-field>
                      </div>
                    </div>
                    <app-form-field label="Instrucciones al huésped" for="st-ins" [hint]="varsHint" [error]="fieldError('guest_instructions')">
                      <textarea id="st-ins" rows="4" maxlength="2000" class="field-native" [value]="fInstr()" (input)="fInstr.set($any($event.target).value)"></textarea>
                    </app-form-field>
                  </section>
                  <section class="rounded-card border border-border-card bg-surface p-6 shadow-e1 xl:self-start">
                    <h2 class="text-[13px] font-bold text-primary">Módulos de tu plan</h2>
                    <p class="mt-1 text-[12px] text-text-secondary">Los activa ARGOS según tu plan. Para sumar uno, escríbenos.</p>
                    <ul class="mt-4 space-y-2.5">
                      @for (m of modules; track m.key) {
                        @let on = !!c.features[m.key];
                        @let included = inPlan(m.key);
                        <li class="flex items-start gap-3 rounded-field border border-border-card px-3.5 py-3" [class.bg-background]="!on">
                          <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-pill" [class]="on ? 'bg-success-soft text-success' : 'bg-divider text-text-muted'">
                            <app-icon [name]="on ? 'check' : included ? 'info' : 'lock'" [size]="12" />
                          </span>
                          <div class="min-w-0 flex-1">
                            <div class="text-[13px] font-bold" [class]="on ? 'text-primary' : 'text-text-secondary'">{{ m.label }}</div>
                            <div class="text-[12px] text-text-secondary">{{ on ? m.hint : included ? 'Incluido en tu plan: pide a ARGOS que lo active.' : 'No está en tu plan.' }}</div>
                          </div>
                        </li>
                      }
                    </ul>
                  </section>
                  <div class="flex justify-end xl:col-span-2">
                    <app-button variant="primary" type="submit" [disabled]="!companyDirty()" [loading]="store.busy() === 'company'">Guardar cambios</app-button>
                  </div>
                </form>
              }
            }
            @case ('roles') {
              <div class="grid grid-cols-1 gap-5 xl:grid-cols-[280px_1fr]">
                <aside class="rounded-card border border-border-card bg-surface p-2 shadow-e1 xl:self-start">
                  <div class="px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[1.2px] text-text-secondary">Del sistema</div>
                  @for (r of systemRoles(); track r.id) {
                    <button type="button" class="role flex w-full items-center gap-2.5 rounded-field px-3 py-2.5 text-left" [class.is-on]="r.key === roleKey()" (click)="go({ rol: r.key })">
                      <span class="min-w-0 flex-1">
                        <span class="flex items-center gap-1.5 text-[13px] font-bold text-primary">{{ r.name }} <app-icon name="lock" [size]="12" class="text-text-muted" /></span>
                        <span class="block text-[11.5px] text-text-secondary">{{ r.permissions.length }} permisos · {{ people(r.members) }}</span>
                      </span>
                    </button>
                  }
                  <div class="px-3 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[1.2px] text-text-secondary">De tu empresa</div>
                  @for (r of customRoles(); track r.id) {
                    <button type="button" class="role flex w-full items-center gap-2.5 rounded-field px-3 py-2.5 text-left" [class.is-on]="r.key === roleKey()" (click)="go({ rol: r.key })">
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-[13px] font-bold text-primary">{{ r.name }}</span>
                        <span class="block text-[11.5px] text-text-secondary">{{ r.permissions.length }} permisos · {{ people(r.members) }}</span>
                      </span>
                    </button>
                  } @empty {
                    <p class="px-3 py-2 text-[12px] text-text-secondary">Aún no hay roles propios.</p>
                  }
                  @if (canEditRoles()) {
                    <button type="button" class="mt-1 flex w-full items-center gap-2 rounded-field px-3 py-2.5 text-[12.5px] font-bold text-action hover:bg-surface-soft" (click)="openNew(null)">
                      <app-icon name="plus" [size]="15" /> Nuevo rol
                    </button>
                  }
                  <a routerLink="/colaboradores" class="mt-1 flex items-center gap-2 rounded-field px-3 py-2.5 text-[12.5px] font-bold text-teal-muted hover:bg-surface-soft hover:text-primary"><app-icon name="employees" [size]="15" /> Usuarios e invitaciones</a>
                </aside>
                @if (role(); as r) {
                  <section class="rounded-card border border-border-card bg-surface shadow-e1">
                    <header class="flex flex-wrap items-center gap-3 border-b border-divider px-5 py-4">
                      <div class="mr-auto min-w-0">
                        @if (r.is_system || !canEditRoles()) {
                          <h2 class="font-display text-[20px] font-semibold text-primary">{{ r.name }}</h2>
                        } @else {
                          <input class="name-input font-display text-[20px] font-semibold text-primary" [value]="dName()" (input)="dName.set($any($event.target).value)" aria-label="Nombre del rol" maxlength="128" />
                        }
                        <p class="text-[12px] text-text-secondary">
                          @if (r.is_system) {
                            Rol del sistema: lo mantiene ARGOS y se actualiza solo. Para ajustarlo, duplícalo.
                          } @else {
                            {{ r.description || 'Rol personalizado de tu empresa.' }}
                          }
                          @if (r.scoped && (r.is_system || !canEditRoles())) { Solo ve sus propiedades asignadas o propias. }
                        </p>
                        @if (!r.is_system && canEditRoles()) {
                          <div class="mt-2"><app-checkbox [(checked)]="dScoped">Solo ve sus propiedades asignadas o propias</app-checkbox></div>
                        }
                      </div>
                      @if (dirty()) { <app-badge tone="warning">{{ changes() }} {{ changes() === 1 ? 'cambio' : 'cambios' }} sin guardar</app-badge> }
                      @if (canEditRoles()) {
                        @if (r.is_system) {
                          <app-button variant="tertiary" size="sm" (pressed)="openNew(r)"><app-icon name="copy" [size]="15" /> Duplicar</app-button>
                        } @else {
                          <app-button variant="ghost" size="sm" [disabled]="r.members > 0" [loading]="store.busy() === 'delete-role'" (pressed)="deleteRole(r)">
                            <app-icon name="trash" [size]="15" /> Borrar
                          </app-button>
                          <app-button variant="ghost" size="sm" [disabled]="!dirty()" (pressed)="resetDraft()">Descartar</app-button>
                          <app-button variant="primary" size="sm" [disabled]="!dirty() || !draft().size" [loading]="store.busy() === 'role'" (pressed)="saveRole(r)">Guardar</app-button>
                        }
                      }
                    </header>
                    @if (!r.is_system && r.members > 0 && canEditRoles()) {
                      <p class="border-b border-divider bg-background/60 px-5 py-2.5 text-[12px] text-text-body">
                        {{ people(r.members) }} con este rol. Para borrarlo, cámbialas de rol en Colaboradores.
                      </p>
                    }
                    <div class="divide-y divide-divider">
                      @for (g of groups; track g.module) {
                        <div class="px-5 py-4">
                          <div class="mb-2 flex items-center justify-between">
                            <h3 class="text-[11px] font-bold uppercase tracking-[1.2px] text-secondary">{{ g.module }}</h3>
                            <span class="tabular text-[11.5px] text-text-secondary">{{ countIn(g.items) }}/{{ g.items.length }}</span>
                          </div>
                          <div class="grid grid-cols-1 gap-x-6 gap-y-1.5 md:grid-cols-2">
                            @for (p of g.items; track p.key) {
                              @let blocked = !grantable(p.key);
                              <div class="flex items-center justify-between gap-3 rounded-sm px-1 py-1" [class.is-changed]="changedKey(p.key)" [attr.title]="blocked && !r.is_system ? 'No puedes dar un permiso que tú no tienes.' : null">
                                <app-checkbox [checked]="draft().has(p.key)" [disabled]="r.is_system || !canEditRoles() || blocked" (checkedChange)="togglePerm(p.key, $event)">{{ p.label }}</app-checkbox>
                                @if (blocked && !r.is_system) { <app-icon name="lock" [size]="12" class="shrink-0 text-text-muted" /> }
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  </section>
                } @else {
                  <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="search" title="Ese rol ya no existe" message="Elige otro de la lista." /></div>
                }
              </div>

              <app-drawer [open]="newOpen()" (openChange)="!$event && newOpen.set(false)" label="Nuevo rol" [width]="460">
                @if (newOpen()) {
                  <app-form-sheet
                    eyebrow="Roles y permisos"
                    title="Nuevo rol"
                    subtitle="Después ajustas los permisos en la matriz y lo asignas desde Colaboradores."
                    spot="roles"
                    submitLabel="Crear rol"
                    [saving]="store.busy() === 'create-role'"
                    [error]="newError()"
                    (submitted)="createRole()"
                    (cancel)="newOpen.set(false)"
                  >
                    <app-form-field label="Nombre" for="nr-name" [required]="true" [error]="newField('name') ?? (newTried() && nName().trim().length < 2 ? 'Escribe un nombre de al menos 2 letras.' : null)">
                      <app-input inputId="nr-name" placeholder="Ej. Supervisor de noche" [value]="nName()" (valueChange)="nName.set($event)" />
                    </app-form-field>
                    <app-form-field label="Descripción" for="nr-desc" [optional]="true">
                      <app-input inputId="nr-desc" placeholder="Para qué sirve, en una línea" [value]="nDesc()" (valueChange)="nDesc.set($event)" />
                    </app-form-field>
                    <app-form-field label="Empezar con los permisos de" [error]="newField('permissions') ?? (newTried() && !nBase() ? 'Elige un rol de partida.' : null)">
                      <app-select [options]="baseOptions()" [(value)]="nBase" placeholder="Elige un rol" ariaLabel="Rol de partida" />
                    </app-form-field>
                    <app-checkbox [(checked)]="nScoped">Solo ve sus propiedades asignadas o propias (como limpieza, mantenimiento o propietarios)</app-checkbox>
                    <p class="text-[12px] text-text-secondary">Solo se copian los permisos que tú también tienes.</p>
                  </app-form-sheet>
                }
              </app-drawer>
            }
            @case ('integraciones') {
              <app-api-keys-panel />
            }
            @default {
              <app-billing-panel />
            }
          }
        }
      </div>
    }
  `,
  styles: `
    .role { transition: background-color var(--dur-fast); }
    .role:hover { background: var(--color-surface-soft); }
    .role.is-on { background: var(--color-teal-washed); box-shadow: inset 3px 0 0 var(--color-primary); }
    .is-changed { background: rgba(197, 135, 60, 0.1); }
    .name-input { width: 100%; max-width: 420px; border-radius: 8px; padding: 0 6px; margin-left: -6px; background: transparent; outline: none;
      transition: background-color var(--dur-fast), box-shadow var(--dur-fast); }
    .name-input:hover { background: var(--color-surface-soft); }
    .name-input:focus { background: #fff; box-shadow: 0 0 0 2px var(--color-secondary); }
  `,
})
export class SettingsComponent {
  protected readonly store = inject(SettingsStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly session = inject(SessionStore);
  private readonly billingApi = inject(BillingApi);

  readonly tab = input<string, string | undefined>('empresa', { transform: (v) => v || 'empresa' });
  readonly rol = input<string | undefined>();

  protected readonly modules = MODULES;
  protected readonly varsHint = 'Variables: {{huesped}}, {{propiedad}}, {{fecha_entrada}}, {{hora_entrada}}';
  protected readonly groups = PERMISSION_GROUPS;
  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly people = (n: number) => plural(n, 'persona', 'personas');
  /** Facturación con tenant.billing e Integraciones (claves API) con tenant.settings. */
  protected readonly tabs = [
    { value: 'empresa', label: 'Empresa' },
    { value: 'roles', label: 'Roles y permisos' },
    ...(this.session.can('tenant.settings') ? [{ value: 'integraciones', label: 'Integraciones' }] : []),
    ...(this.session.can('tenant.billing') ? [{ value: 'facturacion', label: 'Facturación' }] : []),
  ];
  protected readonly tzOptions: SelectOption[] = [
    { value: 'America/Guatemala', label: 'Guatemala (UTC−6)' },
    { value: 'America/El_Salvador', label: 'El Salvador (UTC−6)' },
    { value: 'America/Tegucigalpa', label: 'Honduras (UTC−6)' },
    { value: 'America/Costa_Rica', label: 'Costa Rica (UTC−6)' },
    { value: 'America/Mexico_City', label: 'Ciudad de México (UTC−6)' },
    { value: 'America/Panama', label: 'Panamá (UTC−5)' },
  ];
  protected readonly currencyOptions: SelectOption[] = [
    { value: 'GTQ', label: 'Quetzal (Q)' },
    { value: 'USD', label: 'Dólar (US$)' },
  ];
  protected readonly canEditRoles = computed(() => this.session.can('roles.manage'));

  // Empresa
  protected readonly fName = signal('');
  protected readonly fLegal = signal('');
  protected readonly fNit = signal('');
  protected readonly fTz = signal('');
  protected readonly fCurrency = signal('');
  protected readonly fIn = signal('');
  protected readonly fOut = signal('');
  protected readonly fAlarm = signal('');
  protected readonly fInstr = signal('');
  protected readonly companyDirty = computed(() => {
    const c = this.store.company();
    if (!c) return false;
    return Object.keys(this.companyChanges(c)).length > 0;
  });

  // Roles
  protected readonly systemRoles = computed(() => this.store.roles().filter((r) => r.is_system));
  protected readonly customRoles = computed(() => this.store.roles().filter((r) => !r.is_system));
  protected readonly roleKey = computed(() => this.rol() ?? 'supervisor');
  protected readonly role = computed(() => this.store.roles().find((r) => r.key === this.roleKey()) ?? null);
  protected readonly draft = signal<ReadonlySet<Permission>>(new Set());
  protected readonly dName = signal('');
  /** Alcance del rol: solo ve sus propiedades asignadas o propias. */
  protected readonly dScoped = signal(false);
  protected readonly changes = computed(() => {
    const r = this.role();
    if (!r) return 0;
    const orig = new Set(r.permissions);
    let n = this.dName().trim() && this.dName().trim() !== r.name ? 1 : 0;
    if (this.dScoped() !== r.scoped) n++;
    for (const p of this.draft()) if (!orig.has(p)) n++;
    for (const p of orig) if (!this.draft().has(p)) n++;
    return n;
  });
  protected readonly dirty = computed(() => !this.role()?.is_system && this.changes() > 0);

  // Nuevo rol
  protected readonly newOpen = signal(false);
  protected readonly nName = signal('');
  protected readonly nDesc = signal('');
  protected readonly nBase = signal('');
  protected readonly nScoped = signal(false);
  protected readonly newTried = signal(false);
  protected readonly newError = signal<string | null>(null);
  private readonly newFields = signal<Record<string, string>>({});
  protected readonly baseOptions = computed<SelectOption[]>(() =>
    this.store.roles().map((r) => ({ value: r.key, label: `${r.name} (${r.permissions.length} permisos)` })),
  );

  /** Funcionalidades del plan (W-O1: candado en las que no incluye). null = sin dato. */
  private readonly planFeatures = signal<readonly string[] | null>(null);
  protected inPlan(key: string): boolean {
    return this.planFeatures()?.includes(key) ?? false;
  }

  constructor() {
    void this.store.load();
    if (this.session.can('tenant.billing')) {
      this.billingApi.overview().then((o) => this.planFeatures.set(o.subscription.limits.features), () => this.planFeatures.set(null));
    }
    effect(() => {
      const c = this.store.company();
      if (!c) return;
      untracked(() => {
        this.fName.set(c.name);
        this.fLegal.set(c.legal_name);
        this.fNit.set(c.nit);
        this.fTz.set(c.timezone);
        this.fCurrency.set(c.currency);
        this.fIn.set(c.checkin_time);
        this.fOut.set(c.checkout_time);
        this.fAlarm.set(String(c.checkout_alarm_minutes));
        this.fInstr.set(c.guest_instructions);
      });
    });
    effect(() => {
      const r = this.role();
      untracked(() => {
        this.draft.set(new Set(r?.permissions ?? []));
        this.dName.set(r?.name ?? '');
        this.dScoped.set(r?.scoped ?? false);
      });
    });
  }

  protected go(params: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected asDate(k: string): Date {
    return new Date(`${k}T12:00:00`);
  }

  protected fieldError(field: string): string | null {
    return this.store.saveError()?.field(field) ?? null;
  }

  protected pickLogo(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      this.toast.error('Sube el logo en PNG, JPG o WebP.');
      return;
    }
    if (file.size > LOGO_MAX) {
      this.toast.error('El logo debe pesar menos de 2 MB.');
      return;
    }
    void this.store.uploadLogo(file);
  }

  protected removeLogo(): void {
    void this.store.removeLogo();
  }

  protected saveCompany(): void {
    const c = this.store.company();
    if (!c) return;
    const changes = this.companyChanges(c);
    if (Object.keys(changes).length) void this.store.saveCompany(changes);
  }

  private companyChanges(c: CompanySettings): CompanyChanges {
    const next: Record<string, string | number> = {
      name: this.fName().trim(),
      legal_name: this.fLegal().trim(),
      nit: this.fNit().trim(),
      timezone: this.fTz(),
      currency: this.fCurrency(),
      checkin_time: this.fIn(),
      checkout_time: this.fOut(),
      checkout_alarm_minutes: Math.max(0, Number(this.fAlarm()) || 0),
      guest_instructions: this.fInstr(),
    };
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(next)) {
      if (v !== (c as unknown as Record<string, unknown>)[k]) out[k] = v;
    }
    return out as CompanyChanges;
  }

  /** Solo se dan permisos que uno tiene (los de alcance propio, *.own, sí). */
  protected grantable(p: Permission): boolean {
    return p.endsWith('.own') || this.session.can(p);
  }
  protected countIn(items: readonly { key: Permission }[]): number {
    return items.filter((i) => this.draft().has(i.key)).length;
  }
  protected changedKey(p: Permission): boolean {
    return this.draft().has(p) !== (this.role()?.permissions.includes(p) ?? false);
  }
  protected togglePerm(p: Permission, on: boolean): void {
    this.draft.update((s) => {
      const n = new Set(s);
      if (on) n.add(p);
      else n.delete(p);
      return n;
    });
  }
  protected resetDraft(): void {
    this.draft.set(new Set(this.role()?.permissions ?? []));
    this.dName.set(this.role()?.name ?? '');
    this.dScoped.set(this.role()?.scoped ?? false);
  }

  protected async saveRole(r: RoleDef): Promise<void> {
    const name = this.dName().trim();
    await this.store.updateRole(r, {
      ...(name && name !== r.name ? { name } : {}),
      ...(this.dScoped() !== r.scoped ? { scoped: this.dScoped() } : {}),
      permissions: [...this.draft()],
    });
  }

  protected async deleteRole(r: RoleDef): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Borrar el rol ${r.name}?`,
      message: 'Nadie lo tiene asignado. Esta acción no se puede deshacer.',
      confirmLabel: 'Borrar rol',
      tone: 'danger',
    });
    if (ok && (await this.store.deleteRole(r))) this.go({ rol: null });
  }

  protected openNew(base: RoleDef | null): void {
    this.nName.set(base ? `${base.name} (copia)` : '');
    this.nDesc.set('');
    this.nBase.set(base?.key ?? '');
    this.nScoped.set(base?.scoped ?? false);
    this.newTried.set(false);
    this.newError.set(null);
    this.newFields.set({});
    this.newOpen.set(true);
  }

  protected newField(f: string): string | null {
    return this.newFields()[f] ?? null;
  }

  protected async createRole(): Promise<void> {
    this.newTried.set(true);
    const base = this.store.roles().find((r) => r.key === this.nBase());
    if (this.nName().trim().length < 2 || !base) return;
    const permissions = base.permissions.filter((p) => this.grantable(p));
    const res = await this.store.createRole({
      name: this.nName().trim(),
      description: this.nDesc().trim() || null,
      permissions,
      scoped: this.nScoped(),
    });
    if (res instanceof ApiError) {
      const fields: Record<string, string> = {};
      for (const f of ['name', 'permissions']) {
        const msg = res.field(f);
        if (msg) fields[f] = msg;
      }
      this.newFields.set(fields);
      if (!Object.keys(fields).length) this.newError.set(res.detail);
      return;
    }
    this.newOpen.set(false);
    this.go({ tab: 'roles', rol: res.key });
  }

}
