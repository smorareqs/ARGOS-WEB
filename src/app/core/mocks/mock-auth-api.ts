import { Injectable } from '@angular/core';
import { AuthApi } from '../auth/auth-api.service';
import {
  LoginRequest,
  MeResponse,
  RefreshResponse,
  SelectTenantRequest,
  SessionResponse,
} from '../auth/auth.models';
import { ROLE_NAMES } from '../auth/permissions';
import { ApiError } from '../http/api-error';
import {
  DEMO_PASSWORD,
  DEMO_TOTP_CODE,
  DEMO_USERS,
  DemoUser,
  ROLE_PERMISSIONS,
  membershipsOf,
  tenantById,
} from './demo-seed';
import { MockTable, latency, uid } from './mock-utils';

interface MockSession {
  readonly refresh: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly deviceId: string;
}

/**
 * Backend de autenticación simulado que respeta el contrato de fase01.md
 * §3.7.1: 401/428/429, selección de empresa, refresh rotativo.
 */
@Injectable()
export class MockAuthApi extends AuthApi {
  private readonly sessions = new MockTable<MockSession>('sessions', () => []);
  private readonly selections = new Map<string, string>(); // selection_token → userId
  private readonly access = new Map<string, MockSession>();
  private lastAccess: string | null = null;
  private failures = 0;

  async login(body: LoginRequest): Promise<SessionResponse> {
    await latency(520, 900);
    if (this.failures >= 10) {
      throw new ApiError(429, 'Demasiados intentos. Espera un minuto e intenta de nuevo.', [], 60);
    }
    const user = DEMO_USERS.find((u) => u.email === body.email.trim().toLowerCase());
    if (!user || body.password !== DEMO_PASSWORD) {
      this.failures++;
      throw new ApiError(401, 'Correo o contraseña incorrectos.');
    }
    if (user.totp) {
      if (!body.totp_code) throw new ApiError(428, 'Ingresa el código de tu app de autenticación.');
      if (body.totp_code !== DEMO_TOTP_CODE) {
        this.failures++;
        throw new ApiError(401, 'El código no es válido. Revisa tu app e intenta de nuevo.');
      }
    }
    this.failures = 0;
    const memberships = membershipsOf(user);
    if (memberships.length > 1) {
      const token = uid('sel');
      this.selections.set(token, user.id);
      return { status: 'select_tenant', selection_token: token, memberships };
    }
    return this.issue(user, memberships[0].tenant_id, body.device.id);
  }

  async selectTenant(body: SelectTenantRequest): Promise<SessionResponse> {
    await latency(300, 520);
    let userId: string | undefined;
    let deviceId = 'web';
    if ('selection_token' in body) {
      userId = this.selections.get(body.selection_token);
      deviceId = body.device.id;
    } else {
      const s = this.sessions.all().find((x) => x.refresh === body.refresh_token);
      userId = s?.userId;
      deviceId = s?.deviceId ?? deviceId;
      if (s) this.sessions.update((rows) => rows.filter((x) => x.refresh !== s.refresh));
    }
    const user = DEMO_USERS.find((u) => u.id === userId);
    if (!user) throw new ApiError(401, 'Tu sesión venció. Inicia sesión de nuevo.');
    if (!user.memberships.some((m) => m.tenantId === body.tenant_id)) {
      throw new ApiError(404, 'No perteneces a esa empresa.');
    }
    return this.issue(user, body.tenant_id, deviceId);
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    await latency(180, 320);
    const s = this.sessions.all().find((x) => x.refresh === refreshToken);
    if (!s) throw new ApiError(401, 'Tu sesión venció. Inicia sesión de nuevo.');
    const next: MockSession = { ...s, refresh: uid('rt') };
    this.sessions.update((rows) => [...rows.filter((x) => x.refresh !== s.refresh), next]);
    const access = this.newAccess(next);
    return { access_token: access, refresh_token: next.refresh, expires_in: 900 };
  }

  async logout(refreshToken: string): Promise<void> {
    await latency(120, 220);
    this.sessions.update((rows) => rows.filter((x) => x.refresh !== refreshToken));
    this.lastAccess = null;
  }

  async me(): Promise<MeResponse> {
    await latency(160, 300);
    const s = this.lastAccess ? this.access.get(this.lastAccess) : undefined;
    const user = DEMO_USERS.find((u) => u.id === s?.userId);
    if (!s || !user) throw new ApiError(401, 'Tu sesión venció. Inicia sesión de nuevo.');
    const tenant = tenantById(s.tenantId);
    const role = user.memberships.find((m) => m.tenantId === s.tenantId)!.role;
    return {
      user: { id: user.id, email: user.email, full_name: user.fullName, totp_enabled: user.totp },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        logo_url: null,
        timezone: 'America/Guatemala',
        currency: 'GTQ',
        features: tenant.features,
      },
      role: { key: role, name: ROLE_NAMES[role] },
      permissions: ROLE_PERMISSIONS[role],
      memberships: membershipsOf(user),
    };
  }

  async forgotPassword(): Promise<void> {
    await latency(500, 800); // 202 siempre: no revela si el correo existe
  }

  private issue(user: DemoUser, tenantId: string, deviceId: string): SessionResponse {
    const session: MockSession = { refresh: uid('rt'), userId: user.id, tenantId, deviceId };
    this.sessions.update((rows) => [...rows, session]);
    return {
      status: 'authenticated',
      access_token: this.newAccess(session),
      refresh_token: session.refresh,
      expires_in: 900,
      memberships: membershipsOf(user),
    };
  }

  private newAccess(session: MockSession): string {
    const token = uid('at');
    this.access.set(token, session);
    this.lastAccess = token;
    return token;
  }
}
