import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/tokens/api.tokens';
import { toApiError } from '../../../core/http/api-error';
import { DashboardData } from '../models/dashboard.model';

/** Servicio puro del Inicio (ARCHITECTURE.md §7). Rechaza con ApiError. */
export abstract class DashboardApi {
  abstract get(): Promise<DashboardData>;
  /** Reconoce una alerta (`POST /alerts/{id}/acknowledge`, fase 3). */
  abstract acknowledge(alertId: string): Promise<void>;
  abstract restore(alertId: string): Promise<void>;
}

@Injectable()
export class HttpDashboardApi extends DashboardApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api/v1`;

  async get(): Promise<DashboardData> {
    try {
      return await firstValueFrom(this.http.get<DashboardData>(`${this.base}/dashboard`));
    } catch (e) {
      throw toApiError(e);
    }
  }

  async acknowledge(alertId: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(`${this.base}/alerts/${alertId}/acknowledge`, {}));
    } catch (e) {
      throw toApiError(e);
    }
  }

  async restore(alertId: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(`${this.base}/alerts/${alertId}/reopen`, {}));
    } catch (e) {
      throw toApiError(e);
    }
  }
}
