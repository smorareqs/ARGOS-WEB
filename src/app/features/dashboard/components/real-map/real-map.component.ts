import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, output, signal,
  viewChild,
} from '@angular/core';
import { MapPin, PinStatus } from '../../models/dashboard.model';
import { MapsService } from '../../../../core/services/maps.service';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { MapCardComponent } from '../properties-map/map-card.component';
import { PIN_META } from '../properties-map/properties-map.component';

interface LatLngAlt {
  lat: number;
  lng: number;
  altitude: number;
}
interface Camera {
  center: LatLngAlt;
  range: number;
  tilt: number;
  heading: number;
}
interface Map3D extends HTMLElement, Camera {
  mode: string;
  defaultUIHidden: boolean;
  flyCameraTo(o: { endCamera: Camera; durationMillis?: number }): void;
  flyCameraAround(o: { camera: Camera; durationMillis?: number; repeatCount?: number }): void;
  stopCameraAnimation(): void;
}
type Ctor = new (o: Record<string, unknown>) => HTMLElement;

interface Group {
  readonly key: string;
  readonly pins: readonly MapPin[];
  readonly lat: number;
  readonly lng: number;
  readonly title: string;
}

const COLOR: Record<PinStatus, string> = { incident: '#892f26', cleaning: '#c5873c', occupied: '#003841', ready: '#5a8a6b' };
const ORDER = Object.keys(PIN_META) as PinStatus[];
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Mapa real del Inicio (W-B1) con Google Maps 3D. Por defecto el modo vectorial
 * (calles limpias, edificios en volumen e íconos de lugares, con aspecto de
 * ilustración); "Satélite" cambia al fotorrealista con volcanes en relieve (ref. el mapa de Airbnb sobre Google Maps y
 * los recorridos de cámara de Google Earth). Al cargar, la cámara vuela de la
 * región a tus propiedades. Cada propiedad (o edificio) es una píldora con su
 * estado; al tocarla la cámara baja inclinada (sin girar) y aparece su
 * tarjeta. "Recorrido" pasea por todas. Si Google falla, avisa con `failed`
 * y el Inicio dibuja el mapa ilustrado.
 */
@Component({
  selector: 'app-real-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, MapCardComponent],
  template: `
    <div class="mb-3 flex flex-wrap gap-1.5 px-1" role="group" aria-label="Filtrar por estado">
      @for (s of legend(); track s.key) {
        <button type="button" class="chip" [class.off]="hidden().has(s.key)" [attr.aria-pressed]="!hidden().has(s.key)" [disabled]="!s.count" (click)="toggle(s.key)">
          <span class="h-2 w-2 rounded-pill" [style.background]="s.color"></span>{{ s.label }}
          <span class="tabular font-bold text-primary">{{ s.count }}</span>
        </button>
      }
    </div>
    <div class="frame relative w-full overflow-hidden rounded-tile">
      <div #host class="absolute inset-0"></div>
      @if (!ready()) {
        <div class="skeleton absolute inset-0 !rounded-none"></div>
      }
      <div class="absolute left-2.5 top-2.5 flex gap-1.5">
        <div class="seg" role="group" aria-label="Vista del mapa">
          <button type="button" [class.on]="mode() === 'ROADMAP'" (click)="setMode('ROADMAP')">Mapa 3D</button>
          <button type="button" [class.on]="mode() === 'HYBRID'" (click)="setMode('HYBRID')">Satélite</button>
        </div>
        <button type="button" class="tour" [class.on]="touring()" (click)="toggleTour()">
          <app-icon [name]="touring() ? 'pause' : 'play'" [size]="14" /> Recorrido
        </button>
      </div>
      <div class="controls absolute right-2.5 top-2.5 flex flex-col">
        <button type="button" aria-label="Acercar" (click)="zoom(0.45)"><app-icon name="plus" [size]="16" /></button>
        <button type="button" aria-label="Alejar" (click)="zoom(2.2)"><app-icon name="minus" [size]="16" /></button>
        <button type="button" aria-label="Ver todas tus propiedades" title="Ver todas" (click)="fitAll()"><app-icon name="focus" [size]="16" /></button>
      </div>
      @if (card(); as k) {
        <app-map-card class="absolute bottom-2.5 left-2.5 z-20 w-[296px] max-sm:right-2.5 max-sm:w-auto" [pins]="k.pins" [title]="k.title" (closed)="close()" (opened)="pinClick.emit($event)" (picked)="pick($event)" />
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .frame { height: clamp(320px, 30vw, 440px); background: #dfeaec; box-shadow: inset 0 0 0 1px rgba(0,56,65,.08); }
    @media (max-width: 639px) { .frame { height: 400px; } }
    .chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: var(--radius-pill);
      border: 1px solid var(--color-border-card); background: var(--color-surface); font-size: 11.5px; color: var(--color-text-body); }
    .chip.off { opacity: .45; text-decoration: line-through; }
    .chip:disabled { opacity: .4; }
    .seg, .tour, .controls { background: rgba(255,255,255,.95); box-shadow: 0 2px 10px rgba(0,0,0,.25); border-radius: var(--radius-field); }
    .seg { display: flex; padding: 3px; }
    .seg button { height: 28px; padding: 0 11px; border-radius: 6px; font-size: 12px; font-weight: 700; color: var(--color-text-secondary); }
    .seg button.on { background: var(--color-primary); color: #fff; }
    .tour { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; font-size: 12px; font-weight: 700; color: var(--color-primary); }
    .tour.on { background: var(--color-secondary); color: #fff; }
    .controls { overflow: hidden; }
    .controls button { display: grid; place-items: center; width: 34px; height: 34px; color: var(--color-primary); }
    .controls button + button { border-top: 1px solid var(--color-divider); }
    .controls button:hover { background: var(--color-teal-washed); }
  `,
})
export class RealMapComponent {
  readonly pins = input.required<readonly MapPin[]>();
  readonly pinClick = output<MapPin>();
  readonly failed = output<void>();

  private readonly maps = inject(MapsService);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private map: Map3D | null = null;
  private lib: Record<string, unknown> = {};
  private markers: HTMLElement[] = [];
  private tourTimer: ReturnType<typeof setInterval> | undefined;
  private tourIndex = 0;
  private watchdog: ReturnType<typeof setTimeout> | undefined;

  protected readonly ready = signal(false);
  protected readonly mode = signal<'HYBRID' | 'ROADMAP'>('ROADMAP');
  protected readonly hidden = signal<ReadonlySet<PinStatus>>(new Set());
  protected readonly selected = signal<Group | null>(null);
  protected readonly touring = signal(false);

  protected readonly legend = computed(() =>
    ORDER.map((k) => ({ key: k, ...PIN_META[k], count: this.pins().filter((p) => p.status === k).length })),
  );

  /** Un marcador por edificio (o por punto): las unidades no se tapan entre sí. */
  private readonly groups = computed<Group[]>(() => {
    const by = new Map<string, MapPin[]>();
    for (const p of this.pins().filter((x) => !this.hidden().has(x.status))) {
      const key = p.building ?? `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
      by.set(key, [...(by.get(key) ?? []), p]);
    }
    return [...by.entries()].map(([key, pins]) => ({
      key,
      pins: [...pins].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status)),
      lat: pins.reduce((s, p) => s + p.lat, 0) / pins.length,
      lng: pins.reduce((s, p) => s + p.lng, 0) / pins.length,
      title: pins.length > 1 ? (pins[0].building ?? `${pins.length} propiedades`) : pins[0].code,
    }));
  });

  protected readonly card = computed(() => {
    const g = this.selected();
    return g ? { pins: g.pins, title: g.pins.length > 1 ? g.title : null } : null;
  });

  constructor() {
    const destroy = inject(DestroyRef);
    destroy.onDestroy(() => {
      clearInterval(this.tourTimer);
      clearTimeout(this.watchdog);
      this.map?.remove();
    });
    afterNextRender(() => void this.init());
    effect(() => {
      if (this.maps.authFailed()) this.failed.emit();
    });
    effect(() => {
      const groups = this.groups();
      if (this.ready()) this.drawMarkers(groups);
    });
  }

  private async init(): Promise<void> {
    try {
      const cfg = await this.maps.load();
      if (cfg.provider !== 'google' || !cfg.api_key) throw new Error('sin clave');
      const g = await this.maps.google(cfg.api_key);
      this.lib = await g.importLibrary('maps3d');
      const Map3DElement = this.lib['Map3DElement'] as Ctor | undefined;
      if (!Map3DElement) throw new Error('maps3d');
      const start = this.fitCamera(this.pins());
      const map = new Map3DElement({
        center: { ...start.center },
        range: start.range * 9,
        tilt: 0,
        heading: 0,
        mode: this.mode(),
        colorScheme: 'LIGHT',
        defaultUIHidden: true,
        ...(cfg.map_id ? { mapId: cfg.map_id } : {}),
      }) as Map3D;
      map.style.width = '100%';
      map.style.height = '100%';
      map.addEventListener('gmp-error', () => this.failed.emit());
      // Con una clave rechazada Google no avisa: si el mapa nunca llega a
      // dibujarse (gmp-steadychange), se vuelve al mapa ilustrado.
      let drawn = false;
      map.addEventListener('gmp-steadychange', () => (drawn = true));
      this.watchdog = setTimeout(() => {
        if (!drawn) this.failed.emit();
      }, 12_000);
      map.addEventListener('gmp-click', () => this.stopTour());
      this.host().nativeElement.append(map);
      this.map = map;
      this.ready.set(true);
      setTimeout(() => this.fly(start, reduced() ? 0 : 4200), 600);
    } catch {
      this.failed.emit();
    }
  }

  private drawMarkers(groups: readonly Group[]): void {
    const map = this.map;
    if (!map) return;
    this.markers.forEach((m) => m.remove());
    const Interactive = (this.lib['Marker3DInteractiveElement'] ?? this.lib['Marker3DElement']) as Ctor | undefined;
    if (!Interactive) return;
    this.markers = groups.map((g) => {
      const m = new Interactive({
        position: { lat: g.lat, lng: g.lng, altitude: 35 },
        altitudeMode: 'RELATIVE_TO_GROUND',
        extruded: true,
      });
      const tpl = document.createElement('template');
      tpl.content.append(pillSvg(g));
      m.append(tpl);
      m.addEventListener('gmp-click', () => this.select(g));
      map.append(m);
      return m;
    });
  }

  /* ── Cámara ─────────────────────────────────────────── */

  private fitCamera(list: readonly MapPin[]): Camera {
    const lats = list.map((p) => p.lat);
    const lngs = list.map((p) => p.lng);
    const lat = list.length ? (Math.min(...lats) + Math.max(...lats)) / 2 : 14.56;
    const lng = list.length ? (Math.min(...lngs) + Math.max(...lngs)) / 2 : -90.73;
    const span = list.length
      ? Math.max((Math.max(...lats) - Math.min(...lats)) * 111_000, (Math.max(...lngs) - Math.min(...lngs)) * 111_000 * Math.cos((lat * Math.PI) / 180))
      : 40_000;
    // Inclinada mirando tierra adentro (norte): las propiedades abajo, los
    // volcanes al fondo. El centro se corre hacia el norte para que el mar
    // del Pacífico no se coma la mitad del encuadre.
    const range = Math.min(160_000, Math.max(2_400, span * 1.75));
    return { center: { lat: lat + (range * 0.12) / 111_000, lng, altitude: 0 }, range, tilt: 62, heading: 6 };
  }

  private fly(cam: Camera, ms = 2400): void {
    this.map?.flyCameraTo({ endCamera: cam, durationMillis: ms });
  }

  protected zoom(f: number): void {
    const m = this.map;
    if (!m) return;
    this.stopTour();
    this.fly({ center: m.center, range: Math.max(250, m.range * f), tilt: m.tilt, heading: m.heading }, 700);
  }

  protected fitAll(): void {
    this.stopTour();
    this.selected.set(null);
    this.fly(this.fitCamera(this.pins()));
  }

  protected setMode(mode: 'HYBRID' | 'ROADMAP'): void {
    this.mode.set(mode);
    if (this.map) this.map.mode = mode;
  }

  /** Baja inclinada hacia el grupo y se queda quieta (sin girar alrededor). */
  private select(g: Group, fromTour = false): void {
    const m = this.map;
    if (!m) return;
    if (!fromTour) this.stopTour();
    this.selected.set(g);
    const cam: Camera = { center: { lat: g.lat, lng: g.lng, altitude: 0 }, range: g.pins.length > 1 ? 1100 : 850, tilt: 60, heading: m.heading };
    this.fly(cam, reduced() ? 0 : 2600);
  }

  protected pick(p: MapPin): void {
    const g = this.groups().find((x) => x.pins.some((y) => y.id === p.id));
    if (g) this.selected.set({ ...g, pins: [p] });
  }

  protected close(): void {
    this.selected.set(null);
    this.map?.stopCameraAnimation();
  }

  protected toggleTour(): void {
    if (this.touring()) {
      this.stopTour();
      return;
    }
    const gs = this.groups();
    if (!gs.length) return;
    this.touring.set(true);
    const next = () => this.select(gs[this.tourIndex++ % gs.length], true);
    next();
    this.tourTimer = setInterval(next, 9000);
  }

  private stopTour(): void {
    clearInterval(this.tourTimer);
    this.touring.set(false);
  }

  protected toggle(s: PinStatus): void {
    const next = new Set(this.hidden());
    if (next.has(s)) next.delete(s);
    else next.add(s);
    this.hidden.set(next);
  }
}

/** Píldora del marcador: SVG autónomo (Google la convierte en imagen). */
function pillSvg(g: Group): SVGElement {
  const lead = g.pins[0];
  const text = g.pins.length > 1 ? `${g.title} · ${g.pins.length}` : lead.code;
  const w = Math.round(44 + text.length * 8.4);
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="46" viewBox="0 0 ${w} 46">
    <rect x="2" y="3" width="${w - 4}" height="34" rx="17" fill="#000" fill-opacity=".22"/>
    <rect x="2" y="1" width="${w - 4}" height="34" rx="17" fill="#fff"/>
    <path d="M${w / 2 - 7} 34 L${w / 2} 44 L${w / 2 + 7} 34Z" fill="#fff"/>
    <circle cx="20" cy="18" r="8" fill="${COLOR[lead.status]}" stroke="#fff" stroke-width="2.5"/>
    <text x="34" y="23.5" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#003841">${esc}</text>
  </svg>`;
  return new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement as unknown as SVGElement;
}
