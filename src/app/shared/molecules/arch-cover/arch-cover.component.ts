import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ArchKind, ArchSetting, Palette, Scene, buildScene } from './arch-scene';

let seq = 0;

/**
 * Molécula · portada ilustrada de un inmueble. Escena SVG determinista a
 * partir de una semilla: tipo (torre, casa, hotel), entorno (ciudad, colonial
 * con volcán, playa, lago) y hora del día. Sirve mientras no haya fotos
 * reales y como respaldo cuando una foto falla.
 *
 * `lit` enciende todas las ventanas en cascada (los "cien ojos" de Argos);
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
        <linearGradient [attr.id]="gid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" [attr.stop-color]="s.p.sky0" />
          <stop offset="1" [attr.stop-color]="s.p.sky1" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" [attr.fill]="'url(#' + gid + ')'" />
      @for (st of s.stars; track $index) {
        <circle class="star" [attr.cx]="st.x" [attr.cy]="st.y" [attr.r]="st.r" fill="#fff" [style.--d]="st.d + 'ms'" />
      }
      @if (s.sun; as sun) {
        <circle [attr.cx]="sun.x" [attr.cy]="sun.y" [attr.r]="sun.r" [attr.fill]="s.p.sun" />
      }
      @for (b of s.back; track $index) {
        <path [attr.d]="b.d" [attr.fill]="b.fill" [attr.opacity]="b.o" />
      }
      <rect y="250" width="400" height="50" [attr.fill]="s.p.ground" />
      @for (b of s.bodies; track $index) {
        <path [attr.d]="b.d" [attr.fill]="b.fill" [attr.opacity]="b.o" />
      }
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
      @for (f of s.front; track $index) {
        <path
          [attr.d]="f.d"
          [attr.fill]="f.fill ?? 'none'"
          [attr.stroke]="f.stroke ?? null"
          [attr.stroke-width]="f.sw ?? null"
          [attr.opacity]="f.o"
          stroke-linecap="round"
        />
      }
    </svg>
  `,
  styles: `
    :host { display: block; overflow: hidden; }
    .w { transition: fill 320ms var(--ease-standard) var(--d, 0ms); }
    .w.on, .lit .w { fill: var(--lit); }
    .star { opacity: .8; animation: twinkle 3.6s ease-in-out infinite var(--d); }
    @keyframes twinkle { 50% { opacity: .25; } }
  `,
})
export class ArchCoverComponent {
  readonly seed = input.required<string>();
  readonly kind = input<ArchKind>('tower');
  readonly setting = input<ArchSetting>('city');
  readonly palette = input<Palette | null>(null);
  readonly lit = input<boolean>(false);

  protected readonly gid = `arch-sky-${++seq}`;
  protected readonly scene = computed<Scene>(() =>
    buildScene(this.seed(), this.kind(), this.setting(), this.palette()),
  );
}
