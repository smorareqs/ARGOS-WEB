import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError, toApiError } from '../../../../core/http/api-error';
import { CanDirective } from '../../../../core/auth/can.directive';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ArchCoverComponent } from '../../../../shared/molecules/arch-cover/arch-cover.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { PropertiesApi } from '../../services/properties-api.service';
import { Building, BuildingDraft, coordsText, parseCoords, settingOf } from '../../models/property.model';

/**
 * Subpantalla · Edificios (W-C3). Cada edificio con su portada, zona y
 * cuántas propiedades agrupa; abrirlo filtra la lista de propiedades. Alta y
 * edición en drawer; solo se borra un edificio vacío (si no, se desactiva).
 */
@Component({
  selector: 'app-buildings-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CanDirective,
    ArchCoverComponent,
    EmptyStateComponent,
    FormSheetComponent,
    FormFieldComponent,
    DrawerComponent,
    BadgeComponent,
    ButtonComponent,
    CheckboxComponent,
    IconComponent,
    InputComponent,
  ],
  template: `
    @if (loading()) {
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (i of [0, 1, 2]; track i) {
          <div class="skeleton h-[132px] !rounded-card"></div>
        }
      </div>
    } @else if (!buildings().length) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="properties" title="Aún no hay edificios" message="Agrupa las propiedades que comparten dirección, parqueos o áreas comunes.">
          <app-button *argosCan="'properties.manage'" variant="primary" (pressed)="openCreate()"><app-icon name="plus" [size]="16" /> Nuevo edificio</app-button>
        </app-empty-state>
      </div>
    } @else {
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (b of buildings(); track b.id; let i = $index) {
          <article class="card reveal flex overflow-hidden rounded-card border border-border-card bg-surface shadow-e1" [style.--i]="i" [class.is-off]="!b.is_active">
            <button type="button" class="flex min-w-0 flex-1 items-stretch text-left" (click)="open(b)" [attr.aria-label]="'Ver las propiedades de ' + b.name">
              <div class="w-[112px] shrink-0 overflow-hidden">
                <app-arch-cover class="block h-full" [seed]="b.name" kind="tower" [setting]="setting(b)" />
              </div>
              <div class="min-w-0 flex-1 px-4 py-3.5">
                <div class="truncate font-display text-[18px] font-semibold leading-tight text-primary">{{ b.name }}</div>
                <div class="mt-0.5 truncate text-[12px] text-text-body">{{ b.zone ?? b.address ?? 'Sin zona' }}</div>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <span class="tabular text-[12.5px] font-bold text-primary">{{ b.properties_count }}</span>
                  <span class="text-[12px] text-text-secondary">{{ b.properties_count === 1 ? 'propiedad' : 'propiedades' }}</span>
                  @if (!b.is_active) {
                    <app-badge tone="muted" icon="ban" size="sm">Inactivo</app-badge>
                  }
                </div>
              </div>
            </button>
            <div *argosCan="'properties.manage'" class="flex items-start p-2">
              <app-button variant="icon" size="sm" [ariaLabel]="'Editar ' + b.name" (pressed)="openEdit(b)"><app-icon name="pencil" [size]="16" /></app-button>
            </div>
          </article>
        }
      </div>
    }

    <app-drawer [(open)]="editing" [label]="current() ? 'Editar edificio' : 'Nuevo edificio'" [width]="500">
      @if (editing()) {
        <app-form-sheet
          eyebrow="Propiedades"
          [title]="current() ? 'Editar edificio' : 'Nuevo edificio'"
          subtitle="Agrupa propiedades que comparten dirección, parqueos o áreas comunes."
          spot="map"
          [submitLabel]="current() ? 'Guardar cambios' : 'Crear edificio'"
          [saving]="saving()"
          [error]="generalError()"
          (submitted)="save()"
          (cancel)="editing.set(false)"
        >
          <app-form-field label="Nombre" for="bf-name" [required]="true" [error]="err('name')">
            <app-input inputId="bf-name" [compact]="true" placeholder="Torre Botánica" [invalid]="!!err('name')" [(value)]="name" />
          </app-form-field>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <app-form-field label="Zona" for="bf-zone" [optional]="true">
              <app-input inputId="bf-zone" [compact]="true" placeholder="Zona 10, Ciudad de Guatemala" [(value)]="zone" />
            </app-form-field>
            <app-form-field label="Coordenadas" for="bf-coords" [optional]="true" [error]="coordsError()" hint="Pégalas de Google Maps.">
              <app-input inputId="bf-coords" icon="map-pin" [compact]="true" placeholder="14.5986, -90.5094" [invalid]="!!coordsError()" [(value)]="coords" />
            </app-form-field>
          </div>
          <app-form-field label="Dirección" for="bf-address" [optional]="true">
            <app-input inputId="bf-address" [compact]="true" placeholder="4a avenida 15-70" [(value)]="address" />
          </app-form-field>
          <app-form-field label="Notas" for="bf-notes" [optional]="true">
            <textarea id="bf-notes" rows="3" class="field-native" placeholder="Horario de la garita, quién recibe llaves…" [value]="notes()" (input)="notes.set($any($event.target).value)"></textarea>
          </app-form-field>
          @if (current(); as b) {
            <app-checkbox [(checked)]="active">Edificio activo (desactívalo si ya no administras sus propiedades)</app-checkbox>
            @if (!b.properties_count) {
              <app-button variant="danger" size="sm" (pressed)="remove(b)"><app-icon name="trash" [size]="15" /> Borrar edificio</app-button>
            }
          }
        </app-form-sheet>
      }
    </app-drawer>
  `,
  styles: `
    :host { display: block; }
    .card { transition: box-shadow var(--dur-base) var(--ease-standard), transform var(--spring-standard-dur) var(--spring-standard); }
    .card:hover { box-shadow: var(--shadow-e2); transform: translateY(-2px); }
    .card.is-off app-arch-cover { filter: grayscale(0.85) opacity(0.75); }
    @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
  `,
})
export class BuildingsPanelComponent {
  private readonly api = inject(PropertiesApi);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly buildings = input.required<readonly Building[]>();
  readonly loading = input<boolean>(false);
  readonly changed = output<void>();

  protected readonly editing = signal(false);
  protected readonly current = signal<Building | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<ApiError | null>(null);
  protected readonly name = signal('');
  protected readonly zone = signal('');
  protected readonly coords = signal('');
  protected readonly address = signal('');
  protected readonly notes = signal('');
  protected readonly active = signal(true);

  protected setting(b: Building) {
    return settingOf({ zone: b.zone, building_name: b.name, type: 'apartment' });
  }

  protected err(field: string): string | null {
    return this.error()?.field(field) ?? null;
  }

  protected coordsError(): string | null {
    if (this.err('lat')) return this.err('lat');
    return this.coords().trim() && !parseCoords(this.coords()) ? 'Escribe latitud y longitud, p. ej. 14.5986, -90.5094.' : null;
  }

  protected generalError(): string | null {
    const e = this.error();
    return e && !e.field('name') && !e.field('lat') ? e.detail : null;
  }

  openCreate(): void {
    this.fill(null);
  }

  protected openEdit(b: Building): void {
    this.fill(b);
  }

  protected open(b: Building): void {
    void this.router.navigate([], { queryParams: { seccion: null, edificio: b.id } });
  }

  protected async save(): Promise<void> {
    if (this.coordsError()) return;
    const at = parseCoords(this.coords());
    const text = (v: string) => v.trim() || null;
    const draft: BuildingDraft = {
      name: this.name().trim(),
      zone: text(this.zone()),
      address: text(this.address()),
      notes: text(this.notes()),
      lat: at?.lat ?? null,
      lng: at?.lng ?? null,
    };
    this.saving.set(true);
    this.error.set(null);
    try {
      const b = this.current();
      if (b) await this.api.updateBuilding(b.id, { ...draft, is_active: this.active() });
      else await this.api.createBuilding(draft);
      this.toast.success(b ? 'Edificio actualizado.' : `Edificio ${draft.name} creado.`);
      this.editing.set(false);
      this.changed.emit();
    } catch (e) {
      this.error.set(toApiError(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(b: Building): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Borrar ${b.name}?`,
      message: 'No tiene propiedades. El cambio queda en la bitácora.',
      confirmLabel: 'Borrar edificio',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await this.api.removeBuilding(b.id);
      this.toast.success('Edificio borrado.');
      this.editing.set(false);
      this.changed.emit();
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    }
  }

  private fill(b: Building | null): void {
    this.current.set(b);
    this.error.set(null);
    this.name.set(b?.name ?? '');
    this.zone.set(b?.zone ?? '');
    this.coords.set(b ? coordsText(b.lat, b.lng) : '');
    this.address.set(b?.address ?? '');
    this.notes.set(b?.notes ?? '');
    this.active.set(b?.is_active ?? true);
    this.editing.set(true);
  }
}
