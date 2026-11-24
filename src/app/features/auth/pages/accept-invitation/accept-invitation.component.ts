import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthApi } from '../../../../core/auth/auth-api.service';
import { InvitationPreview } from '../../../../core/auth/auth.models';
import { TokenStorage } from '../../../../core/auth/token-storage';
import { ApiError, toApiError } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/services/toast.service';
import { SessionStore } from '../../../../core/store/session.store';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SpinnerComponent } from '../../../../shared/atoms/spinner/spinner.component';
import { TenantMarkComponent } from '../../../../shared/atoms/tenant-mark/tenant-mark.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { OtpInputComponent } from '../../../../shared/molecules/otp-input/otp-input.component';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { PasswordMeterComponent } from '../../components/password-meter/password-meter.component';
import { passwordError, stripTokenFromUrl } from '../../utils/password';

type Step = 'loading' | 'form' | 'totp' | 'invalid';

/**
 * Screen · Aceptar invitación (W-A5). Llega desde el correo
 * (`/invitacion?token=`). Quien no tiene cuenta escribe su nombre y crea su
 * contraseña; quien ya tiene cuenta (en otra empresa) entra con la suya y, si
 * usa verificación en dos pasos, con su código. Al aceptar queda dentro de la
 * empresa que lo invitó.
 */
@Component({
  selector: 'app-accept-invitation-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AuthShellComponent,
    RouterLink,
    DatePipe,
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
    <app-auth-shell>
      @switch (step()) {
        @case ('loading') {
          <div class="flex items-center justify-center gap-3 py-16 text-[13px] text-text-secondary">
            <app-spinner [size]="18" class="text-secondary" /> Revisando tu invitación…
          </div>
        }
        @case ('form') {
          @if (preview(); as p) {
            <form novalidate class="reveal" (submit)="submit($event)">
              <div class="mb-6 flex items-center gap-4 rounded-card border border-border-card bg-background/60 p-4">
                <app-tenant-mark [name]="p.tenant_name" [logo]="p.tenant_logo_url" [size]="52" />
                <div class="min-w-0">
                  <div class="text-[11px] uppercase tracking-[1px] text-text-secondary">Te invitaron a</div>
                  <div class="truncate font-display text-[21px] font-semibold text-primary">{{ p.tenant_name }}</div>
                  <div class="text-[12px] text-text-body">
                    Como <span class="font-bold">{{ p.role_name }}</span>@if (p.inviter_name) { · por {{ p.inviter_name }} }
                  </div>
                </div>
              </div>

              <h1 class="font-display text-[30px] font-semibold leading-tight tracking-display text-primary">
                {{ p.user_exists ? 'Entra para sumarte' : 'Crea tu acceso' }}
              </h1>
              <p class="mb-6 mt-2 text-[14px] leading-relaxed text-text-body">
                @if (p.user_exists) {
                  Ya tienes una cuenta de ARGOS con este correo. Escribe tu contraseña y la empresa aparecerá junto a las demás.
                } @else {
                  Con tu nombre y una contraseña entras al portal y a la app. La invitación vence el {{ p.expires_at | date: "d 'de' MMMM" }}.
                }
              </p>

              <app-form-field label="Correo electrónico" for="inv-email" class="mb-5">
                <app-input type="email" icon="mail" inputId="inv-email" [value]="p.email" [disabled]="true" />
              </app-form-field>

              @if (!p.user_exists) {
                <app-form-field label="Tu nombre completo" for="inv-name" [error]="nameMsg()" class="mb-5">
                  <app-input
                    icon="badge"
                    inputId="inv-name"
                    autocomplete="name"
                    placeholder="Como te conocen en el equipo"
                    [invalid]="!!nameMsg()"
                    [value]="fullName()"
                    (valueChange)="fullName.set($event)"
                    (blurred)="touched.set(true)"
                  />
                </app-form-field>
              }

              <app-form-field [label]="p.user_exists ? 'Tu contraseña' : 'Crea una contraseña'" for="inv-password" [error]="passwordMsg()" [class]="p.user_exists ? 'mb-6' : 'mb-2'">
                <app-input
                  type="password"
                  icon="lock"
                  inputId="inv-password"
                  [autocomplete]="p.user_exists ? 'current-password' : 'new-password'"
                  [placeholder]="p.user_exists ? 'La que ya usas en ARGOS' : 'Al menos 8 caracteres'"
                  [invalid]="!!passwordMsg()"
                  [value]="password()"
                  (valueChange)="password.set($event)"
                  (blurred)="touched.set(true)"
                />
              </app-form-field>
              @if (!p.user_exists) {
                <app-password-meter [value]="password()" class="mb-6" />
              }

              @if (error(); as err) {
                <p class="reveal-soft mb-4 flex items-start gap-2 rounded-sm bg-danger-soft px-3.5 py-2.5 text-[12.5px] text-danger" role="alert">
                  <app-icon name="alert" [size]="16" class="mt-px" /> {{ err }}
                </p>
              }
              <app-button variant="primary" size="lg" type="submit" [full]="true" [loading]="saving()">
                <span>{{ saving() ? 'Entrando…' : 'Aceptar y entrar' }}</span>
                @if (!saving()) {
                  <app-icon name="arrow-right" [size]="18" />
                }
              </app-button>
              @if (signedIn()) {
                <p class="mt-4 text-center text-[12px] text-text-secondary">
                  Al aceptar se cierra la sesión abierta en este navegador ({{ signedIn() }}).
                </p>
              }
            </form>
          }
        }
        @case ('totp') {
          <form novalidate class="reveal" (submit)="submit($event)">
            <button type="button" class="mb-6 flex items-center gap-1.5 rounded-xs text-[12.5px] font-bold text-text-secondary hover:text-primary" (click)="step.set('form')">
              <app-icon name="arrow-left" [size]="15" /> Volver
            </button>
            <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-tile bg-info-soft text-primary">
              <app-icon name="shield" [size]="24" />
            </div>
            <h1 class="font-display text-[30px] font-semibold leading-tight tracking-display text-primary">Verificación en dos pasos</h1>
            <p class="mb-7 mt-2 text-[14px] leading-relaxed text-text-body">Escribe el código de 6 dígitos de tu app de autenticación.</p>
            <app-otp-input [value]="totp()" (valueChange)="totp.set($event)" [invalid]="!!error()" (completed)="submit()" />
            @if (error(); as err) {
              <p class="reveal-soft mt-3 text-[12.5px] text-danger" role="alert">{{ err }}</p>
            }
            <div class="mt-7">
              <app-button variant="primary" size="lg" type="submit" [full]="true" [loading]="saving()">Verificar y entrar</app-button>
            </div>
          </form>
        }
        @case ('invalid') {
          <div class="reveal text-center">
            <div class="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-pill bg-warning-soft text-warning">
              <app-icon name="mail" [size]="30" />
            </div>
            <h1 class="font-display text-[32px] font-semibold leading-tight tracking-display text-primary">La invitación ya no sirve</h1>
            <p class="mx-auto mb-8 mt-3 max-w-[340px] text-[14px] leading-relaxed text-text-body">
              {{ invalidReason() }}
            </p>
            <app-button variant="primary" size="lg" [full]="true" (pressed)="router.navigateByUrl('/login')">Ir a iniciar sesión</app-button>
            <a routerLink="/" class="mt-4 inline-block text-[12.5px] font-bold text-text-secondary hover:text-primary">Conocer ARGOS</a>
          </div>
        }
      }
    </app-auth-shell>
  `,
})
export class AcceptInvitationComponent {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);
  protected readonly router = inject(Router);

  /** `?token=` del correo (withComponentInputBinding). */
  readonly token = input<string | undefined>();

  protected readonly step = signal<Step>('loading');
  protected readonly preview = signal<InvitationPreview | null>(null);
  protected readonly fullName = signal('');
  protected readonly password = signal('');
  protected readonly totp = signal('');
  protected readonly touched = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly invalidReason = signal(
    'Las invitaciones vencen a los 7 días, sirven una sola vez y quien invita puede cancelarlas. Pide una nueva a tu empresa.',
  );
  private readonly fieldErrors = signal<Record<string, string>>({});

  /** Correo de la sesión abierta en este navegador, si es otra persona. */
  protected readonly signedIn = computed(() => {
    const u = this.session.user();
    const p = this.preview();
    return u && p && u.email.toLowerCase() !== p.email.toLowerCase() ? u.email : null;
  });
  protected readonly nameMsg = computed(
    () => this.fieldErrors()['full_name'] ?? (this.touched() && !this.fullName().trim() ? 'Escribe tu nombre.' : null),
  );
  protected readonly passwordMsg = computed(() => {
    const server = this.fieldErrors()['password'];
    if (server) return server;
    if (!this.touched()) return null;
    if (this.preview()?.user_exists) return this.password() ? null : 'Escribe tu contraseña.';
    return passwordError(this.password());
  });

  constructor() {
    queueMicrotask(() => {
      void this.load(this.token());
      stripTokenFromUrl();
    });
  }

  private async load(token: string | undefined): Promise<void> {
    if (!token) {
      this.step.set('invalid');
      return;
    }
    try {
      this.preview.set(await this.api.previewInvitation(token));
      this.step.set('form');
    } catch (err) {
      const e = toApiError(err);
      if (e.status !== 404) this.invalidReason.set(e.detail);
      this.step.set('invalid');
    }
  }

  protected async submit(e?: Event): Promise<void> {
    e?.preventDefault();
    const p = this.preview();
    if (!p || this.saving()) return;
    this.touched.set(true);
    this.fieldErrors.set({});
    if (this.nameMsg() && !p.user_exists) return;
    if (this.passwordMsg()) return;
    if (this.step() === 'totp' && this.totp().length !== 6) {
      this.error.set('El código tiene 6 dígitos.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const res = await this.api.acceptInvitation({
        token: this.token() ?? '',
        password: this.password(),
        full_name: p.user_exists ? undefined : this.fullName().trim(),
        totp_code: this.step() === 'totp' ? this.totp() : undefined,
        device: TokenStorage.device(),
      });
      if (res.status !== 'authenticated') return;
      if (this.session.isAuthenticated()) await this.session.signOut();
      await this.session.establish(res, true);
      this.toast.success(`Te damos la bienvenida a ${p.tenant_name}.`);
      await this.router.navigateByUrl('/inicio');
    } catch (err) {
      this.handle(toApiError(err));
    } finally {
      this.saving.set(false);
    }
  }

  private handle(e: ApiError): void {
    if (e.status === 428) {
      this.step.set('totp');
      return;
    }
    if (e.status === 404) {
      this.step.set('invalid');
      return;
    }
    const fields: Record<string, string> = {};
    for (const f of ['password', 'full_name', 'totp_code']) {
      const msg = e.field(f);
      if (msg) fields[f] = msg;
    }
    this.fieldErrors.set(fields);
    if (fields['totp_code']) {
      this.totp.set('');
      this.error.set(fields['totp_code']);
    } else if (!Object.keys(fields).length) {
      this.error.set(e.detail);
    }
  }
}
