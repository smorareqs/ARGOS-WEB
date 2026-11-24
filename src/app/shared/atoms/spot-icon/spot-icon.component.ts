import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SpotIconName =
  | 'offline'
  | 'evidence'
  | 'companies'
  | 'alerts'
  | 'compliance'
  | 'map'
  | 'isolated'
  | 'roles'
  | 'switch'
  | 'features'
  | 'two-step'
  | 'retention'
  | 'logbook'
  | 'sessions'
  | 'cleaning'
  | 'maintenance'
  | 'arrivals'
  | 'inventory'
  | 'parking'
  | 'pool'
  | 'payroll';

let nextId = 0;

/**
 * Átomo · ilustraciones propias de ARGOS (landing, acceso y tarjetas de tarea),
 * no íconos de línea genéricos: cada una
 * dibuja el concepto con objetos reconocibles de la operación, en la paleta de
 * marca (teal, dorado, arena) y con una sombra desplazada que les da volumen.
 * Al pasar el cursor, el detalle de acento se mueve.
 */
@Component({
  selector: 'app-spot-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'spot', '[style.width.px]': 'size()', '[style.height.px]': 'size()' },
  template: `
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <filter [attr.id]="fid" x="-20%" y="-20%" width="150%" height="150%">
          <feFlood flood-color="#003841" flood-opacity="0.16" result="c" />
          <feComposite in="c" in2="SourceAlpha" operator="in" result="s" />
          <feOffset in="s" dx="2.4" dy="2.4" result="o" />
          <feMerge><feMergeNode in="o" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="64" height="64" rx="16" [attr.fill]="tint()" />
      <g [attr.filter]="'url(#' + fid + ')'" class="ink">
        @switch (name()) {
          @case ('offline') {
            <rect x="19" y="10" width="24" height="42" rx="5" fill="#fff" />
            <rect x="23" y="16" width="16" height="26" rx="2" fill="#E3EEEA" stroke="none" />
            <path d="M26 21.5h2.5M30.5 21.5H36M26 27h2.5M30.5 27H35M26 32.5h2.5M30.5 32.5H34" stroke-width="1.6" />
            <path d="M28 47.5h6" />
            <g class="accent">
              <circle cx="45" cy="19" r="8.5" fill="#C5873C" />
              <path d="M41.2 18.2a4 4 0 0 1 7-1.8M48.8 19.8a4 4 0 0 1-7 1.8" stroke="#fff" stroke-width="1.7" />
              <path d="M48.6 14.6v2.2h-2.2M41.4 23.4v-2.2h2.2" stroke="#fff" stroke-width="1.7" />
            </g>
          }
          @case ('evidence') {
            <g transform="rotate(-7 30 31)">
              <rect x="11" y="15" width="36" height="30" rx="3" fill="#fff" />
              <rect x="15" y="19" width="28" height="18" rx="1.5" fill="#E3EEEA" stroke="none" />
              <path d="M15 34l8-8 6 5 4-3.5 10 8.5" fill="#3A6168" stroke="none" />
              <circle cx="36.5" cy="24" r="2.6" fill="#C5873C" stroke="none" />
            </g>
            <g class="accent">
              <path d="M47 33c-4.4 0-7.5 3.2-7.5 7.2 0 5.2 7.5 12.3 7.5 12.3s7.5-7.1 7.5-12.3c0-4-3.1-7.2-7.5-7.2z" fill="#C5873C" />
              <circle cx="47" cy="40.3" r="2.6" fill="#fff" />
            </g>
          }
          @case ('companies') {
            <path d="M9 52V24l11-7 11 7v28z" fill="#fff" />
            <path d="M33 52V30l11-6 11 6v22z" fill="#F3E3CC" />
            <path d="M15 30h3M22 30h3M15 37h3M22 37h3M15 44h3M22 44h3M39 36h3M46 36h3M39 43h3M46 43h3" stroke-width="1.8" />
            <path d="M6 52h52" />
            <g class="accent">
              <rect x="26" y="9" width="12" height="10" rx="2.5" fill="#C5873C" />
              <path d="M29 9V7a3 3 0 0 1 6 0v2" />
            </g>
          }
          @case ('alerts') {
            <rect x="10" y="22" width="38" height="28" rx="4" fill="#fff" />
            <path d="M16 31h18M16 37h24M16 43h14" stroke-width="1.8" />
            <g class="accent">
              <path d="M44 11c-5 0-8 3.6-8 8.2v4.6l-2.5 3.7h21l-2.5-3.7v-4.6c0-4.6-3-8.2-8-8.2z" fill="#C5873C" />
              <path d="M41.5 30.5a2.5 2.5 0 0 0 5 0" />
              <path d="M56 13.5c1.5 1.6 2.3 3.6 2.3 5.7M32 13.5c-1.5 1.6-2.3 3.6-2.3 5.7" stroke-width="1.8" />
            </g>
          }
          @case ('compliance') {
            <rect x="9" y="14" width="30" height="38" rx="4" fill="#fff" />
            <rect x="17" y="10" width="14" height="7" rx="2" fill="#F3E3CC" />
            <path d="M15 27l2.5 2.5L22 25M15 36l2.5 2.5L22 34M15 45l2.5 2.5L22 43M26 27.5h7M26 36.5h7M26 45.5h5" stroke-width="1.8" />
            <g class="accent">
              <circle cx="46" cy="38" r="11" fill="#fff" />
              <path d="M46 27a11 11 0 0 1 10.6 13.9L46 38z" fill="#3A6168" />
              <path d="M56.6 40.9A11 11 0 0 1 46 49l0-11z" fill="#C5873C" />
              <circle cx="46" cy="38" r="4.5" fill="#fff" />
            </g>
          }
          @case ('map') {
            <path d="M8 18l14-5 18 5 16-5v34l-16 5-18-5-14 5z" fill="#fff" />
            <path d="M22 13v34M40 18v34" stroke-width="1.6" />
            <path d="M14 39c5-1 6-8 12-8s8 7 14 5 7-6 10-7" stroke="#3A6168" stroke-width="1.8" stroke-dasharray="2.5 3" />
            <g class="accent">
              <path d="M44 15.5c-3.6 0-6.2 2.6-6.2 5.9 0 4.3 6.2 10.1 6.2 10.1s6.2-5.8 6.2-10.1c0-3.3-2.6-5.9-6.2-5.9z" fill="#C5873C" />
              <circle cx="44" cy="21.4" r="2.1" fill="#fff" />
            </g>
            <circle cx="15" cy="39" r="3" fill="#3A6168" />
          }
          @case ('isolated') {
            <path d="M8 22a4 4 0 0 1 4-4h12l4 5h22a4 4 0 0 1 4 4v21a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#F3E3CC" />
            <path d="M8 28h46" stroke-width="1.6" />
            <g class="accent">
              <rect x="22" y="33" width="20" height="16" rx="3.5" fill="#003841" />
              <path d="M26.5 33v-3.5a5.5 5.5 0 0 1 11 0V33" />
              <circle cx="32" cy="40" r="2" fill="#C5873C" stroke="none" />
              <path d="M32 42v3" stroke="#C5873C" stroke-width="1.8" />
            </g>
          }
          @case ('roles') {
            <rect x="10" y="14" width="34" height="40" rx="5" fill="#fff" />
            <rect x="21" y="10" width="12" height="7" rx="2" fill="#F3E3CC" />
            <circle cx="27" cy="28" r="6" fill="#E3EEEA" />
            <path d="M18 44c1.5-5 5-7 9-7s7.5 2 9 7" fill="#E3EEEA" />
            <g class="accent">
              <rect x="34" y="40" width="22" height="12" rx="6" fill="#C5873C" />
              <circle cx="50" cy="46" r="4" fill="#fff" />
            </g>
          }
          @case ('switch') {
            <rect x="7" y="18" width="20" height="20" rx="4" fill="#fff" />
            <rect x="37" y="26" width="20" height="20" rx="4" fill="#F3E3CC" />
            <path d="M12 26h10M12 31h7M42 34h10M42 39h7" stroke-width="1.8" />
            <g class="accent">
              <path d="M24 46c3 5 9 7 15 5" stroke="#C5873C" stroke-width="2.4" />
              <path d="M36 48l3.4 3-3.6 2.8" stroke="#C5873C" stroke-width="2.4" />
              <path d="M40 18c-3-5-9-7-15-5" stroke="#3A6168" stroke-width="2.4" />
              <path d="M28 16l-3.4-3 3.6-2.8" stroke="#3A6168" stroke-width="2.4" />
            </g>
          }
          @case ('features') {
            <rect x="9" y="11" width="46" height="42" rx="5" fill="#fff" />
            <rect x="15" y="18" width="16" height="8" rx="4" fill="#3A6168" />
            <circle cx="27" cy="22" r="2.6" fill="#fff" stroke="none" />
            <rect x="15" y="29" width="16" height="8" rx="4" fill="#E3EEEA" />
            <circle cx="19" cy="33" r="2.6" fill="#fff" />
            <path d="M36 22h13M36 33h10M36 44h12" stroke-width="1.8" />
            <g class="accent">
              <rect x="15" y="40" width="16" height="8" rx="4" fill="#C5873C" />
              <circle cx="27" cy="44" r="2.6" fill="#fff" stroke="none" />
            </g>
          }
          @case ('two-step') {
            <rect x="14" y="9" width="26" height="46" rx="5" fill="#fff" />
            <rect x="18" y="22" width="18" height="10" rx="2.5" fill="#E3EEEA" stroke="none" />
            <path d="M21 27h.01M24.5 27h.01M28 27h.01M31.5 27h.01" stroke-width="2.6" />
            <path d="M23 49.5h8M19 15.5h4" stroke-width="1.8" />
            <g class="accent">
              <path d="M46 28l10 4v7c0 6.2-4.2 10.6-10 12.5-5.8-1.9-10-6.3-10-12.5v-7z" fill="#C5873C" />
              <path d="M41.5 39.5l3 3 6-6" stroke="#fff" stroke-width="2.2" />
            </g>
          }
          @case ('retention') {
            <rect x="7" y="16" width="40" height="28" rx="4" fill="#fff" />
            <rect x="12" y="22" width="11" height="13" rx="2" fill="#E3EEEA" />
            <path d="M28 24h13M28 29h10M28 34h12M12 39.5h29" stroke-width="1.8" stroke-dasharray="0" />
            <g class="accent">
              <circle cx="46" cy="44" r="10.5" fill="#C5873C" />
              <path d="M46 38.5V44l3.6 2.4" stroke="#fff" stroke-width="2.2" />
            </g>
          }
          @case ('logbook') {
            <path d="M32 18c-5-3.5-12-4.5-21-3.5v34c9-1 16 0 21 3.5z" fill="#fff" />
            <path d="M32 18c5-3.5 12-4.5 21-3.5v34c-9-1-16 0-21 3.5z" fill="#F3E3CC" />
            <path d="M16 23c4-.5 7.5 0 11 1.5M16 30c4-.5 7.5 0 11 1.5M16 37c4-.5 7.5 0 11 1.5M37 24.5c3.5-1.5 7-2 11-1.5M37 31.5c3.5-1.5 7-2 11-1.5" stroke-width="1.6" />
            <g class="accent">
              <path d="M44 52l12-17 4.2 3-12 17-5.2 1.6z" fill="#C5873C" />
            </g>
          }
          @case ('sessions') {
            <rect x="7" y="16" width="34" height="23" rx="3" fill="#fff" />
            <path d="M3 44h42l-3-5H6z" fill="#E3EEEA" />
            <path d="M12 23h14M12 28h20M12 33h10" stroke-width="1.6" />
            <rect x="40" y="22" width="17" height="30" rx="4" fill="#fff" />
            <path d="M46 47.5h5" stroke-width="1.6" />
            <g class="accent">
              <circle cx="56" cy="21" r="7" fill="#892f26" />
              <path d="M53.5 18.5l5 5M58.5 18.5l-5 5" stroke="#fff" stroke-width="2" />
            </g>
          }
          @case ('cleaning') {
            <!-- Limpieza: atomizador, rocío y destello -->
            <path d="M18 33a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4z" fill="#fff" />
            <rect x="22" y="37" width="12" height="11" rx="2" fill="#E3EEEA" stroke="none" />
            <path d="M25 41.5h6M25 44.8h4" stroke-width="1.6" />
            <rect x="23" y="23" width="10" height="6" rx="1.5" fill="#F3E3CC" />
            <path d="M20 23v-6a4 4 0 0 1 4-4h11l5 4.5V20h-7v3z" fill="#3A6168" />
            <path d="M33 20.5c.4 3.4-.6 6-3 7.8" stroke-width="2.2" />
            <g class="accent">
              <circle cx="45" cy="14" r="1.7" fill="#C5873C" stroke="none" />
              <circle cx="48.6" cy="18.6" r="1.7" fill="#C5873C" stroke="none" />
              <circle cx="45" cy="23" r="1.7" fill="#C5873C" stroke="none" />
              <circle cx="51.6" cy="12.4" r="1.2" fill="#C5873C" stroke="none" />
              <circle cx="52.4" cy="24" r="1.2" fill="#C5873C" stroke="none" />
              <path d="M49 31c.6 3.8 2 5.2 5.8 5.8-3.8.6-5.2 2-5.8 5.8-.6-3.8-2-5.2-5.8-5.8 3.8-.6 5.2-2 5.8-5.8z" fill="#C5873C" stroke-width="1.6" />
            </g>
          }
          @case ('maintenance') {
            <!-- Mantenimiento: caja de herramientas y llave -->
            <rect x="9" y="30" width="46" height="22" rx="4" fill="#fff" />
            <path d="M24 30v-4a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" />
            <path d="M9 38h46" stroke-width="1.8" />
            <rect x="28" y="35" width="8" height="6" rx="1.5" fill="#F3E3CC" />
            <path d="M15 45.5h7M42 45.5h7" stroke-width="1.8" />
            <g class="accent">
              <path transform="translate(43 19) rotate(-35)" d="M-11 -2.3H4.68A5.8 5.8 0 0 1 15.37 -2.2H10V2.2H15.37A5.8 5.8 0 0 1 4.68 2.3H-11A2.3 2.3 0 0 1 -11 -2.3Z" fill="#C5873C" />
            </g>
          }
          @case ('arrivals') {
            <!-- Llegadas: maleta y llave de la propiedad -->
            <rect x="10" y="24" width="32" height="27" rx="4" fill="#fff" />
            <path d="M20 24v-4a2.5 2.5 0 0 1 2.5-2.5h7A2.5 2.5 0 0 1 32 20v4" />
            <path d="M17.5 24v27M34.5 24v27" stroke-width="1.8" />
            <rect x="21" y="31" width="10" height="7" rx="1.5" fill="#F3E3CC" />
            <circle cx="16" cy="54.5" r="2.2" fill="#003841" stroke="none" />
            <circle cx="36" cy="54.5" r="2.2" fill="#003841" stroke="none" />
            <g class="accent">
              <circle cx="50" cy="20" r="7" fill="#C5873C" />
              <circle cx="50" cy="20" r="2.4" fill="#fff" />
              <path d="M50 27v21M50 40h4.5M50 45h5.5" stroke-width="2.4" />
            </g>
          }
          @case ('inventory') {
            <!-- Inventario: toallas dobladas en anaquel, botella y etiqueta -->
            <path d="M7 53h40" />
            <rect x="9" y="41" width="30" height="12" rx="3" fill="#fff" />
            <path d="M9 47h30" stroke-width="1.6" />
            <rect x="11" y="30" width="26" height="11" rx="3" fill="#E3EEEA" />
            <path d="M11 35.5h26" stroke-width="1.6" />
            <rect x="13" y="20" width="22" height="10" rx="3" fill="#fff" />
            <path d="M13 25h22" stroke-width="1.6" />
            <path d="M47 53V36a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v17z" fill="#3A6168" />
            <rect x="49" y="26" width="4" height="6" rx="1" fill="#F3E3CC" />
            <g class="accent">
              <path d="M38 11h9l5 5-9 9-5-5z" fill="#C5873C" />
              <circle cx="44.5" cy="15.5" r="1.6" fill="#fff" stroke="none" />
            </g>
          }
          @case ('parking') {
            <!-- Parqueos: auto de frente en su espacio y rótulo P -->
            <path d="M8 54h48M12 54V40M52 54V40" stroke-width="1.8" />
            <path d="M17 38l3.5-9a4 4 0 0 1 3.7-2.6h15.6a4 4 0 0 1 3.7 2.6L47 38z" fill="#fff" />
            <rect x="14" y="37" width="36" height="12" rx="4" fill="#3A6168" />
            <circle cx="21" cy="43" r="2.4" fill="#F3E3CC" />
            <circle cx="43" cy="43" r="2.4" fill="#F3E3CC" />
            <path d="M28 44.5h8" stroke="#fff" stroke-width="1.8" />
            <path d="M17 49v4M47 49v4" stroke-width="2.6" />
            <g class="accent">
              <rect x="40" y="7" width="15" height="15" rx="3.5" fill="#C5873C" />
              <path d="M45.5 18.5v-8h2.6a2.4 2.4 0 0 1 0 4.8h-2.6" stroke="#fff" stroke-width="1.9" />
            </g>
          }
          @case ('pool') {
            <!-- Áreas comunes: piscina con escalera, agua y sombrilla -->
            <rect x="8" y="38" width="48" height="16" rx="4" fill="#E3EEEA" />
            <path d="M12 45c3 2 6 2 9 0s6-2 9 0 6 2 9 0 6-2 9 0M12 50c3 2 6 2 9 0s6-2 9 0 6 2 9 0 6-2 9 0" stroke="#3A6168" stroke-width="1.6" />
            <path d="M44 38V27a3 3 0 0 1 6 0M50 38V30" stroke-width="2" />
            <path d="M44 31h6M44 35h6" stroke-width="1.6" />
            <path d="M19 38V18" />
            <path d="M7 22a12 9 0 0 1 24 0z" fill="#fff" />
            <path d="M19 13v-2" />
            <g class="accent">
              <circle cx="46" cy="13" r="5.5" fill="#C5873C" />
              <path d="M46 4v2M46 20v2M37 13h2M53 13h2" stroke="#C5873C" stroke-width="1.8" />
            </g>
          }
          @case ('payroll') {
            <!-- Nómina: boleta de pago y monedas -->
            <path d="M12 9h26l6 6v38l-4-2.5-4 2.5-4-2.5-4 2.5-4-2.5-4 2.5-4-2.5-4 2.5z" fill="#fff" />
            <path d="M38 9v6h6" stroke-width="1.8" />
            <path d="M17 20h12M17 26h20M17 31h20M17 36h14" stroke-width="1.6" />
            <rect x="17" y="40" width="20" height="5" rx="1.5" fill="#F3E3CC" stroke="none" />
            <g class="accent">
              <ellipse cx="48" cy="47" rx="9" ry="3.6" fill="#C5873C" />
              <path d="M39 47v-5c0 2 4 3.6 9 3.6s9-1.6 9-3.6v5" fill="#C5873C" />
              <ellipse cx="48" cy="42" rx="9" ry="3.6" fill="#E0A863" />
              <path d="M45.5 42h5" stroke="#fff" stroke-width="1.6" />
            </g>
          }
        }
      </g>
    </svg>
  `,
  styles: `
    :host { display: inline-block; flex-shrink: 0; }
    .ink { fill: none; stroke: #003841; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .accent { transform-box: fill-box; transform-origin: center; transition: transform 420ms var(--spring-bounce); }
    :host(:hover) .accent, :host-context(.group:hover) .accent { transform: translateY(-2.5px) rotate(-4deg); }
    @media (prefers-reduced-motion: reduce) { .accent { transition: none; } }
  `,
})
export class SpotIconComponent {
  readonly name = input.required<SpotIconName>();
  readonly size = input<number>(56);
  /** Fondo de la placa: arena o menta. */
  readonly tint = input<string>('#F4EEE3');

  protected readonly fid = `spot-sh-${nextId++}`;
}
