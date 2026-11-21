import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/tokens/api.tokens';
import { toApiError } from '../../../core/http/api-error';
import { AccessInfo, Building, Page, Property, PropertyDraft } from '../models/property.model';

/**
 * Servicio puro de propiedades y edificios (fase02.md §4). Sin estado.
 * Rechaza con ApiError (422 con `errors[]` por campo).
 */
export abstract class PropertiesApi {
  abstract list(): Promise<Page<Property>>;
  abstract buildings(): Promise<Page<Building>>;
  abstract create(draft: PropertyDraft): Promise<Property>;
  abstract accessInfo(id: string): Promise<AccessInfo>;
}

@Injectable()
export class HttpPropertiesApi extends PropertiesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/api/v1`;

  list(): Promise<Page<Property>> {
    return this.call(this.http.get<Page<Property>>(`${this.base}/properties`, { params: { limit: 200 } }));
  }

  buildings(): Promise<Page<Building>> {
    return this.call(this.http.get<Page<Building>>(`${this.base}/buildings`, { params: { limit: 200 } }));
  }

  create(draft: PropertyDraft): Promise<Property> {
    return this.call(this.http.post<Property>(`${this.base}/properties`, draft));
  }

  accessInfo(id: string): Promise<AccessInfo> {
    return this.call(this.http.get<AccessInfo>(`${this.base}/properties/${id}/access-info`));
  }

  private async call<T>(req: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(req);
    } catch (e) {
      throw toApiError(e);
    }
  }
}
