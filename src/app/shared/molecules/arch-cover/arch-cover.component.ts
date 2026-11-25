import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ArchKind, ArchSetting, Palette, Scene, buildScene } from './arch-scene';

let seq = 0;

/**
 * Molécula · portada ilustrada de un inmueble, dibujada como un apunte de
 * viaje (urban sketching): manchas de acuarela con bordes irregulares,
 * corridas unos píxeles respecto de la línea de tinta, contorno que tiembla
 * como trazado a mano y grano de papel encima. La escena es determinista a
 * partir de una semilla: tipo (torre, casa, hotel), entorno (ciudad,
 * colonial con volcán, playa, lago) y hora del día. Sirve mientras no haya
 * fotos reales y como respaldo cuando una foto falla.
 *
 * `lit` enciende todas las ventanas en cascada (la propiedad "despierta");
 * las tarjetas lo activan al pasar el cursor.
 */
@Component({
  selector: 'app-arch-cover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = scene();
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      class="block h-full w-full"
      [class.lit]="lit()"
      [style.--lit]="s.p.lit"
      aria-hidden="true"
    >
      <defs>
        <linearGradient [attr.id]="id + 'sky'" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" [attr.stop-color]="s.p.sky0" />
          <stop offset="1" [attr.stop-color]="s.p.sky1" />
        </linearGradient>
        <!-- Acuarela: bordes irregulares y pigmento desparejo -->
        <filter [attr.id]="id + 'wc'" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" [attr.seed]="seedNum()" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" [attr.seed]="seedNum() + 3" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.3" result="ga" />
          <feComposite in="d" in2="ga" operator="in" result="w0" />
          <feGaussianBlur in="w0" stdDeviation="0.5" result="w" />
          <feMorphology in="d" operator="erode" radius="1.4" result="e" />
          <feComposite in="d" in2="e" operator="out" result="edge" />
          <feMerge><feMergeNode in="w" /><feMergeNode in="edge" /><feMergeNode in="edge" /></feMerge>
        </filter>
        <!-- Tinta: línea temblorosa -->
        <filter [attr.id]="id + 'ink'" x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" [attr.seed]="seedNum() + 7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <!-- Papel -->
        <filter [attr.id]="id + 'paper'" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" result="p" />
          <feColorMatrix in="p" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 -0.7 0.42" />
        </filter>
        <pattern [attr.id]="id + 'hatch'" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
          <path d="M0 0v7" [attr.stroke]="ink()" stroke-width=".9" stroke-opacity=".2" />
        </pattern>
      </defs>

      <rect width="400" height="300" [attr.fill]="'url(#' + id + 'sky)'" />
      @for (st of s.stars; track $index) {
        <circle class="star" [attr.cx]="st.x" [attr.cy]="st.y" [attr.r]="st.r" fill="#fff" [style.--d]="st.d + 'ms'" />
      }

      <!-- Manchas de acuarela (corridas respecto de la tinta) -->
      <g [attr.filter]="'url(#' + id + 'wc)'" transform="translate(3.5 2.5)">
        @if (s.sun; as sun) {
          <circle [attr.cx]="sun.x" [attr.cy]="sun.y" [attr.r]="sun.r" [attr.fill]="s.p.sun" />
        }
        @for (b of s.back; track $index) {
          <path [attr.d]="b.d" [attr.fill]="b.fill" [attr.opacity]="b.o * 0.85" />
        }
        <rect y="250" width="400" height="50" [attr.fill]="s.p.ground" />
      </g>
      <g [attr.filter]="'url(#' + id + 'ink)'" fill="none" [attr.stroke]="ink()" stroke-linejoin="round">
        @for (b of s.back; track $index) {
          <path [attr.d]="b.d" stroke-width="1.1" stroke-opacity=".45" />
        }
      </g>
      <g [attr.filter]="'url(#' + id + 'wc)'" transform="translate(3.5 2.5)">
        @for (b of s.bodies; track $index) {
          <path [attr.d]="b.d" [attr.fill]="b.fill" [attr.opacity]="b.o * 0.88" />
        }
        @for (f of s.front; track $index) {
          @if (f.fill) {
            <path [attr.d]="f.d" [attr.fill]="f.fill" [attr.opacity]="f.o * 0.9" />
          }
        }
      </g>
      <!-- Sombra rayada en el suelo y los edificios -->
      <g opacity=".9">
        <rect y="256" width="400" height="44" [attr.fill]="'url(#' + id + 'hatch)'" />
      </g>

      @for (w of s.windows; track $index) {
        <rect
          class="w"
          [class.on]="w.on"
          [attr.x]="w.x"
          [attr.y]="w.y"
          [attr.width]="w.w"
          [attr.height]="w.h"
          [attr.rx]="w.rx"
          [attr.fill]="w.off"
          [style.--d]="w.d + 'ms'"
        />
      }

      <!-- Tinta -->
      <g [attr.filter]="'url(#' + id + 'ink)'" fill="none" [attr.stroke]="ink()" stroke-linejoin="round" stroke-linecap="round">
        <path d="M-10 250.5h420" stroke-width="1.6" />
        @for (b of s.bodies; track $index) {
          <path [attr.d]="b.d" stroke-width="1.6" />
          <path [attr.d]="b.d" stroke-width="0.9" stroke-opacity=".4" transform="translate(-1.4 1.2)" />
        }
        @for (w of s.windows; track $index) {
          <rect [attr.x]="w.x" [attr.y]="w.y" [attr.width]="w.w" [attr.height]="w.h" [attr.rx]="w.rx" stroke-width="1.1" />
        }
        @for (f of s.front; track $index) {
          @if (f.stroke) {
            <path [attr.d]="f.d" [attr.stroke]="f.stroke === '#ffffff' ? '#ffffff' : ink()" [attr.stroke-width]="(f.sw ?? 1.5) * 0.7" [attr.opacity]="f.o" />
          } @else {
            <path [attr.d]="f.d" stroke-width="1.5" />
          }
        }
      </g>

      <rect width="400" height="300" [attr.filter]="'url(#' + id + 'paper)'" class="paper" />
    </svg>
  `,
  styles: `
    :host { display: block; overflow: hidden; background: #f6f1e6; }
    .w { transition: fill 320ms var(--ease-standard) var(--d, 0ms); }
    .w.on, .lit .w { fill: var(--lit); }
    .paper { mix-blend-mode: multiply; opacity: .4; pointer-events: none; }
    .star { opacity: .8; animation: twinkle 3.6s ease-in-out infinite var(--d); }
    @keyframes twinkle { 50% { opacity: .25; } }
    @media (prefers-reduced-motion: reduce) { .star { animation: none; } }
  `,
})
export class ArchCoverComponent {
  readonly seed = input.required<string>();
  readonly kind = input<ArchKind>('tower');
  readonly setting = input<ArchSetting>('city');
  readonly palette = input<Palette | null>(null);
  readonly lit = input<boolean>(false);

  protected readonly id = `arch${++seq}-`;
  protected readonly scene = computed<Scene>(() =>
    buildScene(this.seed(), this.kind(), this.setting(), this.palette()),
  );
  protected readonly seedNum = computed(() => [...this.seed()].reduce((a, c) => a + c.charCodeAt(0), 0) % 97);
  /** Tinta oscura sobre papel; clara en las escenas de noche. */
  protected readonly ink = computed(() => (this.scene().p.stars ? '#efe3cc' : '#29403f'));
}
