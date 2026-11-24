export type { Page } from '../../../core/http/page';

/**
 * Contrato de propiedades, edificios y plantillas de checklist (fase02.md §4,
 * backend `internal/modules/properties` y `checklists`). Todo llega ya filtrado
 * por el alcance de quien consulta: limpieza y mantenimiento ven sus
 * propiedades asignadas, el propietario las suyas.
 */

export type PropertyType = 'apartment' | 'house' | 'room' | 'other';
export type TodayStatus = 'ready' | 'cleaning' | 'occupied' | 'pending';
/** Entorno de la portada generada (se deduce de la zona; ver settingOf). */
export type PropertySetting = 'city' | 'colonial' | 'beach' | 'lake';

/** Persona asignada o propietaria. */
export interface PersonRef {
  readonly user_id: string;
  readonly full_name: string;
}

export interface Property {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly type: PropertyType;
  readonly building_id: string | null;
  readonly building_name: string | null;
  /** Zona del edificio (se muestra si la propiedad no tiene la suya). */
  readonly building_zone: string | null;
  readonly address: string | null;
  /** Barrio o ciudad (Zona 10, Antigua Guatemala…). */
  readonly zone: string | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly bedrooms: number | null;
  readonly bathrooms: number | null;
  readonly max_guests: number | null;
  readonly checklist_template_id: string | null;
  readonly checklist_template_name: string | null;
  readonly has_access_info: boolean;
  readonly access_info_updated_at: string | null;
  readonly cover_file_id: string | null;
  /** Foto de portada firmada por 12 h (null = portada generada). */
  readonly cover_url: string | null;
  readonly notes: string | null;
  readonly is_active: boolean;
  readonly assigned: readonly PersonRef[];
  readonly owners: readonly PersonRef[];
  readonly created_at: string;
  readonly updated_at: string;
  /**
   * Agregados de otros módulos: llegan cuando existan tareas (0003, Persona B)
   * y mantenimiento (fase 3). Mientras tanto no vienen.
   */
  readonly today_status?: TodayStatus;
  readonly open_incidents?: number;
  readonly last_cleaning_at?: string | null;
}

/** Cuerpo de `POST /properties`. */
export interface PropertyDraft {
  readonly code: string;
  readonly name: string;
  readonly type: PropertyType;
  readonly building_id?: string | null;
  readonly address?: string | null;
  readonly zone?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly bedrooms?: number | null;
  readonly bathrooms?: number | null;
  readonly max_guests?: number | null;
  readonly checklist_template_id?: string | null;
  readonly access_info?: string | null;
  readonly cover_file_id?: string | null;
  readonly notes?: string | null;
}

/** Cuerpo de `PATCH /properties/{id}`: solo lo que cambia; null borra. */
export type PropertyPatch = Partial<PropertyDraft> & { readonly is_active?: boolean };

/** `GET /properties/{id}/access-info` (queda en la bitácora). */
export interface AccessInfo {
  readonly property_id: string;
  readonly text: string;
  readonly updated_at: string | null;
  readonly viewed_at: string;
}

export interface Building {
  readonly id: string;
  readonly name: string;
  readonly address: string | null;
  readonly zone: string | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly notes: string | null;
  readonly is_active: boolean;
  readonly properties_count: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface BuildingDraft {
  readonly name: string;
  readonly address?: string | null;
  readonly zone?: string | null;
  readonly lat?: number | null;
  readonly lng?: number | null;
  readonly notes?: string | null;
  readonly is_active?: boolean;
}

export interface ChecklistItem {
  readonly id?: string;
  readonly section: string;
  readonly position?: number;
  readonly text: string;
  readonly requires_photo: boolean;
  readonly requires_before_after: boolean;
}

export interface ChecklistTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly is_default: boolean;
  readonly properties_count: number;
  readonly items: readonly ChecklistItem[];
  readonly created_at: string;
  readonly updated_at: string;
}

/** Cuerpo de alta y edición de plantilla (items reemplaza todos). */
export interface TemplateDraft {
  readonly name: string;
  readonly description?: string | null;
  readonly is_default?: boolean;
  readonly items: readonly Omit<ChecklistItem, 'id' | 'position'>[];
}

export const TYPE_LABEL: Record<PropertyType, string> = {
  apartment: 'Apartamento',
  house: 'Casa',
  room: 'Habitación',
  other: 'Otro',
};

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Entorno de la portada generada a partir de la zona o el edificio: playa,
 * lago, ciudad colonial o ciudad. Solo decide la ilustración; si la
 * propiedad tiene foto, se usa la foto.
 */
export function settingOf(p: { zone: string | null; building_name?: string | null; building_zone?: string | null; type: PropertyType }): PropertySetting {
  const text = norm(`${p.zone ?? ''} ${p.building_zone ?? ''} ${p.building_name ?? ''}`);
  if (/(playa|monterrico|puerto|marbella|escuintla|costa|mar\b|champerico|izabal)/.test(text)) return 'beach';
  if (/(lago|atitlan|panajachel|solola|flores|peten|amatitlan)/.test(text)) return 'lake';
  if (/(antigua|colonial|xela|quetzaltenango)/.test(text)) return 'colonial';
  return p.type === 'house' && !text.trim() ? 'colonial' : 'city';
}

/** Coordenadas "14.5986, -90.5094" (como las copia Google Maps) → par o null. */
export function parseCoords(raw: string): { lat: number; lng: number } | null {
  const m = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(raw);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export function coordsText(lat: number | null, lng: number | null): string {
  return lat === null || lng === null ? '' : `${lat}, ${lng}`;
}
