import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../tokens/api.tokens';
import { toApiError } from '../http/api-error';
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
} from './auth.models';

/**
 * Contrato del servicio de autenticación y cuenta propia (fase01.md §3.7.1).
 * Puro: sin estado. Dos implementaciones: `HttpAuthApi` (backend real) y
 * `MockAuthApi` (core/mocks), elegidas en app.config.ts con el token
 * MOCK_MODULES (módulo `auth`). Todas rechazan con `ApiError`.
 */
export abstract class AuthApi {
  abstract login(body: LoginRequest): Promise<SessionResponse>;
  abstract selectTenant(body: SelectTenantRequest): Promise<SessionResponse>;
  abstract refresh(refreshToken: string, deviceId: string): Promise<RefreshResponse>;
  abstract logout(refreshToken: string): Promise<void>;
  abstract me(): Promise<MeResponse>;
  abstract updateMe(body: ProfileUpdate): Promise<MeResponse['user']>;
  abstract forgotPassword(email: string): Promise<void>;
  abstract resetPassword(token: string, newPassword: string): Promise<void>;
  abstract changePassword(current: string, next: string): Promise<void>;
  abstract sessions(): Promise<readonly SessionInfo[]>;
  abstract revokeSession(id: string): Promise<void>;
  abstract revokeOtherSessions(): Promise<void>;
  abstract totpSetup(): Promise<TotpSetup>;
  abstract totpConfirm(code: string): Promise<void>;
  abstract totpDisable(password: string, code: string): Promise<void>;
  abstract previewInvitation(token: string): Promise<InvitationPreview>;
  abstract acceptInvitation(body: AcceptInvitationRequest): Promise<SessionResponse>;
}

/** Implementación HTTP contra `/api/v1/auth/*`. */
@Injectable()
export class HttpAuthApi extends AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api/v1/auth`;

  login(body: LoginRequest): Promise<SessionResponse> {
    return this.call(this.http.post<SessionResponse>(`${this.base}/login`, body));
  }

  selectTenant(body: SelectTenantRequest): Promise<SessionResponse> {
    return this.call(this.http.post<SessionResponse>(`${this.base}/select-tenant`, body));
  }

  refresh(refreshToken: string, deviceId: string): Promise<RefreshResponse> {
    return this.call(
      this.http.post<RefreshResponse>(`${this.base}/refresh`, { refresh_token: refreshToken, device_id: deviceId }),
    );
  }

  logout(refreshToken: string): Promise<void> {
    return this.call(this.http.post<void>(`${this.base}/logout`, { refresh_token: refreshToken }));
  }

  me(): Promise<MeResponse> {
    return this.call(this.http.get<MeResponse>(`${this.base}/me`));
  }

  updateMe(body: ProfileUpdate): Promise<MeResponse['user']> {
    return this.call(this.http.patch<MeResponse['user']>(`${this.base}/me`, body));
  }

  forgotPassword(email: string): Promise<void> {
    return this.call(this.http.post<void>(`${this.base}/password/forgot`, { email }));
  }

  resetPassword(token: string, newPassword: string): Promise<void> {
    return this.call(this.http.post<void>(`${this.base}/password/reset`, { token, new_password: newPassword }));
  }

  changePassword(current: string, next: string): Promise<void> {
    return this.call(
      this.http.post<void>(`${this.base}/password/change`, { current_password: current, new_password: next }),
    );
  }

  sessions(): Promise<readonly SessionInfo[]> {
    return this.call(this.http.get<readonly SessionInfo[]>(`${this.base}/sessions`));
  }

  revokeSession(id: string): Promise<void> {
    return this.call(this.http.delete<void>(`${this.base}/sessions/${id}`));
  }

  revokeOtherSessions(): Promise<void> {
    return this.call(this.http.delete<void>(`${this.base}/sessions`));
  }

  totpSetup(): Promise<TotpSetup> {
    return this.call(this.http.post<TotpSetup>(`${this.base}/totp/setup`, {}));
  }

  totpConfirm(code: string): Promise<void> {
    return this.call(this.http.post<void>(`${this.base}/totp/confirm`, { code }));
  }

  totpDisable(password: string, code: string): Promise<void> {
    return this.call(this.http.post<void>(`${this.base}/totp/disable`, { password, code }));
  }

  previewInvitation(token: string): Promise<InvitationPreview> {
    return this.call(this.http.get<InvitationPreview>(`${this.base}/invitations/${encodeURIComponent(token)}`));
  }

  acceptInvitation(body: AcceptInvitationRequest): Promise<SessionResponse> {
    return this.call(this.http.post<SessionResponse>(`${this.base}/invitations/accept`, body));
  }

  private async call<T>(req: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(req);
    } catch (err) {
      throw toApiError(err);
    }
  }
}
