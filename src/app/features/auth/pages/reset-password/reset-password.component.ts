import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthApi } from '../../../../core/auth/auth-api.service';
import { toApiError } from '../../../../core/http/api-error';
import { SessionStore } from '../../../../core/store/session.store';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { AuthShellComponent } from '../../components/auth-shell/auth-shell.component';
import { PasswordMeterComponent } from '../../components/password-meter/password-meter.component';
import { passwordError, stripTokenFromUrl } from '../../utils/password';

type Step = 'form' | 'done' | 'invalid';

/**
 * Screen · Crear contraseña nueva (W-A4). Llega desde el enlace del correo de
 * recuperación (`/restablecer?token=`). El token se quita de la barra de
 * direcciones al leerlo. Al guardar se cierran todas las sesiones abiertas.
 */
@Component({
  selector: 'app-reset-password-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuthShellComponent, RouterLink, ButtonComponent, IconComponent, InputComponent, FormFieldComponent, PasswordMeterComponent],
  template: `
    <app-auth-shell>
      @switch (step()) {
        @case ('form') {
          <form novalidate class="reveal" (submit)="submit($event)">
            <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-tile bg-info-soft text-primary">
              <app-icon name="lock" [size]="24" />
            </div>
            <h1 class="font-display text-[32px] font-semibold leading-tight tracking-display text-primary">Crea una contraseña nueva</h1>
            <p class="mb-7 mt-2 text-[14px] leading-relaxed text-text-body">
              Al guardarla cerramos tus sesiones abiertas en otros equipos y en la app.
            </p>

            <app-form-field label="Contraseña nueva" for="reset-password" [error]="passwordMsg()" class="mb-2">
              <app-input
                type="password"
                icon="lock"
                inputId="reset-password"
                autocomplete="new-password"
                placeholder="Al menos 8 caracteres"
                [invalid]="!!passwordMsg()"
                [value]="password()"
                (valueChange)="password.set($event)"
                (blurred)="touched.set(true)"
              />
            </app-form-field>
            <app-password-meter [value]="password()" class="mb-5" />

            <app-form-field label="Repite la contraseña" for="reset-confirm" [error]="confirmMsg()" class="mb-6">
              <app-input
                type="password"
                icon="lock"
                inputId="reset-confirm"
                autocomplete="new-password"
                [invalid]="!!confirmMsg()"
                [value]="confirm()"
                (valueChange)="confirm.set($event)"
                (blurred)="touched.set(true)"
              />
            </app-form-field>

            @if (error(); as err) {
              <p class="reveal-soft mb-4 flex items-start gap-2 rounded-sm bg-danger-soft px-3.5 py-2.5 text-[12.5px] text-danger" role="alert">
                <app-icon name="alert" [size]="16" class="mt-px" /> {{ err }}
              </p>
            }
            <app-button variant="primary" size="lg" type="submit" [full]="true" [loading]="saving()">
              {{ saving() ? 'Guardando…' : 'Guardar contraseña' }}
            </app-button>
          </form>
        }
        @case ('done') {
          <div class="reveal text-center">
            <div class="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-pill bg-success-soft text-success">
              <app-icon name="check" [size]="32" />
            </div>
            <h1 class="font-display text-[32px] font-semibold leading-tight tracking-display text-primary">Listo, ya puedes entrar</h1>
            <p class="mx-auto mb-8 mt-3 max-w-[340px] text-[14px] leading-relaxed text-text-body">
              Tu contraseña cambió y cerramos las demás sesiones. Te enviamos un correo de aviso.
            </p>
            <app-button variant="primary" size="lg" [full]="true" (pressed)="router.navigateByUrl('/login')">Iniciar sesión</app-button>
          </div>
        }
        @case ('invalid') {
          <div class="reveal text-center">
            <div class="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-pill bg-warning-soft text-warning">
              <app-icon name="clock" [size]="30" />
            </div>
            <h1 class="font-display text-[32px] font-semibold leading-tight tracking-display text-primary">El enlace ya no sirve</h1>
            <p class="mx-auto mb-8 mt-3 max-w-[340px] text-[14px] leading-relaxed text-text-body">
              Los enlaces para restablecer la contraseña sirven una sola vez y vencen en 1 hora. Pide uno nuevo.
            </p>
            <app-button variant="primary" size="lg" [full]="true" (pressed)="router.navigateByUrl('/login?recuperar=1')">
              Pedir otro enlace
            </app-button>
            <a routerLink="/login" class="mt-4 inline-block text-[12.5px] font-bold text-text-secondary hover:text-primary">Volver a iniciar sesión</a>
          </div>
        }
      }
    </app-auth-shell>
  `,
})
export class ResetPasswordComponent {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionStore);
  protected readonly router = inject(Router);

  /** `?token=` del correo (withComponentInputBinding). */
  readonly token = input<string | undefined>();

  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly touched = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly serverField = signal<string | null>(null);
  private readonly forced = signal<Step | null>(null);

  protected readonly step = computed<Step>(() => this.forced() ?? (this.token() ? 'form' : 'invalid'));
  protected readonly passwordMsg = computed(
    () => this.serverField() ?? (this.touched() ? passwordError(this.password()) : null),
  );
  protected readonly confirmMsg = computed(() =>
    this.touched() && this.confirm() !== this.password() ? 'Las dos contraseñas no coinciden.' : null,
  );

  constructor() {
    // El token ya quedó en el input: se quita de la barra para que no se comparta ni quede en el historial.
    queueMicrotask(() => stripTokenFromUrl());
  }

  protected async submit(e: Event): Promise<void> {
    e.preventDefault();
    this.touched.set(true);
    this.serverField.set(null);
    if (passwordError(this.password()) || this.confirm() !== this.password()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.resetPassword(this.token() ?? '', this.password());
      // Si había una sesión abierta en este navegador, también se cerró.
      if (this.session.isAuthenticated()) await this.session.signOut();
      this.forced.set('done');
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.status === 404) this.forced.set('invalid');
      else if (apiErr.field('new_password')) this.serverField.set(apiErr.field('new_password'));
      else this.error.set(apiErr.detail);
    } finally {
      this.saving.set(false);
    }
  }
}
