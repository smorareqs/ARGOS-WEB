import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, output,
  signal, untracked, viewChild,
} from '@angular/core';
import { MapPin, PinStatus } from '../../models/dashboard.model';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { DimIconComponent } from '../../../../shared/atoms/dim-icon/dim-icon.component';
import { AREAS, KM_PER_UNIT, WORLD } from './region-geo';
import { MapView, RegionMapComponent } from './region-map.component';
import { MapCardComponent } from './map-card.component';

export const PIN_META: Record<PinStatus, { label: string; color: string }> = {
  incident: { label: 'Incidencia', color: 'var(--color-danger)' },
  cleaning: { label: 'En limpieza', color: 'var(--color-secondary)' },
  occupied: { label: 'Ocupada', color: 'var(--color-primary)' },
  ready: { label: 'Lista', color: 'var(--color-success)' },
};
const ORDER = Object.keys(PIN_META) as PinStatus[];
const DIM = { house: 'house', apartment: 'apartment', room: 'room', other: 'other' } as const;

interface Cam {
  readonly cx: number;
  readonly cy: number;
  readonly w: number;
}

interface Cluster {
  readonly id: string;
  readonly members: readonly MapPin[];
  readonly sx: number;
  readonly sy: number;
  /** Todos en el mismo edificio (no se separan al acercar). */
  readonly building: string | null;
  readonly ring: readonly { color: string; dash: string; offset: number }[];
}

const MIN_W = 7;
const RING = 2 * Math.PI * 17;
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Mapa de propiedades de hoy (W-B1). Cartografía propia del centro y sur de
 * Guatemala con las propiedades en sus coordenadas reales (ref. el mapa de
 * Airbnb: marcadores en píldora con el dato, agrupación con conteo; Mapbox:
 * grupos con anillo por categoría).
 *
 * Al cargar, la cámara vuela de la región a donde están tus propiedades. Los
 * pines cercanos se agrupan (anillo con los estados) y se separan al acercar;
 * los de un mismo edificio forman una píldora con su nombre. Se arrastra para
 * mover, Ctrl + rueda o doble clic para acercar. Clic en un pin → tarjeta con
 * la portada y el estado; clic en un grupo → acerca o lista sus unidades.
 */
@Component({
  selector: 'app-properties-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RegionMapComponent, MapCardComponent, IconComponent, DimIconComponent],
  templateUrl: './properties-map.component.html',
  styleUrl: './properties-map.component.css',
})
export class PropertiesMapComponent {
  readonly pins = input.required<readonly MapPin[]>();
  readonly pinClick = output<MapPin>();

  protected readonly meta = PIN_META;
  protected readonly order = ORDER;
  protected readonly dim = DIM;

  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  private readonly size = signal({ w: 0, h: 0 });
  private readonly cam = signal<Cam>({ cx: 300, cy: 150, w: WORLD.w });
  protected readonly hidden = signal<ReadonlySet<PinStatus>>(new Set());
  protected readonly selected = signal<{ ids: readonly string[]; title: string | null } | null>(null);
  protected readonly hint = signal(false);
  protected readonly dragging = signal(false);

  private anim = 0;
  private hintTimer: ReturnType<typeof setTimeout> | undefined;
  private flown = false;
  private drag: { x: number; y: number; moved: boolean } | null = null;
  /** Dedos en pantalla (pellizcar para acercar). */
  private readonly touches = new Map<number, { x: number; y: number }>();

  private readonly aspect = computed(() => {
    const s = this.size();
    return s.w ? s.h / s.w : WORLD.h / WORLD.w;
  });

  protected readonly view = computed<MapView>(() => {
    const c = this.cam();
    const h = c.w * this.aspect();
    return { x: c.cx - c.w / 2, y: c.cy - h / 2, w: c.w, h };
  });

  /** Unidades del lienzo por píxel. */
  protected readonly unit = computed(() => (this.size().w ? this.view().w / this.size().w : 1));

  protected readonly visible = computed(() => this.pins().filter((p) => !this.hidden().has(p.status)));

  protected readonly legend = computed(() =>
    ORDER.map((k) => ({ key: k, ...PIN_META[k], count: this.pins().filter((p) => p.status === k).length })),
  );

  protected readonly clusters = computed<Cluster[]>(() => {
    const v = this.view();
    const u = this.unit();
    const sorted = [...this.visible()].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
    const groups: { sx: number; sy: number; members: MapPin[] }[] = [];
    for (const p of sorted) {
      const sx = (p.x - v.x) / u;
      const sy = (p.y - v.y) / u;
      const g = groups.find((k) => Math.abs(k.sx - sx) < 66 && Math.abs(k.sy - sy) < 34);
      if (g) g.members.push(p);
      else groups.push({ sx, sy, members: [p] });
    }
    const s = this.size();
    return groups.filter((g) => g.sx > -60 && g.sy > -40 && g.sx < s.w + 60 && g.sy < s.h + 40).map((g) => {
      const members = g.members;
      const sx = members.reduce((s, p) => s + (p.x - v.x) / u, 0) / members.length;
      const sy = members.reduce((s, p) => s + (p.y - v.y) / u, 0) / members.length;
      const b = members[0].building;
      let acc = 0;
      const ring = ORDER.flatMap((st) => {
        const n = members.filter((p) => p.status === st).length;
        if (!n) return [];
        const len = (n / members.length) * RING;
        const seg = { color: PIN_META[st].color, dash: `${Math.max(0, len - 1.5)} ${RING}`, offset: -acc };
        acc += len;
        return [seg];
      });
      return {
        id: members.map((p) => p.id).sort().join('|'),
        members,
        sx,
        sy,
        building: members.length > 1 && b && members.every((p) => p.building === b) ? b : null,
        ring,
      };
    });
  });

  /** Dónde hay pines, en el lienzo (para que los nombres no queden debajo). */
  protected readonly covered = computed(() => {
    const v = this.view();
    const u = this.unit();
    return this.clusters().map((c) => ({ x: v.x + c.sx * u, y: v.y + c.sy * u }));
  });

  protected readonly areas = computed(() =>
    AREAS.map((a) => ({
      ...a,
      members: this.pins().filter(
        (p) => Math.hypot(p.x - a.x, p.y - a.y) < 30 && AREAS.every((o) => Math.hypot(p.x - o.x, p.y - o.y) >= Math.hypot(p.x - a.x, p.y - a.y)),
      ),
    }))
      .filter((a) => a.members.length)
      .sort((a, b) => b.members.length - a.members.length),
  );

  protected readonly card = computed(() => {
    const s = this.selected();
    if (!s) return null;
    const list = s.ids.map((id) => this.pins().find((p) => p.id === id)).filter((p): p is MapPin => !!p);
    return list.length ? { pins: list, title: s.title } : null;
  });

  /** Escala: la distancia redonda que mide entre 56 y 120 px. */
  protected readonly scale = computed(() => {
    const kmPerPx = this.unit() * KM_PER_UNIT;
    const km = [0.5, 1, 2, 5, 10, 20, 50, 100].find((k) => k / kmPerPx >= 56) ?? 100;
    return { px: Math.round(km / kmPerPx), label: km < 1 ? `${km * 1000} m` : `${km} km` };
  });

  protected readonly zoomPct = computed(() => WORLD.w / this.cam().w);
  protected readonly maxZoom = WORLD.w / MIN_W - 0.5;

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.frame().nativeElement;
      const ro = new ResizeObserver(([e]) => this.size.set({ w: e.contentRect.width, h: e.contentRect.height }));
      ro.observe(el);
      destroy.onDestroy(() => {
        ro.disconnect();
        cancelAnimationFrame(this.anim);
        clearTimeout(this.hintTimer);
      });
    });
    // Primera carga: de la región a tus propiedades.
    effect(() => {
      const pins = this.pins();
      const ready = this.size().w > 0;
      if (!ready || !pins.length || untracked(() => this.flown)) return;
      this.flown = true;
      untracked(() => {
        if (reduced()) this.cam.set(this.fit(pins));
        else setTimeout(() => this.flyTo(this.fit(pins), 1500), 380);
      });
    });
  }

  /* ── Cámara ───────────────────────────────────────── */

  private clamp(c: Cam): Cam {
    const w = Math.min(WORLD.w, Math.max(MIN_W, c.w));
    return { w, cx: Math.min(WORLD.w, Math.max(0, c.cx)), cy: Math.min(WORLD.h, Math.max(-40, c.cy)) };
  }

  private fit(list: readonly MapPin[], min = 34): Cam {
    const xs = list.map((p) => p.x);
    const ys = list.map((p) => p.y);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const w = Math.max((x1 - x0) * 1.5 + 24, ((y1 - y0) * 1.5 + 24) / this.aspect(), min);
    // Deja aire arriba para los atajos de zona.
    const lift = this.size().w ? (20 * w) / this.size().w : 0;
    return this.clamp({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 - lift, w });
  }

  private flyTo(target: Cam, ms = 900): void {
    cancelAnimationFrame(this.anim);
    const to = this.clamp(target);
    if (reduced()) {
      this.cam.set(to);
      return;
    }
    const from = this.cam();
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.cam.set({
        cx: from.cx + (to.cx - from.cx) * e,
        cy: from.cy + (to.cy - from.cy) * e,
        w: from.w * Math.pow(to.w / from.w, e),
      });
      if (t < 1) this.anim = requestAnimationFrame(step);
    };
    this.anim = requestAnimationFrame(step);
  }

  /** Acerca (f < 1) o aleja alrededor de un punto de la pantalla (px). */
  private zoomAt(f: number, px: number, py: number, animate: boolean): void {
    const v = this.view();
    const u = this.unit();
    const wx = v.x + px * u;
    const wy = v.y + py * u;
    const w = Math.min(WORLD.w, Math.max(MIN_W, v.w * f));
    const s = this.size();
    const nu = w / s.w;
    const target = { w, cx: wx - px * nu + w / 2, cy: wy - py * nu + (w * this.aspect()) / 2 };
    if (animate) this.flyTo(target, 420);
    else this.cam.set(this.clamp(target));
  }

  protected zoom(f: number): void {
    const s = this.size();
    this.zoomAt(f, s.w / 2, s.h / 2, true);
  }

  protected fitAll(): void {
    this.selected.set(null);
    if (this.pins().length) this.flyTo(this.fit(this.pins()));
  }

  protected goArea(members: readonly MapPin[]): void {
    this.selected.set(null);
    this.flyTo(this.fit(members));
  }

  /* ── Gestos ───────────────────────────────────────── */

  protected onDown(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('button, a, .no-pan') || e.button !== 0) return;
    this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cancelAnimationFrame(this.anim);
    this.drag = { x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  protected onMove(e: PointerEvent): void {
    const prev = this.touches.get(e.pointerId);
    if (prev && this.touches.size === 2) {
      const [a, b] = [...this.touches.values()];
      const before = Math.hypot(a.x - b.x, a.y - b.y);
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [c, d2] = [...this.touches.values()];
      const after = Math.hypot(c.x - d2.x, c.y - d2.y);
      const r = this.frame().nativeElement.getBoundingClientRect();
      if (before > 0 && after > 0) this.zoomAt(before / after, (c.x + d2.x) / 2 - r.left, (c.y + d2.y) / 2 - r.top, false);
      if (this.drag) this.drag.moved = true;
      return;
    }
    if (prev) this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = this.drag;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    this.dragging.set(true);
    const u = this.unit();
    const c = this.cam();
    this.cam.set(this.clamp({ ...c, cx: c.cx - dx * u, cy: c.cy - dy * u }));
    d.x = e.clientX;
    d.y = e.clientY;
  }

  protected onUp(e?: PointerEvent): void {
    if (e) this.touches.delete(e.pointerId);
    if (this.touches.size) return;
    if (this.drag && !this.drag.moved) this.selected.set(null);
    this.drag = null;
    this.dragging.set(false);
  }

  protected onWheel(e: WheelEvent): void {
    if (!(e.ctrlKey || e.metaKey)) {
      this.hint.set(true);
      clearTimeout(this.hintTimer);
      this.hintTimer = setTimeout(() => this.hint.set(false), 1400);
      return;
    }
    e.preventDefault();
    this.hint.set(false);
    cancelAnimationFrame(this.anim);
    const r = this.frame().nativeElement.getBoundingClientRect();
    this.zoomAt(Math.exp(e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top, false);
  }

  protected onDouble(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('button, .no-pan')) return;
    const r = this.frame().nativeElement.getBoundingClientRect();
    this.zoomAt(0.5, e.clientX - r.left, e.clientY - r.top, true);
  }

  protected toggle(s: PinStatus): void {
    const next = new Set(this.hidden());
    if (next.has(s)) next.delete(s);
    else next.add(s);
    this.hidden.set(next);
  }

  /* ── Pines ────────────────────────────────────────── */

  protected openCluster(c: Cluster): void {
    if (c.members.length === 1) {
      this.selected.set({ ids: [c.members[0].id], title: null });
      return;
    }
    const xs = c.members.map((p) => p.x);
    const ys = c.members.map((p) => p.y);
    const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (c.building || spread < 1.2 || this.cam().w <= MIN_W * 1.3) {
      this.selected.set({ ids: c.members.map((p) => p.id), title: c.building ?? `${c.members.length} propiedades` });
      return;
    }
    this.selected.set(null);
    // Encuadre que separe los pines: el grupo mide 66 × 34 px.
    const s = this.size();
    const needs = c.members
      .flatMap((a, i) => c.members.slice(i + 1).map((b) => Math.max((Math.abs(a.x - b.x) * s.w) / 70, (Math.abs(a.y - b.y) * s.w) / 38)))
      .filter((n) => n > 0.01);
    const t = this.fit(c.members, MIN_W);
    this.flyTo({ ...t, w: Math.max(MIN_W, Math.min(t.w, ...needs.map((n) => n * 0.95), this.cam().w / 2)) }, 800);
  }

  protected pick(p: MapPin): void {
    this.selected.set({ ids: [p.id], title: null });
  }

  protected isOn(c: Cluster): boolean {
    const s = this.selected();
    return !!s && c.members.some((p) => s.ids.includes(p.id));
  }
}
