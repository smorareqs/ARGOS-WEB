import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { LogoComponent } from '../../../../shared/atoms/logo/logo.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';

/**
 * Template · pantalla de login (panel de marca + panel de formulario).
 * Define el layout estructural y dónde van los átomos/moléculas, SIN inyectar
 * stores ni servicios de datos (§6 · Templates). El estado real lo pasa la
 * pantalla (screen) vía model()/inputs y recibe la acción vía submit.
 *
 * Mobile-first (ARCHITECTURE.md §9), a sangre completa (full-bleed):
 *  - base  → una sola columna: cabecera de marca compacta + formulario.
 *  - md+   → split 46% marca / formulario que llena toda la ventana.
 * Ref: ARGOS Web · Frame 01 · Inicio de sesión.
 */
@Component({
  selector: 'app-login-template',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LogoComponent, IconComponent, ButtonComponent, InputComponent, FormFieldComponent],
  template: `
    <div
      class="flex min-h-[100dvh] w-full flex-1 flex-col overflow-hidden bg-surface md:flex-row"
    >
      <!-- ── Panel de marca ── -->
      <div
        class="relative flex shrink-0 flex-col justify-between overflow-hidden bg-primary px-6 py-8 sm:px-10 md:w-[46%] md:py-[52px] md:pl-[52px] md:pr-[52px]"
      >
        <div
          class="pointer-events-none absolute -right-[140px] -top-[140px] h-[420px] w-[420px] rounded-pill"
          style="background: radial-gradient(circle, rgba(197,135,60,0.20), rgba(197,135,60,0) 70%)"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-[180px] -left-[120px] hidden h-[380px] w-[380px] rounded-pill md:block"
          style="background: radial-gradient(circle, rgba(255,255,255,0.05), rgba(255,255,255,0) 70%)"
        ></div>

        <div class="relative z-[2]">
          <app-logo [size]="22" tone="light" />
        </div>

        <!-- Titular: visible en md+; en móvil se muestra una versión compacta -->
        <div class="relative z-[2] mt-7 md:mt-0">
          <h1
            class="font-display font-semibold leading-[1.15] text-white text-[34px] sm:text-[40px] md:text-[46px]"
          >
            El control total<br class="hidden sm:block" />
            de tu operación.
          </h1>
          <p class="mt-3 w-full max-w-[380px] text-[13px] leading-[1.7] text-white/60 sm:text-[14px] md:mt-[18px]">
            Itinerarios, personal, bitácora, inventario y mantenimiento de tus propiedades — en un
            solo lugar.
          </p>
        </div>

        <div class="relative z-[2] mt-7 text-[11.5px] tracking-[0.3px] text-white/35 md:mt-0">
          © 2026 ARGOS · Tenant aislado — {{ tenant() }}
        </div>
      </div>

      <!-- ── Panel de formulario ── -->
      <div class="flex flex-1 items-center justify-center bg-surface-soft px-6 py-10 sm:px-10 md:p-12">
        <form class="w-full max-w-[380px]" (submit)="onSubmit($event)">
          <h2 class="font-display text-[28px] font-semibold text-primary sm:text-[32px]">
            Bienvenido de nuevo
          </h2>
          <p class="mb-[34px] mt-2 text-[13.5px] text-text-secondary">
            Ingresa a tu panel de administración.
          </p>

          <app-form-field label="Correo electrónico" class="mb-5">
            <app-input
              type="email"
              icon="mail"
              autocomplete="email"
              ariaLabel="Correo electrónico"
              placeholder="admin@costalimpia.com"
              [(value)]="email"
            />
          </app-form-field>

          <app-form-field label="Contraseña" class="mb-[26px]">
            <button
              action
              type="button"
              class="text-[11.5px] text-secondary transition hover:opacity-80"
            >
              ¿Olvidaste tu contraseña?
            </button>
            <app-input
              type="password"
              icon="lock"
              autocomplete="current-password"
              ariaLabel="Contraseña"
              placeholder="Tu contraseña"
              [(value)]="password"
            />
          </app-form-field>

          @if (error()) {
            <p class="mb-4 text-[12px] font-bold text-danger">{{ error() }}</p>
          }

          <app-button variant="primary" type="submit" [full]="true">
            <span>{{ loading() ? 'Ingresando…' : 'Iniciar sesión' }}</span>
            @if (!loading()) {
              <app-icon name="arrow-right" [size]="18" />
            }
          </app-button>

          <p class="mt-6 text-center text-[12px] text-text-muted">
            ¿Problemas para entrar?
            <button type="button" class="font-bold text-primary transition hover:opacity-80">
              Contacta a soporte
            </button>
          </p>
        </form>
      </div>
    </div>
  `,
})
export class LoginTemplateComponent {
  readonly email = model<string>('');
  readonly password = model<string>('');
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly tenant = input<string>('Costa Limpia S.A.');

  readonly submitted = output<void>();

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
