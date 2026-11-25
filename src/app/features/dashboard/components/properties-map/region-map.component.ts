import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  CANAL, COAST_LINE, CONTOURS, HIGHLANDS, LAKES, POIS, RIVERS, LAND, PLACES, ROADS_MAJOR, ROADS_MINOR, SEA_LABEL, SHIELDS, STREETS, URBAN,
  VOLCANOES, WAVES, WORLD,
} from './region-geo';

export interface MapView {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

let seq = 0;

/** Cono de cada volcán en coordenadas locales (base en y=0): cara con luz, cara en sombra y cárcavas. */
const CONES = VOLCANOES.map((v) => {
  const b = v.base;
  const H = b * 0.56;
  const c = b * 0.11;
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    ...v,
    top: r(-H),
    lit: `M${r(-b / 2)} 0L${r(-c / 2)} ${r(-H)}L${r(c * 0.15)} ${r(-H * 0.985)}L${r(b * 0.06)} 0Z`,
    shade: `M${r(c * 0.15)} ${r(-H * 0.985)}L${r(c / 2)} ${r(-H)}L${r(b / 2)} 0L${r(b * 0.06)} 0Z`,
    gullies: `M${r(-c * 0.3)} ${r(-H * 0.8)}L${r(-b * 0.2)} ${r(-H * 0.08)}M${r(-c * 0.1)} ${r(-H * 0.7)}L${r(-b * 0.07)} ${r(-H * 0.1)}M${r(c * 0.4)} ${r(-H * 0.75)}L${r(b * 0.17)} ${r(-H * 0.12)}`,
  };
});

/**
 * Base cartográfica del mapa del Inicio: mar, tierra con degradado de
 * altura, curvas de nivel, lagos, zonas urbanas (con calles al acercar),
 * carreteras con escudos, volcanes con volumen (el Fuego y el Pacaya echan
 * humo) y nombres. Recibe la vista (`view`) y cuántas unidades del lienzo
 * mide un píxel (`unit`) para que textos y trazos mantengan su tamaño en
 * pantalla al acercar.
 */
@Component({
  selector: 'app-region-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let u = unit();
    @let z = k();
    <svg [attr.viewBox]="box()" class="block h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient [attr.id]="id + 'sea'" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#c3dcdb" /><stop offset="1" stop-color="#a9cbcb" />
        </linearGradient>
        <linearGradient [attr.id]="id + 'land'" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" [attr.y2]="world.h">
          <stop offset="0" stop-color="#d6e2d9" /><stop offset=".42" stop-color="#e3eadf" />
          <stop offset=".72" stop-color="#eef0e6" /><stop offset="1" stop-color="#f4f0e3" />
        </linearGradient>
        <linearGradient [attr.id]="id + 'lit'" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#dfe7de" /><stop offset="1" stop-color="#a9bfb4" />
        </linearGradient>
        <linearGradient [attr.id]="id + 'shade'" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#86a197" /><stop offset="1" stop-color="#5f7d72" />
        </linearGradient>
        <radialGradient [attr.id]="id + 'high'"><stop offset="0" stop-color="#3a6168" stop-opacity=".16" /><stop offset=".6" stop-color="#3a6168" stop-opacity=".07" /><stop offset="1" stop-color="#3a6168" stop-opacity="0" /></radialGradient>
        <radialGradient [attr.id]="id + 'foot'"><stop offset="0" stop-color="#003841" stop-opacity=".16" /><stop offset="1" stop-color="#003841" stop-opacity="0" /></radialGradient>
        <clipPath [attr.id]="id + 'urban'">
          @for (d of urban; track $index) { <path [attr.d]="d" /> }
        </clipPath>
      </defs>

      <rect x="-600" y="-400" [attr.width]="world.w + 1200" [attr.height]="world.h + 800" [attr.fill]="'url(#' + id + 'sea)'" />
      <g class="waves" fill="none" stroke="#fff" vector-effect="non-scaling-stroke">
        @for (d of waves; track $index) {
          <path [attr.d]="d" stroke-opacity=".45" stroke-width="1" stroke-dasharray="10 14" vector-effect="non-scaling-stroke" [style.--o]="$index" />
        }
      </g>
      <path [attr.d]="land" [attr.fill]="'url(#' + id + 'land)'" />
      @for (h of highlands; track $index) {
        <ellipse [attr.cx]="h.x" [attr.cy]="h.y" [attr.rx]="h.rx" [attr.ry]="h.ry" [attr.fill]="'url(#' + id + 'high)'" />
      }
      @for (d of rivers; track $index) {
        <path [attr.d]="d" fill="none" stroke="#9cc4c6" stroke-width="1.1" stroke-linecap="round" vector-effect="non-scaling-stroke" />
      }
      <path [attr.d]="coast" fill="none" stroke="#f3e6c8" stroke-width="3.2" stroke-linecap="round" vector-effect="non-scaling-stroke" />
      <path [attr.d]="coast" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1" vector-effect="non-scaling-stroke" />
      <path [attr.d]="canal" fill="none" stroke="#a9cbcb" stroke-width="1.4" vector-effect="non-scaling-stroke" />
      <path [attr.d]="contours" fill="none" stroke="#003841" stroke-opacity=".075" stroke-width=".8" vector-effect="non-scaling-stroke" />

      @for (d of urban; track $index) { <path [attr.d]="d" fill="#e9dfcd" fill-opacity=".85" /> }
      @if (z > 2.6) {
        <path [attr.d]="streets" [attr.clip-path]="'url(#' + id + 'urban)'" fill="none" stroke="#fff" stroke-width=".8" vector-effect="non-scaling-stroke" [attr.stroke-opacity]="streetOpacity()" />
      }

      @for (l of lakes; track l.name) {
        <path [attr.d]="l.d" fill="#b3d1d0" stroke="#fff" stroke-opacity=".8" stroke-width="1.2" vector-effect="non-scaling-stroke" />
        <path class="shimmer" [attr.d]="l.d" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="6 40" vector-effect="non-scaling-stroke" />
      }

      @for (d of minor; track $index) {
        <path [attr.d]="d" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke" />
      }
      @for (d of major; track $index) {
        <path [attr.d]="d" fill="none" stroke="#cdd6cf" stroke-width="4.4" stroke-linecap="round" vector-effect="non-scaling-stroke" />
        <path [attr.d]="d" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" vector-effect="non-scaling-stroke" />
      }

      @for (v of cones; track v.name) {
        <g [attr.transform]="'translate(' + v.x + ' ' + v.y + ') scale(' + vs() + ')'">
          <ellipse cx="0" cy="0.4" [attr.rx]="v.base * 0.7" [attr.ry]="v.base * 0.16" [attr.fill]="'url(#' + id + 'foot)'" />
          <path [attr.d]="v.lit" [attr.fill]="'url(#' + id + 'lit)'" />
          <path [attr.d]="v.shade" [attr.fill]="'url(#' + id + 'shade)'" />
          <path [attr.d]="v.gullies" fill="none" stroke="#003841" stroke-opacity=".12" stroke-width=".35" />
          @if (v.active) {
            <g class="smoke" [attr.transform]="'translate(0 ' + v.top + ')'">
              <circle r="2" fill="#fff" style="--d: 0s" />
              <circle r="2" fill="#fff" style="--d: -1.4s" />
              <circle r="2" fill="#fff" style="--d: -2.8s" />
            </g>
          }
        </g>
      }

      <!-- Nombres: tamaño fijo en pantalla -->
      <g class="labels">
        @if (z > 1.6) {
          @for (s of shields; track s.label) {
            <g [attr.transform]="'translate(' + s.x + ' ' + s.y + ') scale(' + u + ')'">
              <rect [attr.x]="-(s.label.length * 3.1 + 5)" y="-6.5" [attr.width]="s.label.length * 6.2 + 10" height="13" rx="3" fill="#fff" stroke="#b9c6bf" stroke-width="1" />
              <text y="3.3" text-anchor="middle" class="shield">{{ s.label }}</text>
            </g>
          }
        }
        @if (z > 2.3) {
          @for (v of cones; track v.name) {
            <text [attr.x]="v.x" [attr.y]="v.y + 9 * u" text-anchor="middle" class="volcano" [attr.font-size]="8.5 * u" [attr.stroke-width]="3 * u">V. {{ v.name }}</text>
          }
        }
        @for (l of lakes; track l.name; let i = $index) {
          @if (z > (i === 0 ? 1.25 : 2.2)) {
            <text [attr.x]="l.label.x" [attr.y]="l.label.y" text-anchor="middle" class="water" [attr.font-size]="9 * u" [attr.stroke-width]="2.6 * u">{{ l.name }}</text>
          }
        }
        <text [attr.x]="sea.x" [attr.y]="sea.y" text-anchor="middle" class="sea" [attr.font-size]="10 * u" [attr.letter-spacing]="3 * u">OCÉANO PACÍFICO</text>
        @if (z > 5) {
          @for (p of pois; track p.name) {
            <circle [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="1.8 * u" fill="#c5873c" stroke="#fff" [attr.stroke-width]="1 * u" />
            <text [attr.x]="p.x" [attr.y]="p.y - 5 * u" text-anchor="middle" class="poi" [attr.font-size]="9 * u" [attr.stroke-width]="3 * u">{{ p.name }}</text>
          }
        }
        @for (p of placeLabels(); track p.name) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="(p.rank === 1 ? 3 : 2.2) * u" [attr.fill]="p.rank === 1 ? '#003841' : '#5e7873'" stroke="#fff" [attr.stroke-width]="1.2 * u" />
          <text
            [attr.x]="p.covered ? p.x : p.x + 5.5 * u"
            [attr.y]="p.covered ? p.y + 40 * u : p.y + 3.4 * u"
            [attr.text-anchor]="p.covered ? 'middle' : 'start'"
            [class]="p.rank === 1 ? 'place capital' : 'place'"
            [attr.font-size]="(p.rank === 1 ? 11.5 : p.rank === 2 ? 10.5 : 9.5) * u"
            [attr.stroke-width]="3.2 * u"
          >{{ p.name }}</text>
        }
      </g>
    </svg>
  `,
  styles: `
    :host { display: block; }
    text { font-family: var(--font-sans); paint-order: stroke; stroke: #fff; stroke-linejoin: round; }
    .place { fill: #4d6863; font-weight: 600; }
    .capital { fill: var(--color-primary); font-weight: 700; }
    .water { fill: #4f8188; font-style: italic; font-weight: 500; }
    .volcano { fill: #6c7f77; font-style: italic; }
    .poi { fill: #8a5a22; font-weight: 600; }
    .sea { fill: #5d8f93; fill-opacity: .75; stroke: none; font-weight: 600; }
    .shield { font-size: 8px; font-weight: 700; fill: #4d6863; stroke: none; }
    .smoke circle { transform-box: fill-box; transform-origin: center; opacity: 0; animation: puff 4.2s ease-out infinite var(--d); }
    @keyframes puff {
      0% { opacity: 0; transform: translate(0, 0) scale(.5); }
      15% { opacity: .85; }
      100% { opacity: 0; transform: translate(5px, -9px) scale(2.6); }
    }
    .shimmer { stroke-opacity: .55; animation: shimmer 9s linear infinite; }
    @keyframes shimmer { to { stroke-dashoffset: -460; } }
    .waves path { animation: drift 7s ease-in-out infinite alternate; animation-delay: calc(var(--o) * -2s); }
    @keyframes drift { to { stroke-dashoffset: 24; } }
    @media (prefers-reduced-motion: reduce) { .smoke circle, .shimmer, .waves path { animation: none; } .smoke circle { opacity: .5; } }
  `,
})
export class RegionMapComponent {
  readonly view = input.required<MapView>();
  /** Unidades del lienzo por píxel de pantalla. */
  readonly unit = input.required<number>();
  /** Puntos del lienzo tapados por pines: los nombres que caen ahí bajan. */
  readonly avoid = input<readonly { x: number; y: number }[]>([]);

  protected readonly id = `rm${++seq}-`;
  protected readonly world = WORLD;
  protected readonly land = LAND;
  protected readonly coast = COAST_LINE;
  protected readonly canal = CANAL;
  protected readonly waves = WAVES;
  protected readonly contours = CONTOURS;
  protected readonly highlands = HIGHLANDS;
  protected readonly rivers = RIVERS;
  protected readonly urban = URBAN;
  protected readonly streets = STREETS;
  protected readonly lakes = LAKES;
  protected readonly major = ROADS_MAJOR;
  protected readonly minor = ROADS_MINOR;
  protected readonly cones = CONES;
  protected readonly places = PLACES;
  protected readonly shields = SHIELDS;
  protected readonly sea = SEA_LABEL;
  protected readonly pois = POIS;

  protected readonly placeLabels = computed(() => {
    const u = this.unit();
    const z = this.k();
    const avoid = this.avoid();
    return PLACES.filter((p) => p.rank < 3 || z > 1.9).map((p) => ({
      ...p,
      covered: avoid.some((a) => Math.abs(a.x - p.x) < 90 * u && Math.abs(a.y - p.y) < 22 * u),
    }));
  });

  protected readonly k = computed(() => WORLD.w / this.view().w);
  protected readonly box = computed(() => {
    const v = this.view();
    return `${v.x} ${v.y} ${v.w} ${v.h}`;
  });
  /** Los volcanes crecen menos que el mapa al acercar. */
  protected readonly vs = computed(() => Math.max(0.12, 1 / Math.pow(this.k(), 0.62)));
  protected readonly streetOpacity = computed(() => Math.min(0.6, (this.k() - 2.6) / 4));
}
