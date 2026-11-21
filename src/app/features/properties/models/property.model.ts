export type { Page } from '../../../core/http/page';

/**
 * Contrato de propiedades (fase02.md §2 `properties`, §4 endpoints).
 * `today_status`, `open_incidents`, `last_cleaning_at` y los asignados son
 * campos agregados que la lista necesita (W-C1); los calcula el backend.
 */

export type PropertyType = 'apartment' | 'house' | 'room' | 'other';
export type TodayStatus = 'ready' | 'cleaning' | 'occupied' | 'pending';
/** Entorno visual para la ilustración (deriva del edificio o la zona). */
export type PropertySetting = 'city' | 'colonial' | 'beach' | 'lake';

export interface PersonRef {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly role?: string;
}

export interface Building {
  readonly id: string;
  readonly name: string;
  readonly zone: string;
  readonly setting: PropertySetting;
}

export interface Property {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly type: PropertyType;
  readonly building_id: string | null;
  readonly building_name: string | null;
  readonly zone: string;
  readonly setting: PropertySetting;
  readonly address: string | null;
  readonly bedrooms: number | null;
  readonly bathrooms: number | null;
  readonly max_guests: number | null;
  readonly is_active: boolean;
  readonly today_status: TodayStatus;
  readonly open_incidents: number;
  readonly last_cleaning_at: string | null;
  readonly assigned: readonly PersonRef[];
  readonly owners: readonly PersonRef[];
  readonly has_access_info: boolean;
  readonly notes: string | null;
  readonly created_at: string;
}

/** Cuerpo de `POST /properties`. */
export interface PropertyDraft {
  readonly code: string;
  readonly name: string;
  readonly type: PropertyType;
  readonly building_id: string | null;
  readonly address: string | null;
  readonly bedrooms: number | null;
  readonly bathrooms: number | null;
  readonly max_guests: number | null;
}

/** `GET /properties/{id}/access-info` (permiso properties.access_info). */
export interface AccessInfo {
  readonly text: string;
  readonly viewed_at: string;
}

export const TYPE_LABEL: Record<PropertyType, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  room: 'Habitación',
  other: 'Otro',
};
