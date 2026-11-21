import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../store/auth.store';
import { MOCK_MODULES } from '../../../../core/tokens/api.tokens';
import { DEMO_PASSWORD, DEMO_USERS } from '../../../../core/mocks/demo-seed';
import { BrandPanelComponent } from '../../components/brand-panel/brand-panel.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { LogoComponent } from '../../../../shared/atoms/logo/logo.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { OtpInputComponent } from '../../../../shared/molecules/otp-input/otp-input.component';
import { SpinnerComponent } from '../../../../shared/atoms/spinner/spinner.component';
import { TenantMarkComponent } from '../../../../shared/atoms/tenant-mark/tenant-mark.component';

/**
 * Screen · Acceso (W-A1 iniciar sesión, W-A2 elegir empresa, W-A3 olvidé mi
 * contraseña). Una sola pantalla con pasos que se deslizan: el contexto
 * (panel de marca) no se pierde entre pasos.
 */
@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BrandPanelComponent,
    RouterLink,
    LogoComponent,
    IconComponent,
    ButtonComponent,
    InputComponent,
    CheckboxComponent,
    FormFieldComponent,
    OtpInputComponent,
    SpinnerComponent,
    TenantMarkComponent,
  ],
  providers: [AuthStore],
  templateUrl: './login.component.html',
  styles: `
    :host { display: contents; }
    .step-in { animation: step-in var(--spring-standard-dur) var(--spring-standard) both; }
    .step-out { animation: step-out 180ms var(--ease-exit) both; }
    @keyframes step-in { from { opacity: 0; transform: translateX(28px); } }
    @keyframes step-out { to { opacity: 0; transform: translateX(-20px); } }
    .tenant-card { transition: border-color var(--dur-fast), box-shadow var(--dur-base), transform var(--spring-standard-dur) var(--spring-standard); }
    .tenant-card:hover { border-color: var(--color-secondary); box-shadow: var(--shadow-e2); transform: translateY(-2px); }
    .demo-row { transition: background-color var(--dur-fast); }
    .demo-row:hover { background: var(--color-background); }
  `,
})
export class LoginComponent {
  protected readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly mocks = inject(MOCK_MODULES).auth;
  protected readonly demoUsers = DEMO_USERS;

  /** Query params (withComponentInputBinding). */
  readonly volver = input<string | undefined>();
  readonly motivo = input<string | undefined>();

  protected readonly shaking = signal(false);
  /** Objeto con clave por paso: el paso nuevo entra y el anterior sale. */
  protected readonly stepView = computed(() => ({ key: this.store.step() }));
  protected readonly demoOpen = signal(true);

  constructor() {
    effect(() => {
      if (this.store.errorTick() === 0) return;
      untracked(() => {
        this.shaking.set(false);
        requestAnimationFrame(() => this.shaking.set(true));
        setTimeout(() => this.shaking.set(false), 420);
      });
    });
  }

  protected async onCredentials(e: Event): Promise<void> {
    e.preventDefault();
    if (await this.store.submitCredentials()) await this.enter();
  }

  protected async onTotp(e?: Event): Promise<void> {
    e?.preventDefault();
    if (await this.store.submitTotp()) await this.enter();
  }

  protected async onTenant(id: string): Promise<void> {
    if (await this.store.chooseTenant(id)) await this.enter();
  }

  protected onForgot(e: Event): void {
    e.preventDefault();
    void this.store.sendForgot();
  }

  protected useDemo(email: string): void {
    this.store.fill(email, DEMO_PASSWORD);
  }

  private async enter(): Promise<void> {
    const target = this.volver();
    await this.router.navigateByUrl(target && target.startsWith('/') ? target : '/inicio');
  }
}
