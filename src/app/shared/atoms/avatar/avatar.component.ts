import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { cachedPersonArt, personArt, personBackdrop } from '../../media/generated-art';

export type AvatarTone = 'primary' | 'secondary' | 'teal-muted' | 'auto';

/**
 * Átomo · avatar de persona. Muestra la foto si existe; si no, un retrato
 * ilustrado y estable generado a partir del nombre (DiceBear · Notionists, ver
 * shared/media/generated-art.ts), en lugar de un monograma de iniciales.
 * Mientras el retrato carga se ve su color de fondo; las iniciales quedan como
 * texto accesible y solo se dibujan si el retrato no se pudo generar.
 * `ring` dibuja un borde del color de la superficie para apilar avatares.
 * `tone` se conserva por compatibilidad: ya no cambia el dibujo.
 */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="flex shrink-0 items-center justify-center overflow-hidden rounded-pill"
      [class.ring-2]="ring()"
      [class.ring-surface]="ring()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.background]="backdrop()"
      [attr.title]="name()"
      [attr.aria-label]="name() || initials()"
      role="img"
    >
      @if (photo() && !photoFailed()) {
        <img [src]="photo()" alt="" class="h-full w-full object-cover" (error)="photoFailed.set(true)" />
      } @else if (art(); as src) {
        <img [src]="src" alt="" class="art h-full w-full" decoding="async" />
      } @else if (artFailed()) {
        <span class="font-bold text-primary" [style.font-size.px]="size() * 0.38">{{ initials() }}</span>
      }
    </span>
  `,
  styles: `
    :host { display: inline-flex; }
    .art { animation: art-in 260ms var(--ease-enter) both; }
    @keyframes art-in { from { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .art { animation: none; } }
  `,
})
export class AvatarComponent {
  readonly initials = input.required<string>();
  readonly name = input<string | null>(null);
  readonly size = input<number>(36);
  readonly tone = input<AvatarTone>('primary');
  readonly ring = input<boolean>(false);
  /** URL de la foto de la persona (cuando exista). */
  readonly photo = input<string | null>(null);

  protected readonly photoFailed = signal(false);
  protected readonly art = signal<string | null>(null);
  protected readonly artFailed = signal(false);

  private readonly seed = computed(() => this.name() || this.initials());
  protected readonly backdrop = computed(() => personBackdrop(this.seed()));

  constructor() {
    effect((onCleanup) => {
      const seed = this.seed();
      if (this.photo() && !this.photoFailed()) return;
      let live = true;
      onCleanup(() => (live = false));
      this.art.set(cachedPersonArt(seed));
      this.artFailed.set(false);
      personArt(seed).then(
        (uri) => live && this.art.set(uri),
        () => live && this.artFailed.set(true),
      );
    });
  }
}
