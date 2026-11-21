import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/tokens/api.tokens';
import { toApiError } from '../../../core/http/api-error';

export type FleetSize = '1-10' | '11-50' | '51-200' | '200+';

/** Cuerpo de `POST /public/demo-requests` (endpoint público, pendiente en backend). */
export interface DemoRequest {
  readonly full_name: string;
  readonly company: string;
  readonly email: string;
  readonly phone: string | null;
  readonly properties: FleetSize;
}

/** Servicio puro de solicitudes de demo desde la landing. */
export abstract class DemoApi {
  abstract request(body: DemoRequest): Promise<void>;
}

@Injectable()
export class HttpDemoApi extends DemoApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api/v1/public`;

  async request(body: DemoRequest): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(`${this.base}/demo-requests`, body));
    } catch (e) {
      throw toApiError(e);
    }
  }
}
