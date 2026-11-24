import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ArchCoverComponent } from '../../../../shared/molecules/arch-cover/arch-cover.component';
import { ArchKind } from '../../../../shared/molecules/arch-cover/arch-scene';
import { Property, settingOf } from '../../models/property.model';

/**
 * Portada de una propiedad: la foto subida (S3, firmada) si existe; si no, o
 * si la foto falla, la escena generada por código y tipo (`app-arch-cover`),
 * con el entorno deducido de la zona (playa, lago, colonial o ciudad).
 */
@Component({
  selector: 'app-property-cover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArchCoverComponent],
  template: `
    @if (photo()) {
      <img [src]="photo()" alt="" class="photo h-full w-full object-cover" [attr.loading]="eager() ? null : 'lazy'" (error)="failed.set(true)" />
    } @else {
      <app-arch-cover class="block h-full w-full" [seed]="property().code" [kind]="kind()" [setting]="setting()" [lit]="lit()" />
    }
  `,
  styles: `
    :host { display: block; }
    .photo { animation: in 320ms var(--ease-enter) both; }
    @keyframes in { from { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .photo { animation: none; } }
  `,
})
export class PropertyCoverComponent {
  readonly property = input.required<Pick<Property, 'code' | 'type' | 'zone' | 'building_name' | 'cover_url'> & { building_zone?: string | null }>();
  readonly lit = input<boolean>(false);
  readonly eager = input<boolean>(false);

  protected readonly failed = signal(false);
  protected readonly photo = computed(() => (this.failed() ? null : this.property().cover_url));
  protected readonly kind = computed<ArchKind>(() => archKind(this.property().type));
  protected readonly setting = computed(() => settingOf(this.property()));
}

export function archKind(type: Property['type']): ArchKind {
  return type === 'apartment' ? 'tower' : type === 'room' ? 'hotel' : 'house';
}
