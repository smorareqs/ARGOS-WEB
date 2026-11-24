import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';

/** Contrato de áreas comunes (fase04.md §4 · módulo `shared_areas`). */

export type AreaPhoto = 'beachPool' | 'brightRoom' | 'lakeRoom' | 'antiguaArch';

export interface SharedArea {
  readonly id: string;
  readonly name: string;
  readonly building: string;
  readonly capacity: number;
  readonly opens: string;
  readonly closes: string;
  /** Minutos por bloque reservable. */
  readonly block: number;
  readonly max_per_day: number;
  /** Horas mínimas de anticipación. */
  readonly advance_hours: number;
  readonly rules: string;
  readonly photo: AreaPhoto;
  readonly active: boolean;
}

export interface AreaBooking {
  readonly id: string;
  readonly area_id: string;
  readonly date: string;
  readonly start: string;
  readonly end: string;
  readonly guest_name: string;
  readonly property_code: string;
  readonly people: number;
  readonly by_staff: boolean;
}

export interface BookingDraft {
  readonly area_id: string;
  readonly date: string;
  readonly start: string;
  readonly guest: string;
  readonly people: number;
}

export interface InHouseGuest {
  readonly name: string;
  readonly property_code: string;
}

/** Servicio puro de áreas comunes. Sin estado. */
export abstract class SharedAreasApi {
  abstract areas(): Promise<readonly SharedArea[]>;
  abstract bookings(from: string, to: string): Promise<readonly AreaBooking[]>;
  abstract guests(): Promise<readonly InHouseGuest[]>;
  abstract book(draft: BookingDraft): Promise<AreaBooking>;
  abstract cancel(id: string): Promise<void>;
  abstract saveArea(area: SharedArea): Promise<SharedArea>;
}

@Injectable()
export class HttpSharedAreasApi extends SharedAreasApi {
  private readonly http = inject(ApiClient);

  areas(): Promise<readonly SharedArea[]> {
    return this.http.get<readonly SharedArea[]>('/shared-areas');
  }
  bookings(from: string, to: string): Promise<readonly AreaBooking[]> {
    return this.http.get<readonly AreaBooking[]>('/shared-areas/bookings', { from, to });
  }
  guests(): Promise<readonly InHouseGuest[]> {
    return this.http.get<readonly InHouseGuest[]>('/reservations/in-house');
  }
  book(draft: BookingDraft): Promise<AreaBooking> {
    return this.http.post<AreaBooking>('/shared-areas/bookings', draft);
  }
  cancel(id: string): Promise<void> {
    return this.http.delete<void>(`/shared-areas/bookings/${id}`);
  }
  saveArea(area: SharedArea): Promise<SharedArea> {
    return this.http.put<SharedArea>(`/shared-areas/${area.id}`, area);
  }
}
