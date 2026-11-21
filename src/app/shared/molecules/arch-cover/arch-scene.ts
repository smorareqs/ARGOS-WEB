/**
 * Generador de escenas arquitectónicas para app-arch-cover.
 * Lienzo 400×300, suelo en y=250. Todo es determinista por semilla.
 */

export type ArchKind = 'tower' | 'house' | 'hotel';
export type ArchSetting = 'city' | 'colonial' | 'beach' | 'lake';
export type Palette = 'day' | 'dusk' | 'night' | 'dawn';

interface Colors {
  sky0: string;
  sky1: string;
  far: string;
  main: string;
  mid: string;
  mid2: string;
  ground: string;
  water: string;
  wall: string;
  wall2: string;
  roof: string;
  tree: string;
  sun: string;
  win: string;
  lit: string;
  litRatio: number;
  stars: boolean;
}

const PALETTES: Record<Palette, Colors> = {
  day: {
    sky0: '#cfe1dc', sky1: '#f4f1ea', far: '#3a6168', main: '#003841', mid: '#2a5660', mid2: '#4b7076',
    ground: '#e7e4dd', water: '#9fc2bc', wall: '#fbfaf6', wall2: '#ebcf9c', roof: '#9a5b3a',
    tree: '#5a8a6b', sun: '#fbf3e4', win: 'rgba(255,255,255,0.16)', lit: '#e0a961', litRatio: 0.1, stars: false,
  },
  dusk: {
    sky0: '#eeb985', sky1: '#f8e6cf', far: '#8a6243', main: '#003841', mid: '#1f4c56', mid2: '#3a6168',
    ground: '#e2d3bd', water: '#d6ad7f', wall: '#f6eadb', wall2: '#e3b979', roof: '#86492f',
    tree: '#3f6b55', sun: '#f3c27a', win: 'rgba(255,255,255,0.14)', lit: '#f0b964', litRatio: 0.42, stars: false,
  },
  night: {
    sky0: '#011c22', sky1: '#0c4651', far: '#0f525d', main: '#00242b', mid: '#04323a', mid2: '#093d46',
    ground: '#062d34', water: '#0b4650', wall: '#c8c0b1', wall2: '#b4966a', roof: '#583423',
    tree: '#0d3832', sun: '#f6e7d2', win: 'rgba(255,255,255,0.07)', lit: '#f2c06b', litRatio: 0.6, stars: true,
  },
  dawn: {
    sky0: '#e3ecea', sky1: '#fdf6ea', far: '#97b2ae', main: '#3a6168', mid: '#577b80', mid2: '#789598',
    ground: '#ece8df', water: '#c3d9d4', wall: '#ffffff', wall2: '#efd8b0', roof: '#a5694a',
    tree: '#78a087', sun: '#f7dcb4', win: 'rgba(255,255,255,0.22)', lit: '#e0a961', litRatio: 0.08, stars: false,
  },
};

const ORDER: Palette[] = ['day', 'dusk', 'night', 'dawn'];

export interface Shape {
  d: string;
  fill?: string;
  stroke?: string;
  sw?: number;
  o: number;
}

export interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  off: string;
  on: boolean;
  d: number;
}

export interface Scene {
  p: Colors;
  sun: { x: number; y: number; r: number } | null;
  stars: { x: number; y: number; r: number; d: number }[];
  back: Shape[];
  bodies: Shape[];
  windows: Win[];
  front: Shape[];
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;

export function buildScene(seed: string, kind: ArchKind, setting: ArchSetting, palette: Palette | null): Scene {
  const r = mulberry(hash(seed));
  const between = (a: number, b: number) => a + r() * (b - a);
  const p = PALETTES[palette ?? ORDER[hash(seed + 'p') % ORDER.length]];
  const s: Scene = { p, sun: null, stars: [], back: [], bodies: [], windows: [], front: [] };
  let wi = 0;
  const win = (x: number, y: number, w: number, h: number, off = p.win, rx = 1.5) =>
    s.windows.push({ x, y, w, h, rx, off, on: r() < p.litRatio, d: (wi++ % 24) * 22 });

  // ── Cielo ──────────────────────────────────────────────
  if (p.stars) {
    for (let i = 0; i < 22; i++) {
      s.stars.push({ x: between(0, 400), y: between(8, 150), r: between(0.6, 1.5), d: Math.round(between(0, 3000)) });
    }
  }
  s.sun = { x: between(250, 340), y: setting === 'beach' ? 212 : between(52, 92), r: setting === 'beach' ? 30 : between(16, 24) };

  // ── Fondo según entorno ───────────────────────────────
  if (setting === 'city') {
    let x = -20;
    while (x < 400) {
      const w = between(34, 60);
      const h = between(60, 150);
      s.back.push({ d: rect(x, 250 - h, w, h), fill: p.far, o: 0.22 });
      x += w + between(4, 16);
    }
  } else if (setting === 'colonial') {
    s.back.push({ d: 'M20 250C110 168 160 92 196 80C232 92 282 168 372 250Z', fill: p.far, o: 0.42 });
    s.back.push({ d: 'M250 250C292 204 318 168 338 160C358 168 380 204 420 250Z', fill: p.far, o: 0.26 });
  } else if (setting === 'lake') {
    s.back.push({ d: 'M40 214C96 170 126 128 150 120C174 128 206 170 262 214Z', fill: p.far, o: 0.3 });
    s.back.push({ d: 'M160 214C210 160 236 104 258 96C280 104 306 160 356 214Z', fill: p.far, o: 0.46 });
    s.back.push({ d: 'M290 214C326 182 346 150 364 144C382 150 400 182 430 214Z', fill: p.far, o: 0.24 });
    s.back.push({ d: rect(0, 206, 400, 44), fill: p.water, o: 1 });
  } else {
    s.back.push({ d: rect(0, 212, 400, 38), fill: p.water, o: 1 });
  }
  if (setting === 'beach' || setting === 'lake') {
    for (let i = 0; i < 3; i++) {
      const y = 222 + i * 9;
      s.front.push({ d: `M${between(10, 150)} ${y}h${between(30, 70)}`, stroke: '#ffffff', sw: 1.6, o: 0.35 });
    }
  }

  // ── Edificio principal ────────────────────────────────
  if (kind === 'tower') {
    const bx = between(58, 84);
    const btop = between(96, 128);
    s.bodies.push({ d: rect(bx, btop, 66, 250 - btop), fill: p.mid2, o: 1 });
    for (let y = btop + 12; y < 238; y += 20) for (let c = 0; c < 3; c++) win(bx + 9 + c * 18, y, 11, 10);

    const mx = 150;
    const mw = 100;
    const mtop = between(46, 74);
    s.bodies.push({ d: rect(mx + 14, mtop - 14, mw - 28, 14), fill: p.main, o: 1 });
    s.bodies.push({ d: rect(mx, mtop, mw, 250 - mtop), fill: p.main, o: 1 });
    s.front.push({ d: `M${mx + mw / 2} ${mtop - 14}v-20`, stroke: p.main, sw: 2.2, o: 1 });
    for (let y = mtop + 12; y < 236; y += 21) {
      for (let c = 0; c < 4; c++) win(mx + 11 + c * 21, y, 15, 12);
    }
    const sx = 262;
    const stop = between(122, 150);
    s.bodies.push({ d: rect(sx, stop, 62, 250 - stop), fill: p.mid, o: 1 });
    for (let y = stop + 12; y < 238; y += 19) for (let c = 0; c < 2; c++) win(sx + 11 + c * 24, y, 15, 10);
  } else if (kind === 'hotel') {
    const x = 112;
    const w = 176;
    const top = between(92, 112);
    s.bodies.push({ d: rect(x - 6, top - 10, w + 12, 12), fill: p.roof, o: 1 });
    s.bodies.push({ d: rect(x, top, w, 250 - top), fill: setting === 'colonial' ? p.wall2 : p.wall, o: 1 });
    const floors = Math.floor((250 - top - 56) / 40);
    for (let f = 0; f < floors; f++) {
      const y = top + 16 + f * 40;
      for (let c = 0; c < 4; c++) {
        win(x + 18 + c * 40, y, 22, 24, p.main, 11);
        s.front.push({ d: `M${x + 12 + c * 40} ${y + 27}h34`, stroke: p.main, sw: 2, o: 0.9 });
      }
    }
    s.bodies.push({ d: `M${x + w / 2 - 18} 250v-30a18 18 0 0136 0v30Z`, fill: p.main, o: 1 });
  } else if (setting === 'colonial') {
    const x = 84;
    const w = 232;
    s.bodies.push({ d: rect(x, 164, w, 86), fill: p.wall2, o: 1 });
    s.bodies.push({ d: `M${x - 10} 168L${x + 12} 146H${x + w - 12}L${x + w + 10} 168Z`, fill: p.roof, o: 1 });
    for (let c = 0; c < 4; c++) {
      const ax = x + 22 + c * 52;
      s.bodies.push({ d: `M${ax} 250v-34a15 15 0 0130 0v34Z`, fill: p.main, o: 0.92 });
      win(ax + 7, 176, 16, 14, p.main, 2);
    }
    s.front.push({ d: rect(x - 4, 244, w + 8, 6), fill: p.roof, o: 0.5 });
  } else if (setting === 'beach') {
    s.bodies.push({ d: 'M112 250v-60h176v60Z', fill: p.wall, o: 1 });
    s.bodies.push({ d: 'M100 194L200 132L300 194Z', fill: p.main, o: 1 });
    s.bodies.push({ d: rect(188, 212, 24, 38), fill: p.main, o: 1 });
    win(132, 206, 34, 24, p.main, 3);
    win(234, 206, 34, 24, p.main, 3);
    win(190, 160, 20, 16, p.main, 8);
    s.front.push({ d: 'M96 250h208', stroke: p.roof, sw: 4, o: 0.6 });
  } else {
    s.bodies.push({ d: rect(104, 168, 128, 82), fill: p.mid, o: 1 });
    s.bodies.push({ d: rect(206, 132, 104, 118), fill: p.main, o: 1 });
    s.bodies.push({ d: rect(198, 126, 120, 8), fill: p.main, o: 1 });
    win(220, 146, 76, 40, p.win, 3);
    win(220, 196, 34, 36, p.win, 3);
    win(262, 196, 34, 36, p.win, 3);
    win(118, 184, 44, 30, p.win, 3);
    win(170, 184, 48, 30, p.win, 3);
  }

  // ── Vegetación ────────────────────────────────────────
  const spots = [between(14, 52), between(342, 384)];
  for (const tx of spots) {
    if (setting === 'beach' || setting === 'lake') {
      const h = between(74, 96);
      const lean = between(-10, 10);
      const topX = tx + lean;
      const topY = 250 - h;
      s.front.push({ d: `M${tx} 250Q${tx + lean * 0.2} ${250 - h / 2} ${topX} ${topY}`, stroke: p.tree, sw: 5, o: 1 });
      for (const a of [-1, -0.45, 0.1, 0.6, 1.1]) {
        const ex = topX + Math.cos(Math.PI * (1 + a) * 0.5) * 34;
        const ey = topY + Math.abs(a) * 14 + 6;
        s.front.push({ d: `M${topX} ${topY}Q${(topX + ex) / 2} ${topY - 16} ${ex} ${ey}`, stroke: p.tree, sw: 4, o: 1 });
      }
    } else {
      const cr = between(15, 23);
      s.front.push({ d: rect(tx - 2, 250 - cr - 14, 4, cr + 14), fill: p.roof, o: 0.8 });
      s.front.push({
        d: `M${tx - cr} ${250 - cr - 12}a${cr} ${cr} 0 1 0 ${cr * 2} 0a${cr} ${cr} 0 1 0 ${-cr * 2} 0`,
        fill: p.tree,
        o: 1,
      });
    }
  }
  return s;
}
