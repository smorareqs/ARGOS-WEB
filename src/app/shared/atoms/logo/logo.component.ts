import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type LogoTone = 'dark' | 'light';

/**
 * Átomo · marca ARGOS (anillo + punto dorado + wordmark).
 * Ref: ARGOS Web · header / brand panel / sidebar.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center" [style.gap.px]="gap()">
      <span
        class="flex shrink-0 items-center justify-center rounded-pill"
        [style.width.px]="ring()"
        [style.height.px]="ring()"
        [style.border]="ringBorder()"
      >
        <span
          class="rounded-pill bg-secondary"
          [style.width.px]="dot()"
          [style.height.px]="dot()"
        ></span>
      </span>
      <span
        class="font-display font-semibold"
        [style.font-size.px]="wordmark()"
        [style.letter-spacing.px]="tracking()"
        [class.text-primary]="tone() === 'dark'"
        [class.text-white]="tone() === 'light'"
        >ARGOS</span
      >
    </div>
  `,
})
export class LogoComponent {
  /** Tamaño del wordmark en px; el resto escala de forma proporcional. */
  readonly size = input<number>(22);
  /** 'dark' sobre fondos claros, 'light' sobre el teal. */
  readonly tone = input<LogoTone>('dark');

  protected readonly wordmark = computed(() => this.size());
  protected readonly ring = computed(() => Math.round(this.size() * 1.36));
  protected readonly dot = computed(() => Math.round(this.size() * 0.36));
  protected readonly gap = computed(() => Math.round(this.size() * 0.55));
  protected readonly tracking = computed(() => Math.max(2, Math.round(this.size() * 0.18)));
  protected readonly ringBorder = computed(() =>
    this.tone() === 'dark'
      ? '2.5px solid var(--color-primary)'
      : '2.5px solid rgba(255,255,255,0.9)',
  );
}
