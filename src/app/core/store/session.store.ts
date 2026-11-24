import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthApi } from '../auth/auth-api.service';
import { MeResponse, Membership, SessionResponse, TenantMe } from '../auth/auth.models';
import { FeatureFlag, Permission, RoleKey } from '../auth/permissions';
import { TokenStorage } from '../auth/token-storage';

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

/** Nombre visible de la administración de ARGOS (sesión sin empresa). */
export const PLATFORM_NAME = 'Administración ARGOS';

/** Usuario de la sesión activa, listo para la interfaz. */
export interface SessionUser {
  readonly id: string;
  readonly nombre: string;
  readonly email: string;
  readonly iniciales: string;
  readonly rol: string;
  /** null en la administración de ARGOS. */
  readonly roleKey: RoleKey | null;
  readonly tenant: string;
  readonly phone: string | null;
  readonly totpEnabled: boolean;
}

/**
 * Estado global mínimo (ARCHITECTURE.md §5): sesión activa, tenant, rol,
 * permisos y banderas. Todo lo demás vive en las tiendas de cada feature.
 *
 * - El access token vive solo en memoria; el refresh en TokenStorage.
 * - `refreshAccess()` es de vuelo único: N peticiones con 401 simultáneas
 *   comparten un solo refresh (fase01.md §5, "interceptor con refresh único").
 * - Una sesión puede estar dentro de una empresa o en la administración de
 *   ARGOS (modo plataforma: `tenant` y `role` son null en /auth/me).
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(AuthApi);

  private readonly _access = signal<string | null>(null);
  private readonly _account = signal<MeResponse | null>(null);
  private readonly _status = signal<SessionStatus>('unknown');
  private refreshing: Promise<string | null> | null = null;

  readonly token = this._access.asReadonly();
  readonly status = this._status.asReadonly();
  readonly isAuthenticated = computed(() => this._status() === 'authenticated');

  /** /auth/me completo (también en modo plataforma). */
  readonly account = this._account.asReadonly();
  /** /auth/me dentro de una empresa; null en modo plataforma. */
  readonly me = computed<TenantMe | null>(() => {
    const a = this._account();
    return a?.tenant && a.role ? (a as TenantMe) : null;
  });
  /** Sesión en la administración de ARGOS (sin empresa). */
  readonly isPlatform = computed(() => !!this._account() && !this._account()?.tenant);
  /** La persona puede entrar a la administración de ARGOS. */
  readonly isPlatformAdmin = computed(() => this._account()?.user.is_platform_admin ?? false);
  /** Inicio según el modo de la sesión. */
  readonly home = computed(() => (this.isPlatform() ? '/plataforma' : '/inicio'));

  readonly user = computed<SessionUser | null>(() => {
    const me = this._account();
    if (!me) return null;
    return {
      id: me.user.id,
      nombre: me.user.full_name,
      email: me.user.email,
      iniciales: initials(me.user.full_name),
      rol: me.role?.name ?? 'Plataforma',
      roleKey: me.role?.key ?? null,
      tenant: me.tenant?.name ?? PLATFORM_NAME,
      phone: me.user.phone ?? null,
      totpEnabled: me.user.totp_enabled,
    };
  });

  readonly tenant = computed(() => this._account()?.tenant ?? null);
  readonly memberships = computed<readonly Membership[]>(() => this._account()?.memberships ?? []);
  readonly permissions = computed(() => new Set<Permission>(this._account()?.permissions ?? []));

  /** true si la sesión tiene TODOS los permisos indicados. */
  can(perms: Permission | readonly Permission[]): boolean {
    const set = this.permissions();
    return (Array.isArray(perms) ? perms : [perms]).every((p) => set.has(p as Permission));
  }

  /** true si la sesión tiene AL MENOS UNO de los permisos indicados. */
  canAny(perms: readonly Permission[]): boolean {
    const set = this.permissions();
    return perms.some((p) => set.has(p));
  }

  hasFeature(flag: FeatureFlag): boolean {
    return this._account()?.tenant?.features[flag] ?? false;
  }

  /** Arranque: si hay refresh guardado, renueva y carga /auth/me. */
  async restore(): Promise<void> {
    if (!TokenStorage.readRefresh()) {
      this._status.set('anonymous');
      return;
    }
    const token = await this.refreshAccess();
    if (!token) return;
    try {
      await this.loadMe();
    } catch {
      this.clear();
    }
  }

  /** Promueve una respuesta de sesión autenticada (login / select-tenant / invitación). */
  async establish(res: Extract<SessionResponse, { status: 'authenticated' }>, remember: boolean) {
    this._access.set(res.access_token);
    TokenStorage.writeRefresh(res.refresh_token, remember);
    await this.loadMe();
  }

  /** Renueva el access token una sola vez aunque lo pidan varios a la vez. */
  refreshAccess(): Promise<string | null> {
    this.refreshing ??= (async () => {
      const rt = TokenStorage.readRefresh();
      if (!rt) {
        this.clear();
        return null;
      }
      try {
        const res = await this.api.refresh(rt, TokenStorage.device().id);
        TokenStorage.rotateRefresh(res.refresh_token);
        this._access.set(res.access_token);
        return res.access_token;
      } catch {
        this.clear();
        return null;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  /** Cambia de empresa sin cerrar sesión (PRD §4.1). */
  async switchTenant(tenantId: string): Promise<void> {
    await this.select({ tenant_id: tenantId });
  }

  /** Entra a la administración de ARGOS sin cerrar sesión. */
  async enterPlatform(): Promise<void> {
    await this.select({ platform: true });
  }

  /** Vuelve a leer /auth/me (tras cambiar el logo, el nombre o el 2FA). */
  async reload(): Promise<void> {
    await this.loadMe();
  }

  /** Aplica los datos de cuenta que devolvió PATCH /auth/me. */
  patchUser(user: Partial<MeResponse['user']>): void {
    this._account.update((a) => (a ? { ...a, user: { ...a.user, ...user } } : a));
  }

  async signOut(): Promise<void> {
    const rt = TokenStorage.readRefresh();
    this.clear();
    if (rt) await this.api.logout(rt).catch(() => undefined);
  }

  private async select(target: { tenant_id: string } | { platform: true }): Promise<void> {
    const rt = TokenStorage.readRefresh();
    if (!rt) throw new Error('Sin sesión');
    const res = await this.api.selectTenant({ ...target, refresh_token: rt });
    if (res.status !== 'authenticated') return;
    this._access.set(res.access_token);
    TokenStorage.rotateRefresh(res.refresh_token);
    await this.loadMe();
  }

  private async loadMe(): Promise<void> {
    const me = await this.api.me();
    this._account.set(me);
    this._status.set('authenticated');
  }

  private clear(): void {
    TokenStorage.clearRefresh();
    this._access.set(null);
    this._account.set(null);
    this._status.set('anonymous');
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
