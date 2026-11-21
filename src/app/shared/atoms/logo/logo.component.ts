import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type LogoTone = 'dark' | 'light';

/**
 * Trazo del símbolo (cuadrícula de 48): una casa dibujada con la greca griega
 * en un solo trazo. Sube por la pared, cruza el techo, baja y se enrolla hacia
 * dentro como el meandro. Fuente única: los SVG de `public/brand` usan el mismo.
 */
export const ARGOS_MARK_PATH = 'M7 43V20.5L24 7l17 13.5V43H15.5V26.5h17V35H23.5';

/**
 * Átomo · logotipo oficial de ARGOS.
 *
 * El nombre viene de Argos, el guardián de la mitología griega al que Hera
 * confiaba lo que más quería cuidar. El símbolo une las dos ideas: una casa
 * (la propiedad) trazada con la greca (Grecia), sin huecos ni cortes. El
 * wordmark va en EB Garamond con tracking amplio, como una inscripción.
 *
 * - `intro`: el trazo se dibuja una vez al aparecer (respeta "reducir movimiento").
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="flex items-center" [style.gap.px]="gap()">
      <svg
        viewBox="0 0 48 48"
        [attr.width]="markSize()"
        [attr.height]="markSize()"
        class="shrink-0"
        [class.intro]="intro()"
        role="img"
        aria-label="ARGOS"
      >
        <path
          [attr.d]="path"
          pathLength="1"
          fill="none"
          stroke="currentColor"
          stroke-width="4.6"
          stroke-linejoin="miter"
        />
      </svg>
      @if (wordmark()) {
        <span
          class="wordmark font-semibold leading-none"
          [style.font-size.px]="size()"
          [style.letter-spacing.em]="0.18"
          aria-hidden="true"
          >ARGOS</span
        >
      }
    </span>
  `,
  styles: `
    :host { display: inline-flex; }
    /* El wordmark es parte del logotipo: siempre en su tipografía de marca. */
    .wordmark { font-family: 'EB Garamond', Garamond, serif; }
    :host(.tone-dark) { color: var(--color-primary); }
    :host(.tone-light) { color: #ffffff; }
    .intro path { stroke-dasharray: 1; animation: draw 1300ms var(--ease-enter) both 150ms; }
    @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) { .intro path { animation: none; } }
  `,
  host: {
    '[class.tone-dark]': "tone() === 'dark'",
    '[class.tone-light]': "tone() === 'light'",
  },
})
export class LogoComponent {
  /** Tamaño del wordmark en px; el símbolo escala en proporción. */
  readonly size = input<number>(22);
  /** 'dark' sobre fondos claros, 'light' sobre teal o fotos. */
  readonly tone = input<LogoTone>('dark');
  readonly wordmark = input<boolean>(true);
  readonly intro = input<boolean>(false);

  protected readonly path = ARGOS_MARK_PATH;
  protected readonly markSize = computed(() => Math.round(this.size() * 1.45));
  protected readonly gap = computed(() => Math.round(this.size() * 0.5));
}
