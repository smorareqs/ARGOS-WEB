import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { SegmentedComponent, SegmentOption } from '../../../../shared/molecules/segmented/segmented.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { initials } from '../../../../core/store/session.store';
import { AccessInfo, Property, TYPE_LABEL } from '../../models/property.model';
import { gapsOf, statusOf } from '../../models/property-status';
import { PropertyCoverComponent } from '../property-cover/property-cover.component';
import { placeOf } from '../property-card/property-card.component';
import { AccessPanelComponent } from '../access-panel/access-panel.component';

/**
 * Contenido del drawer de propiedad (W-C1 → resumen con "Abrir ficha").
 * Pestañas: Resumen · Acceso (solo con properties.access_info) · Equipo.
 */
@Component({
  selector: 'app-property-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PropertyCoverComponent, SegmentedComponent, BadgeComponent, IconComponent, AvatarComponent, AccessPanelComponent],
  template: `
    @let p = property();
    <div class="relative h-[230px] overflow-hidden">
      <app-property-cover class="hero-cover absolute inset-0" [property]="p" [lit]="true" [eager]="true" />
      <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface-soft to-transparent"></div>
    </div>

    <div class="relative -mt-10 px-6 pb-6">
      <div class="reveal" style="--i: 1">
        <app-badge [tone]="status().tone" [icon]="status().icon">{{ status().label }}</app-badge>
        <h2 class="mt-3 font-display text-[30px] font-semibold leading-[1.08] tracking-display text-primary">{{ p.name }}</h2>
        <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-text-body">
          <span class="rounded-xs bg-info-soft px-1.5 py-px font-mono text-[11.5px] font-bold text-primary">{{ p.code }}</span>
          <span>{{ typeLabel() }}</span>
          <span class="basis-full">{{ place() }}</span>
        </div>
      </div>

      <div class="reveal mt-5 grid grid-cols-3 gap-2.5" style="--i: 2">
        @for (f of facts(); track f.label) {
          <div class="rounded-tile border border-border-card bg-surface px-3 py-3">
            <app-icon [name]="f.icon" [size]="17" class="text-teal-muted" />
            <div class="mt-1.5 font-display text-[22px] font-semibold leading-none text-primary">{{ f.value ?? '—' }}</div>
            <div class="mt-1 text-[10.5px] uppercase tracking-[0.8px] text-text-secondary">{{ f.label }}</div>
          </div>
        }
      </div>

      <div class="reveal mt-6" style="--i: 3">
        <app-segmented [options]="tabs()" [(value)]="tab" ariaLabel="Secciones de la propiedad" class="w-full" />
      </div>

      <div class="mt-5">
        @switch (tab()) {
          @case ('resumen') {
            <div class="reveal-soft flex flex-col gap-3">
              @if (gaps().length) {
                <div class="flex items-start gap-3 rounded-tile bg-warning-soft px-4 py-3.5">
                  <app-icon name="alert" [size]="17" class="mt-0.5 text-warning" />
                  <div class="text-[12.5px] leading-snug text-text-body">
                    <span class="font-bold text-warning">Le falta para operar:</span> {{ gaps().join(' · ').toLowerCase() }}.
                  </div>
                </div>
              }
              <div class="flex items-center gap-3 rounded-tile bg-surface px-4 py-3.5 shadow-e1">
                <span class="flex h-9 w-9 items-center justify-center rounded-sm bg-info-soft text-primary"><app-icon name="checklist" [size]="17" /></span>
                <div class="min-w-0 flex-1">
                  <div class="text-[12px] text-text-secondary">Checklist de limpieza</div>
                  <div class="truncate text-[13.5px] font-bold text-primary">{{ p.checklist_template_name ?? 'Sin checklist' }}</div>
                </div>
              </div>
              <div class="flex items-center gap-3 rounded-tile bg-surface px-4 py-3.5 shadow-e1">
                <span class="flex h-9 w-9 items-center justify-center rounded-sm bg-info-soft text-primary"><app-icon name="map-pin" [size]="17" /></span>
                <div class="min-w-0 flex-1">
                  <div class="text-[12px] text-text-secondary">Ubicación</div>
                  <div class="truncate text-[13.5px] font-bold text-primary">{{ p.address ?? place() }}</div>
                </div>
              </div>
              @if (p.notes) {
                <p class="rounded-tile bg-surface px-4 py-3.5 text-[12.5px] leading-relaxed text-text-body shadow-e1">{{ p.notes }}</p>
              }
            </div>
          }
          @case ('acceso') {
            <app-access-panel
              class="reveal-soft"
              [hasInfo]="p.has_access_info"
              [access]="access()"
              [loading]="accessLoading()"
              [error]="accessError()"
              (reveal)="reveal.emit(p.id)"
            />
          }
          @case ('equipo') {
            <div class="reveal-soft flex flex-col gap-4">
              @for (group of team(); track group.label) {
                <div>
                  <div class="mb-2 text-[10.5px] uppercase tracking-[1px] text-text-secondary">{{ group.label }}</div>
                  @for (a of group.people; track a.user_id; let i = $index) {
                    <div class="reveal flex items-center gap-3 py-1.5" [style.--i]="i">
                      <app-avatar [initials]="ini(a.full_name)" [name]="a.full_name" [size]="34" />
                      <span class="text-[13px] font-bold text-primary">{{ a.full_name }}</span>
                    </div>
                  } @empty {
                    <p class="text-[13px] text-text-body">{{ group.empty }}</p>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .hero-cover { animation: settle 1.2s var(--ease-enter) both; }
    @keyframes settle { from { transform: scale(1.08); } }
    @media (prefers-reduced-motion: reduce) { .hero-cover { animation: none; } }
  `,
})
export class PropertyDetailComponent {
  readonly property = input.required<Property>();
  readonly canSeeAccess = input<boolean>(false);
  readonly access = input<AccessInfo | null>(null);
  readonly accessLoading = input<boolean>(false);
  readonly accessError = input<string | null>(null);
  readonly reveal = output<string>();

  protected readonly tab = signal('resumen');
  protected readonly status = computed(() => statusOf(this.property()));
  protected readonly gaps = computed(() => gapsOf(this.property()));
  protected readonly typeLabel = computed(() => TYPE_LABEL[this.property().type]);
  protected readonly place = computed(() => placeOf(this.property()));
  protected readonly ini = initials;

  protected readonly tabs = computed<SegmentOption[]>(() => [
    { value: 'resumen', label: 'Resumen' },
    ...(this.canSeeAccess() ? [{ value: 'acceso', label: 'Acceso' }] : []),
    { value: 'equipo', label: 'Equipo' },
  ]);

  protected readonly team = computed(() => [
    { label: 'Asignados', people: this.property().assigned, empty: 'Nadie asignado todavía.' },
    { label: 'Propietarios', people: this.property().owners, empty: 'Sin propietario registrado.' },
  ]);

  protected readonly facts = computed(() => {
    const p = this.property();
    return [
      { label: 'Habitaciones', value: p.bedrooms, icon: 'bed' as const },
      { label: 'Baños', value: p.bathrooms, icon: 'bath' as const },
      { label: 'Huéspedes', value: p.max_guests, icon: 'guests' as const },
    ];
  });
}
