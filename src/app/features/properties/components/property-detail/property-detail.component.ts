import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ArchCoverComponent } from '../../../../shared/molecules/arch-cover/arch-cover.component';
import { SegmentedComponent, SegmentOption } from '../../../../shared/molecules/segmented/segmented.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';
import { AccessInfo, Property, TYPE_LABEL } from '../../models/property.model';
import { statusOf } from '../../models/property-status';
import { archKind } from '../property-card/property-card.component';

/**
 * Contenido del drawer de propiedad (W-C1 → resumen con "Abrir ficha").
 * Pestañas: Resumen · Acceso (solo con properties.access_info) · Equipo.
 */
@Component({
  selector: 'app-property-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ArchCoverComponent,
    SegmentedComponent,
    BadgeComponent,
    IconComponent,
    AvatarComponent,
    ButtonComponent,
    RelativeDatePipe,
  ],
  template: `
    @let p = property();
    <div class="relative h-[230px] overflow-hidden">
      <app-arch-cover class="hero-cover absolute inset-0" [seed]="p.code" [kind]="kind()" [setting]="p.setting" [lit]="true" />
      <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface-soft to-transparent"></div>
    </div>

    <div class="relative -mt-10 px-6 pb-6">
      <div class="reveal" style="--i: 1">
        <app-badge [tone]="status().tone" [icon]="status().icon">{{ status().label }}</app-badge>
        <h2 class="mt-3 font-display text-[30px] font-semibold leading-[1.08] tracking-display text-primary">{{ p.name }}</h2>
        <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-text-body">
          <span class="rounded-xs bg-info-soft px-1.5 py-px font-mono text-[11.5px] font-bold text-primary">{{ p.code }}</span>
          <span>{{ typeLabel() }}</span>
          <span class="basis-full">{{ p.building_name ? p.building_name + ' · ' : '' }}{{ p.zone }}</span>
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
              <div class="flex items-center gap-3 rounded-tile bg-surface px-4 py-3.5 shadow-e1">
                <span class="flex h-9 w-9 items-center justify-center rounded-sm bg-warning-soft text-secondary"><app-icon name="broom" [size]="17" /></span>
                <div class="flex-1">
                  <div class="text-[12px] text-text-secondary">Última limpieza</div>
                  <div class="text-[13.5px] font-bold text-primary">{{ p.last_cleaning_at | relativeDate: 'time' : 'Sin limpiezas registradas' }}</div>
                </div>
              </div>
              <div class="flex items-center gap-3 rounded-tile bg-surface px-4 py-3.5 shadow-e1">
                <span class="flex h-9 w-9 items-center justify-center rounded-sm" [class]="p.open_incidents ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'">
                  <app-icon [name]="p.open_incidents ? 'alert' : 'check'" [size]="17" />
                </span>
                <div class="flex-1">
                  <div class="text-[12px] text-text-secondary">Incidencias</div>
                  <div class="text-[13.5px] font-bold text-primary">
                    {{ p.open_incidents ? p.open_incidents + ' abierta' + (p.open_incidents > 1 ? 's' : '') : 'Sin incidencias abiertas' }}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-3 rounded-tile bg-surface px-4 py-3.5 shadow-e1">
                <span class="flex h-9 w-9 items-center justify-center rounded-sm bg-info-soft text-primary"><app-icon name="map-pin" [size]="17" /></span>
                <div class="min-w-0 flex-1">
                  <div class="text-[12px] text-text-secondary">Ubicación</div>
                  <div class="truncate text-[13.5px] font-bold text-primary">{{ p.address ?? p.zone }}</div>
                </div>
              </div>
            </div>
          }
          @case ('acceso') {
            <div class="reveal-soft rounded-tile border border-border-card bg-surface p-4">
              @if (access(); as a) {
                <div class="flex items-center gap-2 text-[11px] uppercase tracking-[1px] text-text-secondary">
                  <app-icon name="key" [size]="14" /> Información de acceso
                </div>
                <pre class="reveal-soft mt-3 whitespace-pre-wrap rounded-sm bg-background p-3.5 font-mono text-[12.5px] leading-relaxed text-primary">{{ a.text }}</pre>
                <p class="mt-3 flex items-center gap-1.5 text-[11.5px] text-text-secondary">
                  <app-icon name="logbook" [size]="13" /> Consultada {{ a.viewed_at | relativeDate }} · quedó registrado en la bitácora.
                </p>
              } @else if (p.has_access_info) {
                <div class="flex items-center gap-3">
                  <span class="flex h-10 w-10 items-center justify-center rounded-sm bg-info-soft text-primary"><app-icon name="lock" [size]="18" /></span>
                  <div class="flex-1">
                    <div class="text-[13px] font-bold text-primary">Llaves, códigos y wifi</div>
                    <div class="font-mono text-[13px] tracking-[3px] text-text-muted">•••• •••• ••••</div>
                  </div>
                  <app-button variant="secondary" size="sm" [loading]="accessLoading()" (pressed)="reveal.emit(p.id)">
                    @if (!accessLoading()) {
                      <app-icon name="eye" [size]="15" />
                    }
                    Mostrar
                  </app-button>
                </div>
                <p class="mt-3 text-[11.5px] leading-snug text-text-secondary">
                  Está cifrada. Al mostrarla queda registrado quién la vio y cuándo.
                </p>
                @if (accessError()) {
                  <p class="mt-2 text-[12px] text-danger">{{ accessError() }}</p>
                }
              } @else {
                <p class="text-[13px] text-text-body">Esta propiedad aún no tiene información de acceso.</p>
              }
            </div>
          }
          @case ('equipo') {
            <div class="reveal-soft flex flex-col gap-4">
              <div>
                <div class="mb-2 text-[10.5px] uppercase tracking-[1px] text-text-secondary">Asignados</div>
                @for (a of p.assigned; track a.id; let i = $index) {
                  <div class="reveal flex items-center gap-3 py-1.5" [style.--i]="i">
                    <app-avatar [initials]="a.initials" [name]="a.name" tone="auto" [size]="34" />
                    <span class="text-[13px] font-bold text-primary">{{ a.name }}</span>
                  </div>
                } @empty {
                  <p class="text-[13px] text-text-body">Nadie asignado todavía.</p>
                }
              </div>
              <div>
                <div class="mb-2 text-[10.5px] uppercase tracking-[1px] text-text-secondary">Propietarios</div>
                @for (o of p.owners; track o.id) {
                  <div class="flex items-center gap-3 py-1.5">
                    <app-avatar [initials]="o.initials" [name]="o.name" tone="secondary" [size]="34" />
                    <span class="text-[13px] font-bold text-primary">{{ o.name }}</span>
                  </div>
                } @empty {
                  <p class="text-[13px] text-text-body">Sin propietario registrado.</p>
                }
              </div>
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
  protected readonly typeLabel = computed(() => TYPE_LABEL[this.property().type]);
  protected readonly kind = computed(() => archKind(this.property()));

  protected readonly tabs = computed<SegmentOption[]>(() => [
    { value: 'resumen', label: 'Resumen' },
    ...(this.canSeeAccess() ? [{ value: 'acceso', label: 'Acceso' }] : []),
    { value: 'equipo', label: 'Equipo' },
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
