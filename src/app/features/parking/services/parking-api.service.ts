import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';

/** Contrato de parqueos (fase04.md §4 · módulo `parking`). */

export type SpaceKind = 'guest' | 'visitor' | 'staff';

export interface ParkingSpace {
  readonly id: string;
  readonly code: string;
  readonly building: string;
  readonly level: string;
  readonly kind: SpaceKind;
  readonly covered: boolean;
  readonly blocked: boolean;
}

export interface ParkingAssignment {
  readonly id: string;
  readonly space_id: string;
  readonly reservation_code: string;
  readonly guest_name: string;
  readonly property_code: string;
  readonly plate: string;
  /** Días locales; `to` exclusivo, igual que la salida de la reserva. */
  readonly from: string;
  readonly to: string;
}

export interface AssignableStay {
  readonly reservation_code: string;
  readonly guest_name: string;
  readonly property_code: string;
  readonly building: string;
  readonly from: string;
  readonly to: string;
}

export interface AssignmentDraft {
  readonly space_id: string;
  readonly reservation_code: string;
  readonly plate: string;
}

/** Servicio puro de parqueos. Sin estado. */
export abstract class ParkingApi {
  abstract spaces(): Promise<readonly ParkingSpace[]>;
  abstract assignments(from: string, to: string): Promise<readonly ParkingAssignment[]>;
  abstract stays(): Promise<readonly AssignableStay[]>;
  abstract assign(draft: AssignmentDraft): Promise<ParkingAssignment>;
  abstract release(id: string): Promise<void>;
  abstract setBlocked(spaceId: string, blocked: boolean): Promise<void>;
}

@Injectable()
export class HttpParkingApi extends ParkingApi {
  private readonly http = inject(ApiClient);

  spaces(): Promise<readonly ParkingSpace[]> {
    return this.http.get<readonly ParkingSpace[]>('/parking/spaces');
  }
  assignments(from: string, to: string): Promise<readonly ParkingAssignment[]> {
    return this.http.get<readonly ParkingAssignment[]>('/parking/assignments', { from, to });
  }
  stays(): Promise<readonly AssignableStay[]> {
    return this.http.get<readonly AssignableStay[]>('/parking/assignable-stays');
  }
  assign(draft: AssignmentDraft): Promise<ParkingAssignment> {
    return this.http.post<ParkingAssignment>('/parking/assignments', draft);
  }
  release(id: string): Promise<void> {
    return this.http.delete<void>(`/parking/assignments/${id}`);
  }
  setBlocked(spaceId: string, blocked: boolean): Promise<void> {
    return this.http.patch<void>(`/parking/spaces/${spaceId}`, { blocked });
  }
}
