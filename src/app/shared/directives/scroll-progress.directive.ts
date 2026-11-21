import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

/**
 * `appScrollProgress` · escribe en el elemento la variable CSS `--p`, de 0
 * (su borde superior entra por abajo de la pantalla) a 1 (llega a `end` del
 * alto de la pantalla, contado desde arriba). El CSS decide qué animar con
 * `--p` (escala, recorte, desplazamiento), así el movimiento sigue al scroll
 * y se puede revertir. Solo escucha mientras el elemento está cerca de la
 * pantalla. Con "reducir movimiento" queda fijo en 1.
 */
@Directive({ selector: '[appScrollProgress]' })
export class ScrollProgressDirective {
  /** Fracción de la pantalla (desde arriba) donde `--p` llega a 1. */
  readonly end = input<number>(0.2, { alias: 'appScrollProgress' });

  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.style.setProperty('--p', '1');
        return;
      }
      let frame = 0;
      const update = () => {
        frame = 0;
        const vh = window.innerHeight;
        const top = el.getBoundingClientRect().top;
        const p = Math.min(1, Math.max(0, (vh - top) / (vh * (1 - this.end()))));
        el.style.setProperty('--p', p.toFixed(3));
      };
      const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(update);
      };
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll, { passive: true });
            update();
          } else {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            update();
          }
        },
        { rootMargin: '25% 0px 25% 0px' },
      );
      update();
      io.observe(el);
      destroyRef.onDestroy(() => {
        io.disconnect();
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
    });
  }
}
