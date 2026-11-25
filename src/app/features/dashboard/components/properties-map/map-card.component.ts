import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MapPin, PinStatus } from '../../models/dashboard.model';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { DimIconComponent } from '../../../../shared/atoms/dim-icon/dim-icon.component';
import { PropertyCoverComponent } from '../../../properties/components/property-cover/property-cover.component';
import { TYPE_LABEL } from '../../../properties/models/property.model';
import { plural } from '../../../../shared/utils/plural';

const STATUS: Record<PinStatus, { label: string; color: string }> = {
  incident: { label: 'Incidencia abierta', color: 'var(--color-danger)' },
  cleaning: { label: 'En limpieza', color: 'var(--color-secondary)' },
  occupied: { label: 'Ocupada', color: 'var(--color-primary)' },
  ready: { label: 'Lista para recibir', color: 'var(--color-success)' },
};

/**
 * Tarjeta flotante del mapa del Inicio (ref. la tarjeta de Airbnb sobre el
 * mapa): con una propiedad, su portada, tipo, lugar y estado de hoy; con un
 * grupo o un edificio, la lista de sus unidades para elegir una.
 */
@Component({
  selector: 'app-map-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ButtonComponent, DimIconComponent, PropertyCoverComponent],
  template: `
    <div class="card overflow-hidden rounded-card bg-surface">
      @if (single(); as p) {
        <div class="relative h-[112px]">
          <app-property-cover class="absolute inset-0" [property]="cover()!" [lit]="true" />
          <span class="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-xs bg-white/95 px-2 py-1 text-[11px] font-bold text-primary shadow-e1">
            <span class="h-2 w-2 rounded-pill" [style.background]="status(p.status).color"></span>{{ status(p.status).label }}
          </span>
          <button type="button" class="close" aria-label="Cerrar" (click)="closed.emit()"><app-icon name="x" [size]="14" /></button>
        </div>
        <div class="flex items-start gap-3 p-3.5">
          <app-dim-icon [name]="p.type" [size]="40" class="-ml-1 -mt-0.5" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 text-[11px] text-text-secondary">
              <span class="font-mono font-bold text-teal-muted">{{ p.code }}</span> · {{ typeLabel(p) }}
            </div>
            <div class="truncate font-display text-[16.5px] font-semibold leading-snug text-primary">{{ p.name }}</div>
            <div class="truncate text-[11.5px] text-text-body">{{ place(p) }}</div>
            @if (p.openTickets) {
              <div class="mt-1 text-[11.5px] font-bold text-danger">{{ tickets(p.openTickets) }}</div>
            }
          </div>
        </div>
        <div class="px-3.5 pb-3.5">
          <app-button variant="secondary" size="sm" [full]="true" (pressed)="opened.emit(p)">
            Ver propiedad <app-icon name="arrow-right" [size]="14" />
          </app-button>
        </div>
      } @else {
        <div class="flex items-center gap-2.5 border-b border-divider px-3.5 py-3">
          <app-dim-icon name="building" [size]="34" />
          <div class="min-w-0 flex-1">
            <div class="truncate font-display text-[15.5px] font-semibold text-primary">{{ title() }}</div>
            <div class="text-[11px] text-text-secondary">{{ units() }}</div>
          </div>
          <button type="button" class="close static" aria-label="Cerrar" (click)="closed.emit()"><app-icon name="x" [size]="14" /></button>
        </div>
        <ul class="max-h-[232px] overflow-y-auto py-1">
          @for (p of pins(); track p.id; let i = $index) {
            <li class="row" [style.--i]="i">
              <button type="button" class="flex w-full items-center gap-2.5 px-3 py-2 text-left" (click)="picked.emit(p)">
                <app-dim-icon [name]="p.type" [size]="28" [animate]="false" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-[12.5px] font-bold text-primary">{{ p.name }}</span>
                  <span class="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <span class="h-1.5 w-1.5 rounded-pill" [style.background]="status(p.status).color"></span>{{ status(p.status).label }}
                  </span>
                </span>
                <app-icon name="chevron-right" [size]="14" class="text-text-muted" />
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .card { box-shadow: 0 0 0 1px rgba(0,56,65,.06), 0 12px 32px rgba(0,56,65,.22); animation: card-in 380ms var(--spring-standard) both; }
    @keyframes card-in { from { opacity: 0; transform: translateY(10px) scale(.97); } }
    .close { position: absolute; right: 8px; top: 8px; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
      background: rgba(255,255,255,.95); color: var(--color-primary); box-shadow: var(--shadow-e1); transition: transform var(--dur-fast); }
    .close.static { position: static; }
    .close:hover { transform: scale(1.08); }
    .row { animation: card-in 300ms var(--ease-enter) both; animation-delay: calc(var(--i) * 35ms); }
    .row button { transition: background var(--dur-fast); }
    .row button:hover { background: var(--color-teal-washed); }
    @media (prefers-reduced-motion: reduce) { .card, .row { animation: none; } }
  `,
})
export class MapCardComponent {
  readonly pins = input.required<readonly MapPin[]>();
  readonly title = input<string | null>(null);
  readonly closed = output<void>();
  readonly opened = output<MapPin>();
  readonly picked = output<MapPin>();

  protected readonly single = computed(() => (this.pins().length === 1 ? this.pins()[0] : null));
  protected readonly cover = computed(() => {
    const p = this.single();
    return p ? { code: p.code, type: p.type, zone: p.zone, building_name: p.building, cover_url: null } : null;
  });
  protected readonly units = computed(() => {
    const n = this.pins().length;
    const issues = this.pins().filter((p) => p.status === 'incident').length;
    return plural(n, 'unidad', 'unidades') + (issues ? ` · ${plural(issues, 'con incidencia', 'con incidencia')}` : '');
  });

  protected status(s: PinStatus) {
    return STATUS[s];
  }
  protected typeLabel(p: MapPin): string {
    return TYPE_LABEL[p.type];
  }
  protected place(p: MapPin): string {
    return [p.building, p.zone].filter(Boolean).join(' · ') || 'Sin zona';
  }
  protected tickets(n: number): string {
    return plural(n, 'incidencia abierta', 'incidencias abiertas');
  }
}
