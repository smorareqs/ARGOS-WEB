import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

/**
 * Átomo · número que cuenta hasta su valor al aparecer o al cambiar
 * (desaceleración exponencial, 900 ms). Usa cifras tabulares para que el ancho
 * no baile. Con "reducir movimiento" muestra el valor final directamente.
 */
@Component({
  selector: 'app-count-up',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="tabular" [attr.aria-label]="value()">{{ display() }}</span>`,
  styles: `:host { display: inline; }`,
})
export class CountUpComponent {
  readonly value = input.required<number>();
  readonly duration = input<number>(900);
  readonly decimals = input<number>(0);

  protected readonly display = signal('0');
  private current = 0;
  private frame = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
    effect(() => {
      const target = this.value();
      untracked(() => this.animateTo(target));
    });
  }

  private animateTo(target: number): void {
    cancelAnimationFrame(this.frame);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = this.current;
    if (reduce || from === target) {
      this.set(target);
      return;
    }
    const start = performance.now();
    const dur = this.duration();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(2, -10 * t);
      this.set(from + (target - from) * (t === 1 ? 1 : eased));
      if (t < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  private set(v: number): void {
    this.current = v;
    this.display.set(
      v.toLocaleString('es-GT', {
        minimumFractionDigits: this.decimals(),
        maximumFractionDigits: this.decimals(),
      }),
    );
  }
}
