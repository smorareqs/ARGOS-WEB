import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { ApiError } from '../../../../core/http/api-error';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import {
  Building,
  ChecklistTemplate,
  Property,
  PropertyDraft,
  PropertyType,
  TYPE_LABEL,
  coordsText,
  parseCoords,
} from '../../models/property.model';
import { PropertyCoverComponent } from '../property-cover/property-cover.component';

const CODE_RE = /^[A-Z0-9][A-Z0-9-]{1,31}$/;

/**
 * Formulario de propiedad en drawer (ux-ui.md §3.3) para el alta y para
 * "Editar" en la ficha: etiquetas visibles, validación al salir del campo,
 * errores del servidor junto a su campo y una vista previa en vivo de la
 * tarjeta. La información de acceso solo se escribe aquí al crear; después
 * vive en la pestaña Acceso de la ficha.
 */
@Component({
  selector: 'app-property-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PropertyCoverComponent, SegmentedComponent, FormFieldComponent, InputComponent, SelectComponent, ButtonComponent, IconComponent],
  template: `
    <form novalidate class="flex min-h-full flex-col" (submit)="submit($event)">
      <div class="px-6 pb-2 pt-7 pr-14">
        <div class="text-[11px] uppercase tracking-[1.6px] text-secondary">Propiedades</div>
        <h2 class="mt-1 font-display text-[30px] font-semibold leading-tight tracking-display text-primary">
          {{ initial() ? 'Editar datos' : 'Nueva propiedad' }}
        </h2>
        <p class="mt-1 text-[13px] text-text-body">
          {{ initial() ? 'Los cambios quedan en la bitácora.' : 'Después podrás asignar al equipo y subir una foto desde su ficha.' }}
        </p>
      </div>

      <!-- Vista previa en vivo -->
      <div class="mx-6 mt-4 flex items-center gap-3.5 rounded-tile border border-border-card bg-surface p-2.5 shadow-e1">
        <div class="h-[74px] w-[98px] shrink-0 overflow-hidden rounded-sm">
          <app-property-cover class="h-full" [property]="preview()" />
        </div>
        <div class="min-w-0">
          <div class="font-mono text-[11px] font-bold tracking-wide text-teal-muted">{{ code() || 'CÓDIGO' }}</div>
          <div class="truncate font-display text-[18px] font-semibold text-primary">{{ name() || 'Nombre de la propiedad' }}</div>
          <div class="truncate text-[11.5px] text-text-secondary">{{ typeLabel() }} · {{ buildingName() ?? (zone() || 'Sin zona') }}</div>
        </div>
      </div>

      <div class="flex flex-1 flex-col gap-5 px-6 py-6">
        <div class="grid grid-cols-[130px_1fr] gap-3">
          <app-form-field label="Código" for="pf-code" [required]="true" [error]="codeError()">
            <app-input
              inputId="pf-code"
              [compact]="true"
              [mono]="true"
              [uppercase]="true"
              [maxlength]="32"
              placeholder="TB-905"
              [invalid]="!!codeError()"
              [value]="code()"
              (valueChange)="code.set($event); dismissed.set(true)"
              (blurred)="touch('code')"
            />
          </app-form-field>
          <app-form-field label="Nombre" for="pf-name" [required]="true" [error]="nameError()">
            <app-input
              inputId="pf-name"
              [compact]="true"
              placeholder="Torre Botánica 905"
              [invalid]="!!nameError()"
              [value]="name()"
              (valueChange)="name.set($event)"
              (blurred)="touch('name')"
            />
          </app-form-field>
        </div>

        <app-form-field label="Tipo">
          <app-segmented [options]="types" [(value)]="type" ariaLabel="Tipo de propiedad" class="w-full" />
        </app-form-field>

        <app-form-field label="Edificio" for="pf-building" [optional]="true" hint="Agrupa propiedades que comparten parqueos y áreas comunes.">
          <app-select selectId="pf-building" [compact]="true" [options]="buildingOptions()" [(value)]="building" />
        </app-form-field>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <app-form-field label="Zona" for="pf-zone" [optional]="true" hint="Barrio o ciudad.">
            <app-input inputId="pf-zone" [compact]="true" placeholder="Zona 10, Ciudad de Guatemala" [(value)]="zone" />
          </app-form-field>
          <app-form-field label="Coordenadas" for="pf-coords" [optional]="true" [error]="coordsError()" hint="Pégalas de Google Maps.">
            <app-input inputId="pf-coords" icon="map-pin" [compact]="true" placeholder="14.5986, -90.5094" [invalid]="!!coordsError()" [(value)]="coords" (blurred)="touch('coords')" />
          </app-form-field>
        </div>

        <app-form-field label="Dirección" for="pf-address" [optional]="true">
          <app-input inputId="pf-address" [compact]="true" placeholder="5a avenida 12-30" [(value)]="address" />
        </app-form-field>

        <div class="grid grid-cols-3 gap-3">
          <app-form-field label="Habitaciones" for="pf-bed" [error]="numError(bedrooms())">
            <app-input inputId="pf-bed" type="number" inputmode="numeric" [compact]="true" placeholder="2" [(value)]="bedrooms" />
          </app-form-field>
          <app-form-field label="Baños" for="pf-bath" [error]="numError(bathrooms())">
            <app-input inputId="pf-bath" type="number" inputmode="numeric" [compact]="true" placeholder="2" [(value)]="bathrooms" />
          </app-form-field>
          <app-form-field label="Huéspedes" for="pf-guests" [error]="numError(guests())">
            <app-input inputId="pf-guests" type="number" inputmode="numeric" [compact]="true" placeholder="4" [(value)]="guests" />
          </app-form-field>
        </div>

        <app-form-field label="Checklist de limpieza" for="pf-tpl" [hint]="initial() ? null : 'Sin elegir se usa la plantilla por defecto.'">
          <app-select selectId="pf-tpl" [compact]="true" [options]="templateOptions()" [(value)]="template" />
        </app-form-field>

        @if (!initial()) {
          <app-form-field label="Acceso" for="pf-access" [optional]="true" hint="Llaves, códigos y wifi. Se guarda cifrado y cada consulta queda en la bitácora.">
            <textarea id="pf-access" rows="3" class="field-native font-mono !text-[12.5px]" placeholder="Caja de llaves en recepción · código 4821" [value]="access()" (input)="access.set($any($event.target).value)"></textarea>
          </app-form-field>
        }

        <app-form-field label="Notas" for="pf-notes" [optional]="true">
          <textarea id="pf-notes" rows="2" class="field-native" placeholder="Ej.: el portón se traba, empujar fuerte" [value]="notes()" (input)="notes.set($any($event.target).value)"></textarea>
        </app-form-field>

        @if (generalError(); as err) {
          <p class="flex items-start gap-2 rounded-sm bg-danger-soft px-3.5 py-2.5 text-[12.5px] text-danger" role="alert">
            <app-icon name="alert" [size]="15" class="mt-px" /> {{ err }}
          </p>
        }
      </div>

      <div class="material-glass sticky bottom-0 flex justify-end gap-2.5 border-t border-divider px-6 py-4">
        <app-button variant="tertiary" (pressed)="cancel.emit()">Cancelar</app-button>
        <app-button variant="primary" type="submit" [loading]="saving()">
          {{ initial() ? 'Guardar cambios' : saving() ? 'Creando…' : 'Crear propiedad' }}
        </app-button>
      </div>
    </form>
  `,
  styles: `:host { display: block; min-height: 100%; }`,
})
export class PropertyFormComponent {
  readonly buildings = input.required<readonly Building[]>();
  readonly templates = input<readonly ChecklistTemplate[]>([]);
  /** Propiedad a editar; null = alta. */
  readonly initial = input<Property | null>(null);
  readonly saving = input<boolean>(false);
  readonly serverError = input<ApiError | null>(null);

  readonly submitted = output<PropertyDraft>();
  readonly cancel = output<void>();

  protected readonly code = signal('');
  protected readonly name = signal('');
  protected readonly type = signal<string>('apartment');
  protected readonly building = signal('');
  protected readonly zone = signal('');
  protected readonly coords = signal('');
  protected readonly address = signal('');
  protected readonly bedrooms = signal('');
  protected readonly bathrooms = signal('');
  protected readonly guests = signal('');
  protected readonly template = signal('');
  protected readonly access = signal('');
  protected readonly notes = signal('');
  protected readonly dismissed = signal(false);
  private readonly touched = signal<Record<string, boolean>>({});

  constructor() {
    // Cada respuesta nueva del servidor vuelve a mostrar su error de campo.
    effect(() => {
      this.serverError();
      untracked(() => this.dismissed.set(false));
    });
    // Al editar, el formulario arranca con los datos actuales.
    effect(() => {
      const p = this.initial();
      if (!p) return;
      untracked(() => {
        this.code.set(p.code);
        this.name.set(p.name);
        this.type.set(p.type);
        this.building.set(p.building_id ?? '');
        this.zone.set(p.zone ?? '');
        this.coords.set(coordsText(p.lat, p.lng));
        this.address.set(p.address ?? '');
        this.bedrooms.set(p.bedrooms?.toString() ?? '');
        this.bathrooms.set(p.bathrooms?.toString() ?? '');
        this.guests.set(p.max_guests?.toString() ?? '');
        this.template.set(p.checklist_template_id ?? '');
        this.notes.set(p.notes ?? '');
      });
    });
  }

  protected readonly types = (Object.keys(TYPE_LABEL) as PropertyType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }));

  protected readonly buildingOptions = computed(() => [
    { value: '', label: 'Sin edificio' },
    ...this.buildings().map((b) => ({ value: b.id, label: b.name })),
  ]);
  protected readonly templateOptions = computed(() => [
    { value: '', label: this.initial() ? 'Sin checklist' : 'La plantilla por defecto' },
    ...this.templates().map((t) => ({ value: t.id, label: t.name + (t.is_default ? ' (por defecto)' : '') })),
  ]);

  protected readonly typeLabel = computed(() => TYPE_LABEL[this.type() as PropertyType]);
  protected readonly buildingName = computed(() => this.buildings().find((b) => b.id === this.building())?.name ?? null);
  protected readonly preview = computed(() => {
    const b = this.buildings().find((x) => x.id === this.building());
    return {
      code: this.code() || 'NUEVA',
      type: this.type() as PropertyType,
      zone: this.zone() || b?.zone || null,
      building_name: b?.name ?? null,
      cover_url: this.initial()?.cover_url ?? null,
    };
  });

  protected readonly codeError = computed(() => {
    const server = this.serverError()?.field('code');
    if (server && !this.dismissed()) return server;
    if (!this.touched()['code']) return null;
    const v = this.code().trim().toUpperCase();
    if (!v) return 'Escribe un código corto.';
    return CODE_RE.test(v) ? null : 'Usa de 2 a 32 letras, números o guiones (ej. TB-905).';
  });

  protected readonly nameError = computed(() => {
    const server = this.serverError()?.field('name');
    if (server) return server;
    if (!this.touched()['name']) return null;
    return this.name().trim().length >= 2 ? null : 'Escribe el nombre con el que el equipo la reconoce.';
  });

  protected readonly coordsError = computed(() => {
    const server = this.serverError()?.field('lat');
    if (server) return server;
    if (!this.touched()['coords'] || !this.coords().trim()) return null;
    return parseCoords(this.coords()) ? null : 'Escribe latitud y longitud, p. ej. 14.5986, -90.5094.';
  });

  /** Errores del servidor que no son de un campo visible. */
  protected readonly generalError = computed(() => {
    const e = this.serverError();
    if (!e || e.field('code') || e.field('name') || e.field('lat')) return null;
    return e.errors[0]?.message ?? e.detail;
  });

  protected touch(field: string): void {
    this.touched.update((t) => ({ ...t, [field]: true }));
  }

  protected numError(v: string): string | null {
    if (!v) return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= 99 ? null : 'De 0 a 99';
  }

  protected submit(e: Event): void {
    e.preventDefault();
    for (const f of ['code', 'name', 'coords']) this.touch(f);
    const bad =
      this.codeError() || this.nameError() || this.coordsError() ||
      this.numError(this.bedrooms()) || this.numError(this.bathrooms()) || this.numError(this.guests());
    if (bad) {
      document.querySelector<HTMLElement>('app-property-form [aria-invalid="true"]')?.focus();
      return;
    }
    const num = (v: string) => (v === '' ? null : Number(v));
    const text = (v: string) => v.trim() || null;
    const at = parseCoords(this.coords());
    const draft: PropertyDraft = {
      code: this.code().trim().toUpperCase(),
      name: this.name().trim(),
      type: this.type() as PropertyType,
      building_id: this.building() || null,
      zone: text(this.zone()),
      address: text(this.address()),
      lat: at?.lat ?? null,
      lng: at?.lng ?? null,
      bedrooms: num(this.bedrooms()),
      bathrooms: num(this.bathrooms()),
      max_guests: num(this.guests()),
      checklist_template_id: this.template() || null,
      notes: text(this.notes()),
    };
    this.submitted.emit(this.initial() ? draft : { ...draft, access_info: text(this.access()) });
  }
}
