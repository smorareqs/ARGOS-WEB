import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthApi } from '../../../core/auth/auth-api.service';
import { Membership, SessionResponse } from '../../../core/auth/auth.models';
import { TokenStorage } from '../../../core/auth/token-storage';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { SessionStore } from '../../../core/store/session.store';

export type AuthStep = 'credentials' | 'totp' | 'tenant' | 'forgot' | 'forgot-sent';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Opción de "Elige una empresa" que entra a la administración de ARGOS. */
export const PLATFORM_CHOICE = '__platform__';

/**
 * Tienda del flujo de acceso (W-A1 a W-A3, fase01.md §3.7.1):
 *  credenciales → (428) código TOTP → (varias membresías) elegir empresa.
 * La pantalla solo lee señales y llama métodos (flujo unidireccional).
 */
@Injectable()
export class AuthStore {
  private readonly api = inject(AuthApi);
  private readonly session = inject(SessionStore);

  readonly step = signal<AuthStep>('credentials');
  readonly email = signal('');
  readonly password = signal('');
  readonly remember = signal(true);
  readonly totp = signal('');
  readonly forgotEmail = signal('');

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _errorTick = signal(0);
  private readonly _memberships = signal<readonly Membership[]>([]);
  private readonly _choosing = signal<string | null>(null);
  private readonly _platformAdmin = signal(false);
  /** En "Elige una empresa" se ofrece también la administración de ARGOS. */
  readonly platformAdmin = this._platformAdmin.asReadonly();
  private readonly _touched = signal<Record<string, boolean>>({});
  private selectionToken: string | null = null;

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  /** Cambia en cada error: la pantalla lo usa para la sacudida. */
  readonly errorTick = this._errorTick.asReadonly();
  readonly memberships = this._memberships.asReadonly();
  readonly choosing = this._choosing.asReadonly();

  readonly emailError = computed(() => {
    if (!this._touched()['email']) return null;
    const v = this.email().trim();
    if (!v) return 'Escribe tu correo.';
    return EMAIL_RE.test(v) ? null : 'Revisa el correo: falta algo como nombre@empresa.com.';
  });
  readonly passwordError = computed(() =>
    this._touched()['password'] && !this.password() ? 'Escribe tu contraseña.' : null,
  );
  readonly forgotError = computed(() => {
    if (!this._touched()['forgot']) return null;
    return EMAIL_RE.test(this.forgotEmail().trim()) ? null : 'Escribe un correo válido.';
  });

  touch(field: 'email' | 'password' | 'forgot'): void {
    this._touched.update((t) => ({ ...t, [field]: true }));
  }

  go(step: AuthStep): void {
    this._error.set(null);
    if (step === 'forgot') this.forgotEmail.set(this.email());
    if (step === 'credentials') this.totp.set('');
    this.step.set(step);
  }

  fill(email: string, password: string): void {
    this.email.set(email);
    this.password.set(password);
    this._error.set(null);
  }

  /** Devuelve true cuando la sesión quedó establecida. */
  async submitCredentials(): Promise<boolean> {
    this.touch('email');
    this.touch('password');
    if (this.emailError() || this.passwordError()) {
      this.fail(null);
      return false;
    }
    return this.login();
  }

  async submitTotp(): Promise<boolean> {
    if (this.totp().length !== 6) {
      this.fail('El código tiene 6 dígitos.');
      return false;
    }
    return this.login(this.totp());
  }

  /** `tenantId` = PLATFORM_CHOICE entra a la administración de ARGOS. */
  async chooseTenant(tenantId: string): Promise<boolean> {
    if (!this.selectionToken || this._choosing()) return false;
    this._choosing.set(tenantId);
    this._error.set(null);
    try {
      const target = tenantId === PLATFORM_CHOICE ? { platform: true as const } : { tenant_id: tenantId };
      const res = await this.api.selectTenant({
        ...target,
        selection_token: this.selectionToken,
        device: TokenStorage.device(),
      });
      return await this.handle(res);
    } catch (err) {
      const e = toApiError(err);
      if (e.status === 401) this.step.set('credentials');
      this.fail(e.detail);
      return false;
    } finally {
      this._choosing.set(null);
    }
  }

  async sendForgot(): Promise<void> {
    this.touch('forgot');
    if (this.forgotError()) return this.fail(null);
    this._loading.set(true);
    try {
      await this.api.forgotPassword(this.forgotEmail().trim());
      this.step.set('forgot-sent');
    } catch (err) {
      this.fail(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }

  private async login(totp?: string): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const res = await this.api.login({
        email: this.email().trim(),
        password: this.password(),
        totp_code: totp,
        device: TokenStorage.device(),
      });
      return await this.handle(res);
    } catch (err) {
      const e = toApiError(err);
      if (e.status === 428) {
        this.step.set('totp');
        return false;
      }
      this.fail(this.message(e));
      if (this.step() === 'totp') this.totp.set('');
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  private async handle(res: SessionResponse): Promise<boolean> {
    if (res.status === 'select_tenant') {
      this.selectionToken = res.selection_token;
      this._memberships.set(res.memberships);
      this._platformAdmin.set(!!res.platform_admin);
      this.step.set('tenant');
      return false;
    }
    await this.session.establish(res, this.remember());
    return true;
  }

  private message(e: ApiError): string {
    if (e.status === 429 && e.retryAfter) {
      const min = Math.ceil(e.retryAfter / 60);
      return `Demasiados intentos. Espera ${min} ${min === 1 ? 'minuto' : 'minutos'} e intenta de nuevo.`;
    }
    if (e.status === 403) {
      return e.detail || 'Tu cuenta no tiene acceso activo a ninguna empresa. Pide una invitación a tu administrador.';
    }
    return e.detail;
  }

  private fail(message: string | null): void {
    this._error.set(message);
    this._errorTick.update((n) => n + 1);
  }
}
