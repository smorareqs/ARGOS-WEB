import { Directive, ElementRef, inject, input, output, afterNextRender, DestroyRef } from '@angular/core';

/**
 * `appInView` · agrega la clase `is-in` la primera vez que el elemento entra
 * en pantalla (y emite `entered`). Se combina con las clases `.fx-*` de
 * styles.css para revelar contenido al hacer scroll sin JavaScript extra.
 */
@Directive({ selector: '[appInView]' })
export class InViewDirective {
  /** Fracción visible necesaria para disparar (0–1). */
  readonly appInView = input<number | ''>('');
  readonly entered = output<void>();

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const threshold = typeof this.appInView() === 'number' ? (this.appInView() as number) : 0.18;
      if (!('IntersectionObserver' in window)) {
        el.classList.add('is-in');
        this.entered.emit();
        return;
      }
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            el.classList.add('is-in');
            this.entered.emit();
            io.disconnect();
          }
        },
        { threshold, rootMargin: '0px 0px -6% 0px' },
      );
      io.observe(el);
      destroyRef.onDestroy(() => io.disconnect());
    });
  }
}
