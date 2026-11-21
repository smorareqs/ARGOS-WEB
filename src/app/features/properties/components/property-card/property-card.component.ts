import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ArchCoverComponent } from '../../../../shared/molecules/arch-cover/arch-cover.component';
import { AvatarStackComponent } from '../../../../shared/molecules/avatar-stack/avatar-stack.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';
import { Property, TYPE_LABEL } from '../../models/property.model';
import { statusOf } from '../../models/property-status';
import { ArchKind } from '../../../../shared/molecules/arch-cover/arch-scene';

/**
 * Tarjeta de propiedad guiada por imagen (ref. Airbnb: portada con radio,
 * estado superpuesto, jerarquía título → contexto → equipo). Al pasar el
 * cursor la portada se acerca 3 % y sus ventanas se encienden en cascada.
 */
@Component({
  selector: 'app-property-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArchCoverComponent, AvatarStackComponent, BadgeComponent, IconComponent, RelativeDatePipe],
  template: `
    @let p = property();
    <button
      type="button"
      class="card group flex w-full flex-col rounded-card border border-border-card bg-surface p-2.5 text-left shadow-e1"
      [class.is-new]="highlight()"
      [class.is-inactive]="!p.is_active"
      [attr.aria-label]="p.name + ', ' + status().label"
      (mouseenter)="hover.set(true)"
      (mouseleave)="hover.set(false)"
      (focus)="hover.set(true)"
      (blur)="hover.set(false)"
      (click)="open.emit(p)"
    >
      <div class="cover relative overflow-hidden rounded-tile" style="aspect-ratio: 4 / 3">
        <app-arch-cover class="zoom absolute inset-0" [seed]="p.code" [kind]="kind()" [setting]="p.setting" [lit]="hover()" />
        <div class="absolute left-2.5 top-2.5 flex gap-1.5">
          <app-badge [tone]="status().tone" [icon]="status().icon" size="sm" class="overlay">{{ status().label }}</app-badge>
        </div>
        @if (p.open_incidents > 0) {
          <span class="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-xs bg-danger px-2 py-[3px] text-[10.5px] font-bold text-white shadow-e1">
            <app-icon name="alert" [size]="12" /> {{ p.open_incidents }}
          </span>
        }
      </div>

      <div class="px-1.5 pb-1 pt-3">
        <div class="flex items-center gap-2 text-[11px] text-text-secondary">
          <span class="font-mono font-bold tracking-wide text-teal-muted">{{ p.code }}</span>
          <span class="h-1 w-1 rounded-pill bg-disabled"></span>
          <span>{{ typeLabel() }}</span>
          @if (p.bedrooms) {
            <span class="h-1 w-1 rounded-pill bg-disabled"></span>
            <span>{{ p.bedrooms }} hab.</span>
          }
        </div>
        <div class="mt-1 truncate font-display text-[19px] font-semibold leading-tight text-primary">{{ p.name }}</div>
        <div class="mt-0.5 truncate text-[12px] text-text-body">{{ p.building_name ? p.building_name + ' · ' : '' }}{{ p.zone }}</div>
        <div class="mt-3 flex items-center justify-between gap-2 border-t border-divider pt-3">
          <app-avatar-stack [people]="people()" [size]="26" />
          <span class="flex items-center gap-1 text-[11px] text-text-secondary" title="Última limpieza">
            <app-icon name="broom" [size]="13" /> {{ p.last_cleaning_at | relativeDate: 'time' : 'Sin limpiezas' }}
          </span>
        </div>
      </div>
    </button>
  `,
  styles: `
    :host { display: block; }
    .card { transition: transform var(--spring-standard-dur) var(--spring-standard), box-shadow var(--dur-base) var(--ease-standard),
      border-color var(--dur-base); }
    .card:hover { transform: translateY(-3px); box-shadow: var(--shadow-e2); }
    .card:active { transform: translateY(-1px) scale(0.99); transition-duration: 80ms; }
    .zoom { transition: transform 300ms var(--ease-standard); }
    .card:hover .zoom { transform: scale(1.03); }
    .overlay { box-shadow: 0 1px 2px rgba(0,0,0,.08); }
    .card.is-inactive .cover { filter: grayscale(0.85) opacity(0.75); }
    .card.is-new { border-color: var(--color-secondary); animation: flash 2.4s var(--ease-standard); }
    @keyframes flash { 0%, 40% { box-shadow: 0 0 0 6px rgba(197,135,60,.22), var(--shadow-e2); } }
  `,
})
export class PropertyCardComponent {
  readonly property = input.required<Property>();
  readonly highlight = input<boolean>(false);
  readonly open = output<Property>();

  protected readonly hover = signal(false);
  protected readonly status = computed(() => statusOf(this.property()));
  protected readonly typeLabel = computed(() => TYPE_LABEL[this.property().type]);
  protected readonly kind = computed<ArchKind>(() => archKind(this.property()));
  protected readonly people = computed(() =>
    this.property().assigned.map((a) => ({ name: a.name, initials: a.initials })),
  );
}

export function archKind(p: Property): ArchKind {
  return p.type === 'apartment' ? 'tower' : p.type === 'room' ? 'hotel' : 'house';
}
