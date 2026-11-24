import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from '../../../../core/auth/auth-api.service';
import { SessionInfo, TotpSetup } from '../../../../core/auth/auth.models';
import { toApiError } from '../../../../core/http/api-error';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SessionStore } from '../../../../core/store/session.store';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SpinnerComponent } from '../../../../shared/atoms/spinner/spinner.component';
import { TenantMarkComponent } from '../../../../shared/atoms/tenant-mark/tenant-mark.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { OtpInputComponent } from '../../../../shared/molecules/otp-input/otp-input.component';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { TabOption, TabsComponent } from '../../../../shared/molecules/tabs/tabs.component';
import { PasswordMeterComponent } from '../../../auth/components/password-meter/password-meter.component';
import { passwordError } from '../../../auth/utils/password';

type Tab = 'datos' | 'seguridad' | 'sesiones';

/**
 * Screen · Mi perfil (fase01.md §5): datos de la cuenta, contraseña,
 * verificación en dos pasos con QR y dispositivos con sesión abierta. Es la
 * misma cuenta en todas las empresas y en la app.
 */
@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    TabsComponent,
    AvatarComponent,
    ButtonComponent,
    IconComponent,
    InputComponent,
    SpinnerComponent,
    TenantMarkComponent,
    FormFieldComponent,
    OtpInputComponent,
    PasswordMeterComponent,
  ],
  template: `
    @if (user(); as u) {
      <app-page-header eyebrow="Tu cuenta" [title]="u.nombre" [subtitle]="u.email" />

      <app-tabs class="mb-6" [options]="tabs()" [value]="current()" (valueChange)="go($event)" ariaLabel="Secciones del perfil" />

      @switch (current()) {
        @case ('datos') {
          <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <form novalidate class="card p-6" (submit)="saveProfile($event)">
              <div class="mb-6 flex items-center gap-4">
                <app-avatar [initials]="u.iniciales" [name]="u.nombre" [size]="64" />
                <div class="min-w-0">
                  <div class="font-display text-[20px] font-semibold text-primary">{{ u.nombre }}</div>
                  <div class="text-[12.5px] text-text-secondary">Tu retrato se genera con tu nombre en toda la plataforma.</div>
                </div>
              </div>
              <div class="grid gap-5 sm:grid-cols-2">
                <app-form-field label="Nombre completo" for="pf-name" [error]="nameError()">
                  <app-input inputId="pf-name" autocomplete="name" [invalid]="!!nameError()" [value]="name()" (valueChange)="name.set($event)" />
                </app-form-field>
                <app-form-field label="Teléfono" for="pf-phone" [optional]="true" hint="Lo ve tu equipo para coordinar.">
                  <app-input type="tel" icon="phone" inputId="pf-phone" autocomplete="tel" placeholder="+502 5555 0000" [value]="phone()" (valueChange)="phone.set($event)" />
                </app-form-field>
                <app-form-field label="Correo electrónico" for="pf-email" hint="Es tu usuario; para cambiarlo, habla con el administrador." class="sm:col-span-2">
                  <app-input type="email" icon="mail" inputId="pf-email" [value]="u.email" [disabled]="true" />
                </app-form-field>
              </div>
              <div class="mt-6 flex justify-end">
                <app-button type="submit" [loading]="savingProfile()" [disabled]="!profileDirty()">Guardar cambios</app-button>
              </div>
            </form>

            <div class="card p-6">
              <h2 class="mb-1 text-[15px] font-bold text-primary">Tus empresas</h2>
              <p class="mb-4 text-[12.5px] text-text-secondary">La misma cuenta sirve en todas; cambias desde la barra superior.</p>
              <ul class="flex flex-col gap-3">
                @for (m of memberships(); track m.tenant_id) {
                  <li class="flex items-center gap-3">
                    <app-tenant-mark [name]="m.tenant_name" [logo]="m.tenant_logo_url" [size]="36" />
                    <div class="min-w-0">
                      <div class="truncate text-[13px] font-bold text-primary">{{ m.tenant_name }}</div>
                      <div class="text-[11.5px] text-text-secondary">{{ m.role_name }}</div>
                    </div>
                  </li>
                }
                @if (platformAdmin()) {
                  <li class="flex items-center gap-3">
                    <app-tenant-mark name="ARGOS" logo="/brand/argos-mark.svg" [size]="36" />
                    <div class="min-w-0">
                      <div class="truncate text-[13px] font-bold text-primary">Administración ARGOS</div>
                      <div class="text-[11.5px] text-text-secondary">Empresas y bitácora de la plataforma</div>
                    </div>
                  </li>
                }
              </ul>
            </div>
          </div>
        }

        @case ('seguridad') {
          <div class="grid gap-5 lg:grid-cols-2">
            <form novalidate class="card p-6" (submit)="changePassword($event)">
              <h2 class="text-[15px] font-bold text-primary">Contraseña</h2>
              <p class="mb-5 mt-1 text-[12.5px] text-text-secondary">Al cambiarla cerramos tus sesiones en otros equipos; esta sigue abierta.</p>
              <app-form-field label="Contraseña actual" for="pw-current" [error]="pwErrors()['current_password'] ?? null" class="mb-4">
                <app-input type="password" icon="lock" inputId="pw-current" autocomplete="current-password" [value]="pwCurrent()" (valueChange)="pwCurrent.set($event)" />
              </app-form-field>
              <app-form-field label="Contraseña nueva" for="pw-new" [error]="pwNewError()" class="mb-2">
                <app-input type="password" icon="lock" inputId="pw-new" autocomplete="new-password" [value]="pwNew()" (valueChange)="pwNew.set($event)" />
              </app-form-field>
              <app-password-meter [value]="pwNew()" class="mb-4" />
              <app-form-field label="Repite la contraseña nueva" for="pw-confirm" [error]="pwConfirmError()" class="mb-6">
                <app-input type="password" icon="lock" inputId="pw-confirm" autocomplete="new-password" [value]="pwConfirm()" (valueChange)="pwConfirm.set($event)" />
              </app-form-field>
              <div class="flex justify-end">
                <app-button type="submit" [loading]="savingPassword()">Cambiar contraseña</app-button>
              </div>
            </form>

            <div class="card p-6">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="text-[15px] font-bold text-primary">Verificación en dos pasos</h2>
                  <p class="mt-1 text-[12.5px] text-text-secondary">Además de tu contraseña, un código de tu teléfono que cambia cada 30 segundos.</p>
                </div>
                <span class="shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold" [class]="u.totpEnabled ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'">
                  {{ u.totpEnabled ? 'Activa' : 'Inactiva' }}
                </span>
              </div>

              @if (!u.totpEnabled && !setup()) {
                <ul class="mb-6 mt-5 flex flex-col gap-2.5 text-[13px] text-text-body">
                  <li class="flex gap-2.5"><app-icon name="check" [size]="16" class="mt-0.5 text-success" /> Funciona con Google Authenticator, Microsoft Authenticator, 1Password o Authy.</li>
                  <li class="flex gap-2.5"><app-icon name="check" [size]="16" class="mt-0.5 text-success" /> Te lo pediremos al iniciar sesión en la web y en la app.</li>
                </ul>
                <app-button [loading]="settingUp()" (pressed)="startSetup()">
                  <app-icon name="shield" [size]="17" /> Activar
                </app-button>
              }

              @if (setup(); as s) {
                <div class="reveal mt-5 grid gap-5 sm:grid-cols-[176px_minmax(0,1fr)]">
                  <div class="flex h-[176px] w-[176px] items-center justify-center rounded-tile border border-border-card bg-white p-2">
                    @if (qr(); as src) {
                      <img [src]="src" alt="Código QR para tu app de autenticación" width="160" height="160" />
                    } @else {
                      <app-spinner [size]="20" class="text-secondary" />
                    }
                  </div>
                  <div class="min-w-0">
                    <ol class="flex flex-col gap-2 text-[13px] text-text-body">
                      <li><span class="font-bold text-primary">1.</span> Escanea el código con tu app de autenticación.</li>
                      <li><span class="font-bold text-primary">2.</span> Escribe el código de 6 dígitos que te muestra.</li>
                    </ol>
                    <div class="mt-3 text-[11.5px] text-text-secondary">¿No puedes escanear? Escribe esta clave:</div>
                    <button type="button" class="mt-1 flex items-center gap-2 rounded-field bg-background px-3 py-2 font-mono text-[12.5px] font-bold tracking-[1px] text-primary hover:bg-divider" (click)="copySecret(s.secret)">
                      <span class="break-all text-left">{{ grouped(s.secret) }}</span>
                      <app-icon name="copy" [size]="15" class="shrink-0 text-text-secondary" />
                    </button>
                  </div>
                </div>
                <form novalidate class="mt-5" (submit)="confirmSetup($event)">
                  <app-otp-input [value]="code()" (valueChange)="code.set($event)" [invalid]="!!codeError()" (completed)="confirmSetup()" />
                  @if (codeError(); as err) {
                    <p class="mt-2 text-[12.5px] text-danger" role="alert">{{ err }}</p>
                  }
                  <div class="mt-5 flex justify-end gap-2">
                    <app-button variant="tertiary" (pressed)="cancelSetup()">Cancelar</app-button>
                    <app-button type="submit" [loading]="confirming()">Activar</app-button>
                  </div>
                </form>
              }

              @if (u.totpEnabled) {
                @if (!disabling()) {
                  <p class="mb-5 mt-5 text-[13px] text-text-body">Si cambias de teléfono, desactívala aquí y vuelve a activarla con el nuevo.</p>
                  <app-button variant="tertiary" (pressed)="disabling.set(true)">Desactivar</app-button>
                } @else {
                  <form novalidate class="reveal mt-5" (submit)="disableTotp($event)">
                    <app-form-field label="Tu contraseña" for="tf-password" [error]="disableErrors()['password'] ?? null" class="mb-4">
                      <app-input type="password" icon="lock" inputId="tf-password" autocomplete="current-password" [value]="disablePassword()" (valueChange)="disablePassword.set($event)" />
                    </app-form-field>
                    <div class="mb-1.5 text-[12.5px] font-bold text-text-body">Código de tu app</div>
                    <app-otp-input [value]="code()" (valueChange)="code.set($event)" [invalid]="!!disableErrors()['code']" />
                    @if (disableErrors()['code']; as err) {
                      <p class="mt-2 text-[12.5px] text-danger" role="alert">{{ err }}</p>
                    }
                    <div class="mt-5 flex justify-end gap-2">
                      <app-button variant="tertiary" (pressed)="disabling.set(false)">Cancelar</app-button>
                      <app-button type="submit" variant="danger" [loading]="confirming()">Desactivar</app-button>
                    </div>
                  </form>
                }
              }
            </div>
          </div>
        }

        @case ('sesiones') {
          <div class="card overflow-hidden">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-6 py-4">
              <div>
                <h2 class="text-[15px] font-bold text-primary">Dónde tienes la sesión abierta</h2>
                <p class="mt-0.5 text-[12.5px] text-text-secondary">Si no reconoces un dispositivo, ciérralo y cambia tu contraseña.</p>
              </div>
              @if (sessions().length > 1) {
                <app-button variant="tertiary" [loading]="revokingAll()" (pressed)="revokeOthers()">Cerrar las demás</app-button>
              }
            </div>
            @if (loadingSessions()) {
              <div class="flex items-center gap-3 px-6 py-8 text-[13px] text-text-secondary"><app-spinner [size]="18" /> Cargando sesiones…</div>
            } @else {
              <ul>
                @for (s of sessions(); track s.id) {
                  <li class="flex items-center gap-4 border-b border-divider px-6 py-4 last:border-0">
                    <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile bg-background text-primary">
                      <app-icon [name]="s.platform === 'web' ? 'globe' : 'phone'" [size]="20" />
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="truncate text-[13.5px] font-bold text-primary">{{ deviceName(s) }}</span>
                        @if (s.current) {
                          <span class="rounded-pill bg-success-soft px-2 py-0.5 text-[10.5px] font-bold text-success">Esta sesión</span>
                        }
                      </div>
                      <div class="truncate text-[12px] text-text-secondary">
                        {{ s.tenant_name ?? 'Administración ARGOS' }} · {{ ago(s.last_used_at ?? s.created_at) }}@if (s.ip) { · {{ s.ip }} }
                      </div>
                    </div>
                    @if (!s.current) {
                      <app-button variant="tertiary" size="sm" [loading]="revoking() === s.id" (pressed)="revoke(s)">Cerrar</app-button>
                    }
                  </li>
                }
              </ul>
            }
          </div>
        }
      }
    }
  `,
  styles: `
    :host { display: block; }
    .card { border-radius: var(--radius-card); border: 1px solid var(--color-border-card); background: var(--color-surface); box-shadow: var(--shadow-e1); }
  `,
})
export class ProfileComponent {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  /** `?tab=` (withComponentInputBinding). */
  readonly tab = input<string | undefined>();

  protected readonly user = this.session.user;
  protected readonly memberships = this.session.memberships;
  protected readonly platformAdmin = this.session.isPlatformAdmin;
  protected readonly current = computed<Tab>(() => {
    const t = this.tab();
    return t === 'seguridad' || t === 'sesiones' ? t : 'datos';
  });

  // Datos
  protected readonly name = signal(this.session.user()?.nombre ?? '');
  protected readonly phone = signal(this.session.user()?.phone ?? '');
  protected readonly savingProfile = signal(false);
  protected readonly nameError = computed(() => (this.name().trim() ? null : 'Escribe tu nombre.'));
  protected readonly profileDirty = computed(() => {
    const u = this.user();
    return !!u && (this.name().trim() !== u.nombre || this.phone().trim() !== (u.phone ?? ''));
  });

  // Contraseña
  protected readonly pwCurrent = signal('');
  protected readonly pwNew = signal('');
  protected readonly pwConfirm = signal('');
  protected readonly pwTouched = signal(false);
  protected readonly pwErrors = signal<Partial<Record<string, string>>>({});
  protected readonly savingPassword = signal(false);
  protected readonly pwNewError = computed(
    () => this.pwErrors()['new_password'] ?? (this.pwTouched() ? passwordError(this.pwNew()) : null),
  );
  protected readonly pwConfirmError = computed(() =>
    this.pwTouched() && this.pwConfirm() !== this.pwNew() ? 'Las dos contraseñas no coinciden.' : null,
  );

  // 2FA
  protected readonly setup = signal<TotpSetup | null>(null);
  protected readonly qr = signal<string | null>(null);
  protected readonly code = signal('');
  protected readonly codeError = signal<string | null>(null);
  protected readonly settingUp = signal(false);
  protected readonly confirming = signal(false);
  protected readonly disabling = signal(false);
  protected readonly disablePassword = signal('');
  protected readonly disableErrors = signal<Partial<Record<string, string>>>({});

  // Sesiones
  protected readonly sessions = signal<readonly SessionInfo[]>([]);
  protected readonly loadingSessions = signal(false);
  protected readonly revoking = signal<string | null>(null);
  protected readonly revokingAll = signal(false);

  protected readonly tabs = computed<TabOption[]>(() => [
    { value: 'datos', label: 'Datos' },
    { value: 'seguridad', label: 'Seguridad' },
    { value: 'sesiones', label: 'Sesiones', count: this.sessions().length || null },
  ]);

  constructor() {
    // Al abrir el perfil (para el contador) y al volver a la pestaña de sesiones.
    effect(() => {
      this.current();
      untracked(() => void this.loadSessions());
    });
  }

  protected go(tab: string): void {
    void this.router.navigate([], { queryParams: { tab: tab === 'datos' ? null : tab }, queryParamsHandling: 'merge' });
  }

  protected async saveProfile(e: Event): Promise<void> {
    e.preventDefault();
    if (this.nameError() || !this.profileDirty()) return;
    this.savingProfile.set(true);
    try {
      const user = await this.api.updateMe({ full_name: this.name().trim(), phone: this.phone().trim() });
      this.session.patchUser(user);
      this.toast.success('Guardamos tus datos.');
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this.savingProfile.set(false);
    }
  }

  protected async changePassword(e: Event): Promise<void> {
    e.preventDefault();
    this.pwTouched.set(true);
    this.pwErrors.set({});
    if (!this.pwCurrent()) {
      this.pwErrors.set({ current_password: 'Escribe tu contraseña actual.' });
      return;
    }
    if (passwordError(this.pwNew()) || this.pwConfirm() !== this.pwNew()) return;
    this.savingPassword.set(true);
    try {
      await this.api.changePassword(this.pwCurrent(), this.pwNew());
      this.pwCurrent.set('');
      this.pwNew.set('');
      this.pwConfirm.set('');
      this.pwTouched.set(false);
      this.toast.success('Tu contraseña cambió. Cerramos tus otras sesiones.');
      void this.loadSessions();
    } catch (err) {
      const apiErr = toApiError(err);
      const fields: Record<string, string> = {};
      for (const f of ['current_password', 'new_password']) {
        const msg = apiErr.field(f);
        if (msg) fields[f] = msg;
      }
      if (Object.keys(fields).length) this.pwErrors.set(fields);
      else this.toast.error(apiErr.detail);
    } finally {
      this.savingPassword.set(false);
    }
  }

  protected async startSetup(): Promise<void> {
    this.settingUp.set(true);
    try {
      const s = await this.api.totpSetup();
      this.setup.set(s);
      this.code.set('');
      this.codeError.set(null);
      const QR = await import('qrcode');
      this.qr.set(await QR.toDataURL(s.otpauth_url, { margin: 1, width: 320, color: { dark: '#003841', light: '#ffffff' } }));
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this.settingUp.set(false);
    }
  }

  protected cancelSetup(): void {
    this.setup.set(null);
    this.qr.set(null);
    this.code.set('');
  }

  protected async confirmSetup(e?: Event): Promise<void> {
    e?.preventDefault();
    if (this.code().length !== 6) {
      this.codeError.set('El código tiene 6 dígitos.');
      return;
    }
    this.confirming.set(true);
    this.codeError.set(null);
    try {
      await this.api.totpConfirm(this.code());
      this.session.patchUser({ totp_enabled: true });
      this.cancelSetup();
      this.toast.success('Verificación en dos pasos activa. Te la pediremos al iniciar sesión.');
    } catch (err) {
      const apiErr = toApiError(err);
      this.codeError.set(apiErr.field('code') ?? apiErr.detail);
      this.code.set('');
    } finally {
      this.confirming.set(false);
    }
  }

  protected async disableTotp(e: Event): Promise<void> {
    e.preventDefault();
    this.disableErrors.set({});
    if (!this.disablePassword() || this.code().length !== 6) {
      this.disableErrors.set({
        ...(this.disablePassword() ? {} : { password: 'Escribe tu contraseña.' }),
        ...(this.code().length === 6 ? {} : { code: 'Escribe el código de 6 dígitos.' }),
      });
      return;
    }
    this.confirming.set(true);
    try {
      await this.api.totpDisable(this.disablePassword(), this.code());
      this.session.patchUser({ totp_enabled: false });
      this.disabling.set(false);
      this.disablePassword.set('');
      this.code.set('');
      this.toast.show('Desactivaste la verificación en dos pasos.');
    } catch (err) {
      const apiErr = toApiError(err);
      const fields: Record<string, string> = {};
      for (const f of ['password', 'code']) {
        const msg = apiErr.field(f);
        if (msg) fields[f] = msg;
      }
      if (Object.keys(fields).length) this.disableErrors.set(fields);
      else this.toast.error(apiErr.detail);
      this.code.set('');
    } finally {
      this.confirming.set(false);
    }
  }

  protected async copySecret(secret: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(secret);
      this.toast.show('Copiamos la clave.');
    } catch {
      this.toast.show('Selecciona la clave y cópiala a mano.');
    }
  }

  protected grouped(secret: string): string {
    return secret.replace(/(.{4})/g, '$1 ').trim();
  }

  private async loadSessions(): Promise<void> {
    this.loadingSessions.set(this.sessions().length === 0);
    try {
      this.sessions.set(await this.api.sessions());
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this.loadingSessions.set(false);
    }
  }

  protected async revoke(s: SessionInfo): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Cerrar la sesión en ${this.deviceName(s)}?`,
      message: 'Ese dispositivo tendrá que iniciar sesión de nuevo.',
      confirmLabel: 'Cerrar sesión',
      tone: 'danger',
    });
    if (!ok) return;
    this.revoking.set(s.id);
    try {
      await this.api.revokeSession(s.id);
      this.sessions.update((list) => list.filter((x) => x.id !== s.id));
      this.toast.show('Cerramos esa sesión.');
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this.revoking.set(null);
    }
  }

  protected async revokeOthers(): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Cerrar todas las demás sesiones?',
      message: 'Se cierra en los otros navegadores y en la app. Esta sesión sigue abierta.',
      confirmLabel: 'Cerrar las demás',
      tone: 'danger',
    });
    if (!ok) return;
    this.revokingAll.set(true);
    try {
      await this.api.revokeOtherSessions();
      this.sessions.update((list) => list.filter((x) => x.current));
      this.toast.show('Cerramos tus otras sesiones.');
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this.revokingAll.set(false);
    }
  }

  protected deviceName(s: SessionInfo): string {
    if (s.device_name) return s.device_name;
    return s.platform === 'web' ? 'Navegador' : s.platform === 'ios' ? 'iPhone' : 'Android';
  }

  protected ago(iso: string): string {
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return 'activa ahora';
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24);
    return d === 1 ? 'ayer' : `hace ${d} días`;
  }
}
