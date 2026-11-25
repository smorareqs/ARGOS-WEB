/**
 * Geografía del mapa del Inicio: centro y sur de Guatemala (de Retalhuleu a
 * Taxisco y de Tecpán a la costa) en coordenadas reales, proyectada a un
 * lienzo de 600 × 340 unidades (equirectangular corregida por la latitud;
 * 1 unidad ≈ 0,35 km). Trazos simplificados a mano a partir de las
 * coordenadas de costa, lagos, volcanes, ciudades y carreteras principales.
 */

export const WORLD = { w: 600, h: 340 } as const;
/** Kilómetros por unidad del lienzo (para la escala). */
export const KM_PER_UNIT = (1.95 * 108.1) / 600;

const LNG0 = -91.825;
const LNG_SPAN = 1.95;
const LAT1 = 14.86;
const LAT_SPAN = 1.071;

type LngLat = readonly [number, number];

export function project(lat: number, lng: number): { x: number; y: number } {
  return { x: ((lng - LNG0) / LNG_SPAN) * WORLD.w, y: ((LAT1 - lat) / LAT_SPAN) * WORLD.h };
}

const P = ([lng, lat]: LngLat) => project(lat, lng);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Curva suave (Catmull-Rom → Bézier) por los puntos. */
export function smooth(points: readonly { x: number; y: number }[], closed = false): string {
  const p = points;
  const n = p.length;
  if (n < 2) return '';
  const at = (i: number) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${r1(p[0].x)} ${r1(p[0].y)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const a = at(i);
    const b = at(i + 1);
    const p3 = at(i + 2);
    const c1 = { x: a.x + (b.x - p0.x) / 6, y: a.y + (b.y - p0.y) / 6 };
    const c2 = { x: b.x - (p3.x - a.x) / 6, y: b.y - (p3.y - a.y) / 6 };
    d += `C${r1(c1.x)} ${r1(c1.y)} ${r1(c2.x)} ${r1(c2.y)} ${r1(b.x)} ${r1(b.y)}`;
  }
  return closed ? d + 'Z' : d;
}

const line = (pts: readonly LngLat[], closed = false) => smooth(pts.map(P), closed);

/* ── Costa y agua ─────────────────────────────────────── */

const COAST: LngLat[] = [
  [-91.95, 14.33], [-91.8, 14.25], [-91.62, 14.16], [-91.47, 14.09], [-91.32, 14.01], [-91.15, 13.935],
  [-90.98, 13.92], [-90.82, 13.922], [-90.7, 13.928], [-90.6, 13.916], [-90.48, 13.892], [-90.38, 13.858],
  [-90.26, 13.8], [-90.12, 13.745], [-89.75, 13.62],
];

export const COAST_LINE = line(COAST);
export const LAND = `${COAST_LINE}L${r1(P([-89.75, 15.4]).x)} ${r1(P([-89.75, 15.4]).y)}L${r1(P([-91.95, 15.4]).x)} ${r1(P([-91.95, 15.4]).y)}Z`;
/** Canal de Chiquimulilla, paralelo a la costa. */
export const CANAL = line(COAST.filter(([lng]) => lng > -90.86 && lng < -90.15).map(([lng, lat]) => [lng, lat + 0.022] as const));
/** Olas: copias de la costa mar adentro. */
export const WAVES = [0.035, 0.075].map((o) => line(COAST.map(([lng, lat]) => [lng, lat - o] as const)));

export const LAKES = [
  {
    name: 'Lago de Atitlán',
    label: project(14.695, -91.2),
    d: line(
      [
        [-91.155, 14.745], [-91.12, 14.732], [-91.1, 14.703], [-91.112, 14.672], [-91.142, 14.66], [-91.172, 14.664],
        [-91.2, 14.648], [-91.226, 14.626], [-91.247, 14.645], [-91.272, 14.664], [-91.292, 14.69], [-91.282, 14.72],
        [-91.252, 14.741], [-91.212, 14.752], [-91.182, 14.751],
      ],
      true,
    ),
  },
  {
    name: 'Lago de Amatitlán',
    label: project(14.43, -90.585),
    d: line(
      [[-90.64, 14.452], [-90.61, 14.462], [-90.575, 14.468], [-90.545, 14.463], [-90.53, 14.452], [-90.55, 14.443], [-90.585, 14.447], [-90.62, 14.442]],
      true,
    ),
  },
];

/* ── Relieve ──────────────────────────────────────────── */

export interface Volcano {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  /** Ancho de la base en unidades a escala 1. */
  readonly base: number;
  readonly active?: boolean;
}

export const VOLCANOES: readonly Volcano[] = [
  { name: 'Santa María', lat: 14.756, lng: -91.552, h: 3772 },
  { name: 'San Pedro', lat: 14.656, lng: -91.266, h: 3020 },
  { name: 'Tolimán', lat: 14.612, lng: -91.189, h: 3158 },
  { name: 'Atitlán', lat: 14.583, lng: -91.186, h: 3535 },
  { name: 'Acatenango', lat: 14.501, lng: -90.876, h: 3976 },
  { name: 'Fuego', lat: 14.473, lng: -90.88, h: 3763, active: true },
  { name: 'Agua', lat: 14.465, lng: -90.743, h: 3760 },
  { name: 'Pacaya', lat: 14.381, lng: -90.601, h: 2552, active: true },
].map((v) => ({ name: v.name, ...project(v.lat, v.lng), base: (v.h / 3976) * 24, active: v.active }));

/** Sombreado de altura: manchas suaves sobre la cadena volcánica y la meseta. */
export const HIGHLANDS = (
  [
    [14.66, -91.22, 70, 34],
    [14.48, -90.82, 58, 26],
    [14.74, -90.95, 90, 26],
    [14.4, -90.6, 30, 16],
    [14.76, -91.5, 60, 26],
  ] as const
).map(([lat, lng, rx, ry]) => ({ ...project(lat, lng), rx, ry }));

/** Ríos principales que bajan de la sierra al Pacífico. */
export const RIVERS = [
  line([[-90.62, 14.445], [-90.66, 14.36], [-90.7, 14.26], [-90.74, 14.12], [-90.75, 14.0], [-90.72, 13.93]]), // María Linda
  line([[-90.76, 14.44], [-90.8, 14.34], [-90.86, 14.2], [-90.88, 14.05], [-90.9, 13.925]]), // Achiguate
  line([[-91.02, 14.62], [-91.08, 14.48], [-91.14, 14.32], [-91.2, 14.15], [-91.24, 13.98]]), // Coyolate
  line([[-91.36, 14.6], [-91.4, 14.45], [-91.45, 14.28], [-91.5, 14.12]]), // Nahualate
  line([[-91.56, 14.72], [-91.64, 14.55], [-91.74, 14.4], [-91.84, 14.27]]), // Samalá
  line([[-90.44, 14.5], [-90.42, 14.3], [-90.38, 14.1], [-90.34, 13.85]]), // Los Esclavos
];

/** Curvas de nivel: anillos irregulares alrededor de cada volcán y de la meseta. */
export const CONTOURS: string = (() => {
  const rings: string[] = [];
  VOLCANOES.forEach((v, vi) => {
    const levels = Math.round(v.base / 3.2);
    for (let i = 1; i <= levels; i++) {
      const r = v.base * 1.55 * (i / levels);
      const pts = Array.from({ length: 18 }, (_, k) => {
        const a = (k / 18) * Math.PI * 2;
        const wob = 1 + 0.13 * Math.sin(3 * a + vi * 1.7 + i) + 0.07 * Math.sin(5 * a + vi);
        return { x: v.x + Math.cos(a) * r * wob, y: v.y + 2 + Math.sin(a) * r * wob * 0.72 };
      });
      rings.push(smooth(pts, true));
    }
  });
  // Bordes de la meseta: líneas que siguen la sierra al norte.
  for (let i = 0; i < 4; i++) {
    const lat = 14.45 + i * 0.06;
    const pts = Array.from({ length: 12 }, (_, k) => {
      const lng = -91.95 + k * 0.2;
      return project(lat + 0.035 * Math.sin(k * 1.3 + i) + 0.02 * Math.sin(k * 2.9), lng);
    });
    rings.push(smooth(pts));
  }
  return rings.join('');
})();

/* ── Ciudades y zonas urbanas ─────────────────────────── */

export interface Place {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  /** 1 capital, 2 cabecera, 3 pueblo (aparece al acercar). */
  readonly rank: 1 | 2 | 3;
}

export const PLACES: readonly Place[] = (
  [
    ['Ciudad de Guatemala', 14.634, -90.507, 1],
    ['Antigua Guatemala', 14.557, -90.734, 2],
    ['Escuintla', 14.305, -90.785, 2],
    ['Mazatenango', 14.534, -91.503, 2],
    ['Retalhuleu', 14.537, -91.677, 2],
    ['Chimaltenango', 14.661, -90.82, 3],
    ['Panajachel', 14.741, -91.159, 3],
    ['Sololá', 14.773, -91.183, 3],
    ['Santiago Atitlán', 14.636, -91.23, 3],
    ['Tecpán', 14.762, -90.994, 3],
    ['Puerto San José', 13.925, -90.82, 3],
    ['Monterrico', 13.895, -90.484, 3],
    ['Taxisco', 14.07, -90.46, 3],
  ] as const
).map(([name, lat, lng, rank]) => ({ name, rank, ...project(lat, lng) }));

/** Lugares de referencia que aparecen al acercar mucho. */
export const POIS = (
  [
    ['Parque Central', 14.5566, -90.7343],
    ['Arco de Santa Catalina', 14.5606, -90.7346],
    ['Cerro de la Cruz', 14.566, -90.7302],
    ['La Merced', 14.5614, -90.7339],
    ['Centro Histórico', 14.642, -90.513],
    ['Zona 10', 14.6, -90.5055],
    ['Cayalá', 14.6118, -90.4835],
    ['Aeropuerto La Aurora', 14.583, -90.528],
    ['San Pedro La Laguna', 14.692, -91.272],
    ['Santa Cruz La Laguna', 14.745, -91.205],
    ['Iztapa', 13.933, -90.708],
  ] as const
).map(([name, lat, lng]) => ({ name, ...project(lat, lng) }));

export const URBAN = [
  line([[-90.62, 14.66], [-90.56, 14.69], [-90.47, 14.68], [-90.44, 14.63], [-90.46, 14.56], [-90.52, 14.52], [-90.6, 14.53], [-90.63, 14.6]], true),
  line([[-90.747, 14.568], [-90.722, 14.568], [-90.72, 14.547], [-90.746, 14.546]], true),
  line([[-90.8, 14.318], [-90.77, 14.318], [-90.768, 14.292], [-90.8, 14.292]], true),
  line([[-91.52, 14.546], [-91.49, 14.546], [-91.488, 14.522], [-91.52, 14.522]], true),
];

/** Retícula de calles que aparece al acercar (Antigua y la capital). */
export const STREETS: string = (() => {
  const seg: string[] = [];
  const grid = (lng0: number, lng1: number, lat0: number, lat1: number, step: number) => {
    for (let lng = lng0; lng <= lng1 + 1e-9; lng += step) {
      const a = project(lat0, lng);
      const b = project(lat1, lng);
      seg.push(`M${r1(a.x)} ${r1(a.y)}L${r1(b.x)} ${r1(b.y)}`);
    }
    for (let lat = lat0; lat <= lat1 + 1e-9; lat += step * 0.97) {
      const a = project(lat, lng0);
      const b = project(lat, lng1);
      seg.push(`M${r1(a.x)} ${r1(a.y)}L${r1(b.x)} ${r1(b.y)}`);
    }
  };
  grid(-90.744, -90.723, 14.548, 14.566, 0.0019);
  grid(-90.6, -90.46, 14.54, 14.67, 0.0065);
  return seg.join('');
})();

/* ── Carreteras ───────────────────────────────────────── */

export const ROADS_MAJOR = [
  // CA-1 Interamericana: capital → Chimaltenango → Tecpán → Los Encuentros
  line([[-90.507, 14.634], [-90.56, 14.64], [-90.606, 14.633], [-90.66, 14.61], [-90.73, 14.63], [-90.82, 14.661], [-90.9, 14.7], [-90.994, 14.762], [-91.06, 14.775], [-91.13, 14.78], [-91.25, 14.82], [-91.35, 14.85], [-91.45, 14.88]]),
  // CA-9: capital → Escuintla → Puerto San José
  line([[-90.507, 14.634], [-90.53, 14.58], [-90.59, 14.53], [-90.62, 14.47], [-90.7, 14.4], [-90.75, 14.35], [-90.785, 14.305], [-90.82, 14.2], [-90.83, 14.05], [-90.82, 13.925]]),
  // CA-2 del Pacífico
  line([[-91.95, 14.52], [-91.677, 14.537], [-91.503, 14.534], [-91.33, 14.46], [-91.17, 14.41], [-90.97, 14.3], [-90.785, 14.305], [-90.62, 14.18], [-90.46, 14.07], [-90.3, 13.98], [-90.1, 13.9]]),
];

export const ROADS_MINOR = [
  line([[-91.13, 14.78], [-91.183, 14.773], [-91.17, 14.755], [-91.159, 14.741]]), // a Panajachel
  line([[-90.734, 14.557], [-90.76, 14.59], [-90.79, 14.63], [-90.82, 14.661]]), // Antigua – Chimaltenango
  line([[-90.734, 14.557], [-90.7, 14.57], [-90.66, 14.61]]), // Antigua – San Lucas
  line([[-90.734, 14.557], [-90.78, 14.51], [-90.81, 14.48], [-90.8, 14.4], [-90.785, 14.305]]), // RN-14 entre Agua y Fuego
  line([[-90.46, 14.07], [-90.47, 13.98], [-90.484, 13.895]]), // a Monterrico
  line([[-91.17, 14.41], [-91.19, 14.5], [-91.215, 14.58], [-91.23, 14.636]]), // a Santiago Atitlán
];

export const SHIELDS = (
  [
    ['CA-1', 14.7, -90.9],
    ['CA-9', 14.4, -90.7],
    ['CA-2', 14.46, -91.33],
    ['14', 14.43, -90.803],
  ] as const
).map(([label, lat, lng]) => ({ label, ...project(lat, lng) }));

export const SEA_LABEL = project(13.83, -91.25);

/* ── Zonas para saltar en el mapa ─────────────────────── */

export const AREAS = (
  [
    ['Ciudad de Guatemala', 14.62, -90.52],
    ['Antigua', 14.557, -90.734],
    ['Atitlán', 14.69, -91.2],
    ['Monterrico', 13.9, -90.48],
    ['Puerto San José', 13.925, -90.82],
    ['Escuintla', 14.305, -90.785],
  ] as const
).map(([label, lat, lng]) => ({ label, ...project(lat, lng) }));
