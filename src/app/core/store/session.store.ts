import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthApi } from '../auth/auth-api.service';
import { Membership, SessionResponse, TenantMe } from '../auth/auth.models';
import { ApiError } from '../http/api-error';
import { FeatureFlag, Permission, RoleKey } from '../auth/permissions';
import { TokenStorage } from '../auth/token-storage';

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

/** Usuario de la sesión activa, listo para la interfaz. */
export interface SessionUser {
  readonly id: string;
  readonly nombre: string;
  readonly email: string;
  readonly iniciales: string;
  readonly rol: string;
  readonly roleKey: RoleKey;
  readonly tenant: string;
}

/**
 * Estado global mínimo (ARCHITECTURE.md §5): sesión activa, tenant, rol,
 * permisos y banderas. Todo lo demás vive en las tiendas de cada feature.
 *
 * - El access token vive solo en memoria; el refresh en TokenStorage.
 * - `refreshAccess()` es de vuelo único: N peticiones con 401 simultáneas
 *   comparten un solo refresh (fase01.md §5, "interceptor con refresh único").
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(AuthApi);

  private readonly _access = signal<string | null>(null);
  private readonly _me = signal<TenantMe | null>(null);
  private readonly _status = signal<SessionStatus>('unknown');
  private refreshing: Promise<string | null> | null = null;

  readonly token = this._access.asReadonly();
  readonly status = this._status.asReadonly();
  readonly isAuthenticated = computed(() => this._status() === 'authenticated');
  readonly me = this._me.asReadonly();

  readonly user = computed<SessionUser | null>(() => {
    const me = this._me();
    if (!me) return null;
    return {
      id: me.user.id,
      nombre: me.user.full_name,
      email: me.user.email,
      iniciales: initials(me.user.full_name),
      rol: me.role.name,
      roleKey: me.role.key,
      tenant: me.tenant.name,
    };
  });

  readonly tenant = computed(() => this._me()?.tenant ?? null);
  readonly memberships = computed<readonly Membership[]>(() => this._me()?.memberships ?? []);
  readonly permissions = computed(() => new Set<Permission>(this._me()?.permissions ?? []));

  /** true si la sesión tiene TODOS los permisos indicados. */
  can(perms: Permission | readonly Permission[]): boolean {
    const set = this.permissions();
    return (Array.isArray(perms) ? perms : [perms]).every((p) => set.has(p as Permission));
  }

  hasFeature(flag: FeatureFlag): boolean {
    return this._me()?.tenant.features[flag] ?? false;
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

  /** Promueve una respuesta de sesión autenticada (login / select-tenant). */
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
    const rt = TokenStorage.readRefresh();
    if (!rt) throw new Error('Sin sesión');
    const res = await this.api.selectTenant({ tenant_id: tenantId, refresh_token: rt });
    if (res.status !== 'authenticated') return;
    this._access.set(res.access_token);
    TokenStorage.rotateRefresh(res.refresh_token);
    await this.loadMe();
  }

  async signOut(): Promise<void> {
    const rt = TokenStorage.readRefresh();
    this.clear();
    if (rt) await this.api.logout(rt).catch(() => undefined);
  }

  private async loadMe(): Promise<void> {
    const me = await this.api.me();
    if (!me.tenant || !me.role) {
      // Cuenta de plataforma sin empresa: su consola aún no existe en la web.
      await this.signOut();
      throw new ApiError(403, 'Tu cuenta es de administración de la plataforma ARGOS y aún no tiene consola en la web.');
    }
    this._me.set(me as TenantMe);
    this._status.set('authenticated');
  }

  private clear(): void {
    TokenStorage.clearRefresh();
    this._access.set(null);
    this._me.set(null);
    this._status.set('anonymous');
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
