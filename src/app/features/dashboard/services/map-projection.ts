import { MapPin, PinStatus } from '../models/dashboard.model';

/**
 * Proyección de coordenadas reales al mapa estilizado del Inicio
 * (properties-map: centro-sur de Guatemala, no a escala). Cada punto de
 * control es un lugar dibujado en el mapa; un pin se ubica por cercanía a
 * ellos (distancia inversa) más un pequeño desplazamiento local, y los que
 * caen encima de otro se separan en círculo.
 */
const CONTROL: readonly { lat: number; lng: number; x: number; y: number; names: RegExp }[] = [
  { lat: 14.741, lng: -91.158, x: 21, y: 40, names: /atitl|panajachel|solol/i },
  { lat: 14.557, lng: -90.734, x: 50, y: 47, names: /antigua/i },
  { lat: 14.599, lng: -90.509, x: 75, y: 35, names: /zona 1[0-5]|zona [1-9]\b|ciudad de guatemala/i },
  { lat: 14.609, lng: -90.487, x: 82, y: 30, names: /zona 16|cayal/i },
  { lat: 13.895, lng: -90.484, x: 63, y: 82, names: /monterrico/i },
  { lat: 13.925, lng: -90.824, x: 57, y: 85, names: /san jos|escuintla|puerto/i },
];

/** Desplazamiento local en % por grado (separa propiedades del mismo barrio). */
const LOCAL = 140;

export interface PinInput {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly zone: string | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly status: PinStatus;
}

export function projectPins(list: readonly PinInput[]): MapPin[] {
  const placed = list.map((p) => ({ ...p, ...position(p) }));
  return spread(placed).map(({ id, code, name, status, x, y }) => ({ id, code, name, status, x, y }));
}

function position(p: PinInput): { x: number; y: number } {
  if (p.lat === null || p.lng === null) {
    const c = CONTROL.find((k) => p.zone && k.names.test(p.zone)) ?? { x: 50, y: 62 };
    return { x: c.x, y: c.y };
  }
  let wx = 0;
  let wy = 0;
  let total = 0;
  for (const c of CONTROL) {
    const d2 = (p.lat - c.lat) ** 2 + (p.lng - c.lng) ** 2;
    if (d2 < 1e-10) return { x: c.x, y: c.y };
    const w = 1 / d2;
    wx += w * (c.x + (p.lng - c.lng) * LOCAL);
    wy += w * (c.y - (p.lat - c.lat) * LOCAL);
    total += w;
  }
  return { x: clamp(wx / total, 4, 96), y: clamp(wy / total, 6, 92) };
}

/** Pines a menos de 3 % entre sí: se reparten en un círculo alrededor del primero. */
function spread<T extends { x: number; y: number }>(list: T[]): T[] {
  const out: T[] = [];
  const groups: { x: number; y: number; n: number }[] = [];
  for (const p of list) {
    const g = groups.find((k) => Math.hypot(k.x - p.x, (k.y - p.y) * 0.57) < 3);
    if (!g) {
      groups.push({ x: p.x, y: p.y, n: 1 });
      out.push(p);
      continue;
    }
    const angle = g.n * 2.4;
    const r = 2.6 + 0.9 * Math.floor(g.n / 6);
    g.n += 1;
    out.push({ ...p, x: clamp(g.x + Math.cos(angle) * r, 4, 96), y: clamp(g.y + Math.sin(angle) * r * 1.75, 6, 92) });
  }
  return out;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
