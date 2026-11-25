import { Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Directiva · inclinación 3D que sigue al cursor (como las tarjetas de
 * Apple TV o las de producto de Stripe): la tarjeta gira unos grados hacia
 * donde está el puntero y un brillo la recorre. Lo que lleve `.pop` dentro
 * se adelanta en Z y parece salir de la tarjeta. Solo con ratón y sin
 * "reducir movimiento".
 */
@Directive({
  selector: '[appTilt]',
  host: {
    class: 'tilt',
    '(pointermove)': 'move($event)',
    '(pointerleave)': 'leave()',
  },
})
export class TiltDirective {
  /** Grados máximos de giro. */
  readonly appTilt = input<number | ''>(6);

  private readonly el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private readonly enabled =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected move(e: PointerEvent): void {
    if (!this.enabled || e.pointerType !== 'mouse') return;
    const r = this.el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const max = Number(this.appTilt()) || 6;
    this.el.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
    this.el.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
    this.el.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`);
    this.el.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`);
    this.el.classList.add('is-tilting');
  }

  protected leave(): void {
    this.el.style.setProperty('--rx', '0deg');
    this.el.style.setProperty('--ry', '0deg');
    this.el.classList.remove('is-tilting');
  }
}
