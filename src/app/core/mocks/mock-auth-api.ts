import { Injectable } from '@angular/core';
import { AuthApi } from '../auth/auth-api.service';
import {
  AcceptInvitationRequest,
  InvitationPreview,
  LoginRequest,
  MeResponse,
  ProfileUpdate,
  RefreshResponse,
  SelectTenantRequest,
  SessionInfo,
  SessionResponse,
  TotpSetup,
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
  private readonly sessions_ = new MockTable<MockSession>('sessions', () => []);
  private readonly profile = new Map<string, { full_name: string; phone: string | null }>();
  private readonly totpOn = new Map<string, boolean>();
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
      const s = this.sessions_.all().find((x) => x.refresh === body.refresh_token);
      userId = s?.userId;
      deviceId = s?.deviceId ?? deviceId;
      if (s) this.sessions_.update((rows) => rows.filter((x) => x.refresh !== s.refresh));
    }
    const user = DEMO_USERS.find((u) => u.id === userId);
    if (!user) throw new ApiError(401, 'Tu sesión venció. Inicia sesión de nuevo.');
    if (!('tenant_id' in body)) throw new ApiError(404, 'No tienes acceso a la administración de ARGOS.');
    if (!user.memberships.some((m) => m.tenantId === body.tenant_id)) {
      throw new ApiError(404, 'No perteneces a esa empresa.');
    }
    return this.issue(user, body.tenant_id, deviceId);
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    await latency(180, 320);
    const s = this.sessions_.all().find((x) => x.refresh === refreshToken);
    if (!s) throw new ApiError(401, 'Tu sesión venció. Inicia sesión de nuevo.');
    const next: MockSession = { ...s, refresh: uid('rt') };
    this.sessions_.update((rows) => [...rows.filter((x) => x.refresh !== s.refresh), next]);
    const access = this.newAccess(next);
    return { access_token: access, refresh_token: next.refresh, expires_in: 900 };
  }

  async logout(refreshToken: string): Promise<void> {
    await latency(120, 220);
    this.sessions_.update((rows) => rows.filter((x) => x.refresh !== refreshToken));
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
      user: { id: user.id, email: user.email, full_name: this.profile.get(user.id)?.full_name ?? user.fullName,
        phone: this.profile.get(user.id)?.phone ?? null, totp_enabled: this.totpOn.get(user.id) ?? user.totp },
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

  async updateMe(body: ProfileUpdate): Promise<MeResponse['user']> {
    await latency(300, 500);
    const me = await this.me();
    this.profile.set(me.user.id, { full_name: body.full_name ?? me.user.full_name, phone: body.phone ?? me.user.phone ?? null });
    return { ...me.user, full_name: body.full_name ?? me.user.full_name, phone: body.phone ?? me.user.phone ?? null };
  }

  async resetPassword(): Promise<void> {
    await latency(400, 700); // en demo la contraseña no cambia
  }

  async changePassword(current: string): Promise<void> {
    await latency(400, 700);
    if (current !== DEMO_PASSWORD) {
      throw new ApiError(422, 'La contraseña actual no es correcta.', [{ location: 'body.current_password', message: 'La contraseña actual no es correcta.' }]);
    }
  }

  async sessions(): Promise<readonly SessionInfo[]> {
    await latency(200, 400);
    const current = this.lastAccess ? this.access.get(this.lastAccess) : undefined;
    return this.sessions_.all().filter((x) => x.userId === current?.userId).map((x, i) => ({
      id: x.refresh, device_name: i === 0 ? 'Este navegador' : 'Otro equipo', platform: 'web' as const, ip: null,
      tenant_name: tenantById(x.tenantId).name, last_used_at: new Date().toISOString(), created_at: new Date().toISOString(),
      current: x.refresh === current?.refresh,
    }));
  }

  async revokeSession(id: string): Promise<void> {
    await latency(200, 400);
    this.sessions_.update((rows) => rows.filter((x) => x.refresh !== id));
  }

  async revokeOtherSessions(): Promise<void> {
    await latency(200, 400);
    const current = this.lastAccess ? this.access.get(this.lastAccess) : undefined;
    this.sessions_.update((rows) => rows.filter((x) => x.userId !== current?.userId || x.refresh === current?.refresh));
  }

  async totpSetup(): Promise<TotpSetup> {
    await latency(300, 500);
    return { secret: 'JBSWY3DPEHPK3PXP', otpauth_url: 'otpauth://totp/ARGOS:demo?secret=JBSWY3DPEHPK3PXP&issuer=ARGOS' };
  }

  async totpConfirm(code: string): Promise<void> {
    await latency(300, 500);
    if (code !== DEMO_TOTP_CODE) throw new ApiError(422, 'El código no es correcto.', [{ location: 'body.code', message: 'El código no es correcto.' }]);
    const me = await this.me();
    this.totpOn.set(me.user.id, true);
  }

  async totpDisable(_password: string, code: string): Promise<void> {
    await latency(300, 500);
    if (code !== DEMO_TOTP_CODE) throw new ApiError(422, 'El código no es correcto.', [{ location: 'body.code', message: 'El código no es correcto.' }]);
    const me = await this.me();
    this.totpOn.set(me.user.id, false);
  }

  async previewInvitation(): Promise<InvitationPreview> {
    await latency(300, 500);
    throw new ApiError(404, 'En el modo demo no hay invitaciones: los enlaces llegan por correo con el backend real.');
  }

  async acceptInvitation(_body: AcceptInvitationRequest): Promise<SessionResponse> {
    await latency(300, 500);
    throw new ApiError(404, 'En el modo demo no hay invitaciones.');
  }

  private issue(user: DemoUser, tenantId: string, deviceId: string): SessionResponse {
    const session: MockSession = { refresh: uid('rt'), userId: user.id, tenantId, deviceId };
    this.sessions_.update((rows) => [...rows, session]);
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
