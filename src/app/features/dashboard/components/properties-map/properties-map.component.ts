import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MapPin, PinStatus } from '../../models/dashboard.model';

export const PIN_META: Record<PinStatus, { label: string; color: string }> = {
  ready: { label: 'Lista', color: 'var(--color-success)' },
  cleaning: { label: 'En limpieza', color: 'var(--color-secondary)' },
  occupied: { label: 'Ocupada', color: 'var(--color-primary)' },
  incident: { label: 'Incidencia', color: 'var(--color-danger)' },
};

/**
 * Mapa de propiedades de hoy (W-B1): cartografía estilizada propia del
 * centro-sur de Guatemala (lago, volcanes, ciudad, costa) con un pin por
 * propiedad. Los pines caen con un rebote escalonado; las incidencias
 * laten. Clic en un pin → la propiedad en su sección.
 */
@Component({
  selector: 'app-properties-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
      @for (s of legend(); track s.key) {
        <span class="inline-flex items-center gap-1.5 text-[11.5px] text-text-body">
          <span class="h-2 w-2 rounded-pill" [style.background]="s.color"></span>{{ s.label }}
          <span class="tabular font-bold text-primary">{{ s.count }}</span>
        </span>
      }
    </div>
    <div class="map relative w-full overflow-hidden rounded-tile" style="aspect-ratio: 600 / 340">
      <svg viewBox="0 0 600 340" class="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="map-land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#e9f0ee" />
            <stop offset="1" stop-color="#dae6e2" />
          </linearGradient>
          <pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M30 0H0V30" fill="none" stroke="rgba(0,56,65,0.05)" />
          </pattern>
        </defs>
        <rect width="600" height="340" fill="url(#map-land)" />
        <rect width="600" height="340" fill="url(#map-grid)" />
        <path d="M0 268C80 262 160 272 240 276C330 281 420 284 520 290C560 292 590 294 600 296V340H0Z" fill="#c9ddd9" />
        <path d="M0 268C80 262 160 272 240 276C330 281 420 284 520 290C560 292 590 294 600 296" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="2" />
        <path class="wave" d="M60 300c20-4 40 4 60 0s40-4 60 0M300 312c20-4 40 4 60 0s40-4 60 0" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="1.5" stroke-linecap="round" />
        <path d="M96 128C104 112 128 108 146 116C162 123 166 140 154 150C142 160 120 162 106 154C94 147 90 138 96 128Z" fill="#b7d1cc" />
        <path d="M104 186l14-24 14 24ZM136 188l16-28 16 28ZM266 182l16-28 10 14 8-12 16 26ZM312 186l20-34 20 34Z" fill="#003841" fill-opacity="0.1" />
        <rect x="420" y="78" width="104" height="70" rx="22" fill="#003841" fill-opacity="0.045" />
        <path d="M430 96h84M428 112h90M432 128h82M446 82v62M466 80v66M486 80v66M506 84v58" stroke="#003841" stroke-opacity="0.07" />
        <path d="M0 96C80 92 140 100 200 112C250 122 280 140 300 150C340 140 380 124 440 112C480 104 540 96 600 90" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" />
        <path d="M450 122C440 170 420 220 400 250C392 262 386 274 382 284" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" />
        <path d="M300 150C302 190 300 230 294 272" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8" />
        <g font-family="ui-monospace, Menlo, monospace" font-size="9.5" letter-spacing="1.4" fill="#5e7873">
          <text x="126" y="100" text-anchor="middle">LAGO DE ATITLÁN</text>
          <text x="300" y="206" text-anchor="middle">ANTIGUA</text>
          <text x="472" y="70" text-anchor="middle">CIUDAD DE GUATEMALA</text>
          <text x="384" y="306" text-anchor="middle">MONTERRICO</text>
          <text x="140" y="326" text-anchor="middle" fill-opacity="0.7">OCÉANO PACÍFICO</text>
        </g>
      </svg>

      @for (p of pins(); track p.id; let i = $index) {
        <button
          type="button"
          class="pin absolute -translate-x-1/2 -translate-y-1/2"
          [style.left.%]="p.x"
          [style.top.%]="p.y"
          [style.--i]="i"
          [style.color]="meta[p.status].color"
          [attr.aria-label]="p.name + ' · ' + meta[p.status].label"
          (mouseenter)="hover.set(p.id)"
          (mouseleave)="hover.set(null)"
          (focus)="hover.set(p.id)"
          (blur)="hover.set(null)"
          (click)="pinClick.emit(p)"
        >
          <span class="dot relative block h-[18px] w-[18px] rounded-pill border-[3px] border-white bg-current" [class.pulse-ring]="p.status === 'incident'"></span>
          @if (hover() === p.id) {
            <span class="tip pointer-events-none absolute bottom-[26px] left-1/2 z-10 w-max -translate-x-1/2 rounded-sm bg-primary px-3 py-2 text-left shadow-e3">
              <span class="block text-[12px] font-bold text-white">{{ p.name }}</span>
              <span class="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-white/70">
                <span class="font-mono">{{ p.code }}</span> · {{ meta[p.status].label }}
              </span>
            </span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .pin { animation: drop var(--spring-bounce-dur) var(--spring-bounce) both; animation-delay: calc(250ms + var(--i) * 70ms); }
    @keyframes drop { from { opacity: 0; transform: translateY(-14px) scale(0.6); } }
    .dot { box-shadow: var(--shadow-pin); transition: transform var(--spring-bounce-dur) var(--spring-bounce); }
    .pin:hover .dot, .pin:focus-visible .dot { transform: scale(1.25); }
    .pin:focus-visible { outline: none; }
    .tip { animation: argos-pop 180ms var(--ease-enter) both; }
    .wave { animation: wave 6s ease-in-out infinite; }
    @keyframes wave { 50% { transform: translateX(8px); } }
  `,
})
export class PropertiesMapComponent {
  readonly pins = input.required<readonly MapPin[]>();
  readonly pinClick = output<MapPin>();

  protected readonly meta = PIN_META;
  protected readonly hover = signal<string | null>(null);

  protected readonly legend = computed(() =>
    (Object.keys(PIN_META) as PinStatus[]).map((k) => ({
      key: k,
      label: PIN_META[k].label,
      color: PIN_META[k].color,
      count: this.pins().filter((p) => p.status === k).length,
    })),
  );
}
