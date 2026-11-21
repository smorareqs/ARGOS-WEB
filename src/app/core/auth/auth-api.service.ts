import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../tokens/api.tokens';
import { toApiError } from '../http/api-error';
import {
  LoginRequest,
  MeResponse,
  RefreshResponse,
  SelectTenantRequest,
  SessionResponse,
} from './auth.models';

/**
 * Contrato del servicio de autenticación (fase01.md §3.7.1). Puro: sin estado.
 * Dos implementaciones: `HttpAuthApi` (backend real) y `MockAuthApi`
 * (core/mocks), elegidas en app.config.ts con el token MOCK_MODULES (módulo `auth`).
 * Todas rechazan con `ApiError`.
 */
export abstract class AuthApi {
  abstract login(body: LoginRequest): Promise<SessionResponse>;
  abstract selectTenant(body: SelectTenantRequest): Promise<SessionResponse>;
  abstract refresh(refreshToken: string, deviceId: string): Promise<RefreshResponse>;
  abstract logout(refreshToken: string): Promise<void>;
  abstract me(): Promise<MeResponse>;
  abstract forgotPassword(email: string): Promise<void>;
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
      this.http.post<RefreshResponse>(`${this.base}/refresh`, {
        refresh_token: refreshToken,
        device_id: deviceId,
      }),
    );
  }

  logout(refreshToken: string): Promise<void> {
    return this.call(this.http.post<void>(`${this.base}/logout`, { refresh_token: refreshToken }));
  }

  me(): Promise<MeResponse> {
    return this.call(this.http.get<MeResponse>(`${this.base}/me`));
  }

  forgotPassword(email: string): Promise<void> {
    return this.call(this.http.post<void>(`${this.base}/password/forgot`, { email }));
  }

  private async call<T>(req: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(req);
    } catch (err) {
      throw toApiError(err);
    }
  }
}
