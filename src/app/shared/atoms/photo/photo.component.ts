import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Photo } from '../../media/photos';

/**
 * Átomo · fotografía responsiva que llena su contenedor (object-cover).
 * Mientras carga muestra el tono arena y luego aparece con un fundido corto,
 * sin saltos de layout: el tamaño lo define siempre el contenedor.
 */
@Component({
  selector: 'app-photo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block overflow-hidden bg-canvas' },
  template: `
    <img
      [src]="photo().src"
      [attr.srcset]="photo().srcset"
      [attr.sizes]="sizes()"
      [alt]="decorative() ? '' : photo().alt"
      [attr.loading]="eager() ? 'eager' : 'lazy'"
      [attr.fetchpriority]="eager() ? 'high' : null"
      decoding="async"
      class="h-full w-full object-cover"
      [class.loaded]="loaded()"
      [style.object-position]="photo().position"
      (load)="loaded.set(true)"
    />
  `,
  styles: `
    img { opacity: 0; transition: opacity 600ms var(--ease-standard); }
    img.loaded { opacity: 1; }
    @media (prefers-reduced-motion: reduce) { img { transition: none; } }
  `,
})
export class PhotoComponent {
  readonly photo = input.required<Photo>();
  /** Atributo `sizes` del srcset (por defecto, ancho completo). */
  readonly sizes = input<string>('100vw');
  /** Para la foto principal visible al cargar (LCP). */
  readonly eager = input<boolean>(false);
  /** Si la foto es solo ambiente y el texto ya describe la escena. */
  readonly decorative = input<boolean>(false);

  protected readonly loaded = signal(false);
}
