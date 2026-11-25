import { MapPin, PinStatus, PinType } from '../models/dashboard.model';
import { project } from '../components/properties-map/region-geo';

/**
 * Pines del Inicio en el lienzo del mapa (region-geo.ts) a partir de sus
 * coordenadas reales (las de la propiedad o las de su edificio). Si una
 * propiedad no tiene coordenadas, se ubica en el centro de su zona.
 */
const ZONES: readonly { names: RegExp; lat: number; lng: number }[] = [
  { names: /zona 16|cayal/i, lat: 14.609, lng: -90.487 },
  { names: /zona 1[0-5]|zona [1-9]\b|ciudad de guatemala|mixco|villa nueva/i, lat: 14.599, lng: -90.509 },
  { names: /antigua/i, lat: 14.557, lng: -90.734 },
  { names: /atitl|panajachel|solol/i, lat: 14.741, lng: -91.158 },
  { names: /monterrico/i, lat: 13.895, lng: -90.484 },
  { names: /san jos|puerto|marbella/i, lat: 13.925, lng: -90.824 },
  { names: /escuintla/i, lat: 14.305, lng: -90.785 },
];
const FALLBACK = { lat: 14.557, lng: -90.734 };

export interface PinInput {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly type?: string;
  readonly building?: string | null;
  readonly zone: string | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly open_tickets?: number;
  readonly status: PinStatus;
}

const TYPES: readonly PinType[] = ['apartment', 'house', 'room', 'other'];

export function projectPins(list: readonly PinInput[]): MapPin[] {
  return list.map((p) => {
    const at =
      p.lat !== null && p.lng !== null
        ? { lat: p.lat, lng: p.lng }
        : (ZONES.find((z) => z.names.test(`${p.zone ?? ''} ${p.building ?? ''}`)) ?? FALLBACK);
    const { x, y } = project(at.lat, at.lng);
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
      type: TYPES.includes(p.type as PinType) ? (p.type as PinType) : 'other',
      building: p.building ?? null,
      zone: p.zone,
      openTickets: p.open_tickets ?? 0,
      lat: at.lat,
      lng: at.lng,
      x,
      y,
    };
  });
}
