import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { ApiError } from '../../../../core/http/api-error';
import { ArchCoverComponent } from '../../../../shared/molecules/arch-cover/arch-cover.component';
import { ArchKind } from '../../../../shared/molecules/arch-cover/arch-scene';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { Building, PropertyDraft, PropertyType, TYPE_LABEL } from '../../models/property.model';

const CODE_RE = /^[A-Z0-9-]{2,12}$/;

/**
 * Formulario "Nueva propiedad" en drawer (ux-ui.md §3.3): etiquetas visibles,
 * validación al salir del campo, errores del servidor junto a su campo y una
 * vista previa en vivo de cómo se verá la tarjeta.
 */
@Component({
  selector: 'app-property-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ArchCoverComponent,
    SegmentedComponent,
    FormFieldComponent,
    InputComponent,
    SelectComponent,
    ButtonComponent,
    IconComponent,
  ],
  template: `
    <form novalidate class="flex min-h-full flex-col" (submit)="submit($event)">
      <div class="px-6 pb-2 pt-7">
        <div class="text-[11px] uppercase tracking-[1.6px] text-secondary">Propiedades</div>
        <h2 class="mt-1 font-display text-[30px] font-semibold leading-tight tracking-display text-primary">Nueva propiedad</h2>
        <p class="mt-1 text-[13px] text-text-body">Después podrás completar acceso, checklist y asignados en su ficha.</p>
      </div>

      <!-- Vista previa en vivo -->
      <div class="mx-6 mt-4 flex items-center gap-3.5 rounded-tile border border-border-card bg-surface p-2.5 shadow-e1">
        <div class="h-[74px] w-[98px] shrink-0 overflow-hidden rounded-sm">
          <app-arch-cover [seed]="code() || 'NUEVA'" [kind]="kind()" [setting]="setting()" />
        </div>
        <div class="min-w-0">
          <div class="font-mono text-[11px] font-bold tracking-wide text-teal-muted">{{ code() || 'CÓDIGO' }}</div>
          <div class="truncate font-display text-[18px] font-semibold text-primary">{{ name() || 'Nombre de la propiedad' }}</div>
          <div class="truncate text-[11.5px] text-text-secondary">{{ typeLabel() }} · {{ buildingName() }}</div>
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
              [maxlength]="12"
              placeholder="TB-905"
              [invalid]="!!codeError()"
              [value]="code()"
              (valueChange)="code.set($event); serverCodeErrorDismissed.set(true)"
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

        <app-form-field label="Dirección" for="pf-address" [optional]="true">
          <app-input inputId="pf-address" icon="map-pin" [compact]="true" placeholder="5a avenida 12-30, zona 10" [(value)]="address" />
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

        @if (serverError() && !serverError()!.field('code')) {
          <p class="flex items-start gap-2 rounded-sm bg-danger-soft px-3.5 py-2.5 text-[12.5px] text-danger" role="alert">
            <app-icon name="alert" [size]="15" class="mt-px" /> {{ serverError()!.detail }}
          </p>
        }
      </div>

      <div class="material-glass sticky bottom-0 flex justify-end gap-2.5 border-t border-divider px-6 py-4">
        <app-button variant="tertiary" (pressed)="cancel.emit()">Cancelar</app-button>
        <app-button variant="primary" type="submit" [loading]="saving()">
          {{ saving() ? 'Creando…' : 'Crear propiedad' }}
        </app-button>
      </div>
    </form>
  `,
  styles: `:host { display: block; min-height: 100%; }`,
})
export class PropertyFormComponent {
  readonly buildings = input.required<readonly Building[]>();
  readonly saving = input<boolean>(false);
  readonly serverError = input<ApiError | null>(null);

  readonly submitted = output<PropertyDraft>();
  readonly cancel = output<void>();

  protected readonly code = signal('');
  protected readonly name = signal('');
  protected readonly type = signal<string>('apartment');
  protected readonly building = signal('');
  protected readonly address = signal('');
  protected readonly bedrooms = signal('');
  protected readonly bathrooms = signal('');
  protected readonly guests = signal('');
  protected readonly serverCodeErrorDismissed = signal(false);
  private readonly touched = signal<Record<string, boolean>>({});

  constructor() {
    // Cada respuesta nueva del servidor vuelve a mostrar su error de campo.
    effect(() => {
      this.serverError();
      untracked(() => this.serverCodeErrorDismissed.set(false));
    });
  }

  protected readonly types = (Object.keys(TYPE_LABEL) as PropertyType[]).map((t) => ({
    value: t,
    label: TYPE_LABEL[t],
  }));

  protected readonly buildingOptions = computed(() => [
    { value: '', label: 'Sin edificio' },
    ...this.buildings().map((b) => ({ value: b.id, label: b.name })),
  ]);

  protected readonly typeLabel = computed(() => TYPE_LABEL[this.type() as PropertyType]);
  protected readonly buildingName = computed(
    () => this.buildings().find((b) => b.id === this.building())?.name ?? 'Sin edificio',
  );
  protected readonly kind = computed<ArchKind>(() =>
    this.type() === 'apartment' ? 'tower' : this.type() === 'room' ? 'hotel' : 'house',
  );
  protected readonly setting = computed(
    () => this.buildings().find((b) => b.id === this.building())?.setting ?? (this.type() === 'house' ? 'colonial' : 'city'),
  );

  protected readonly codeError = computed(() => {
    const server = this.serverError()?.field('code');
    if (server && !this.serverCodeErrorDismissed()) return server;
    if (!this.touched()['code']) return null;
    const v = this.code().trim();
    if (!v) return 'Escribe un código corto.';
    return CODE_RE.test(v) ? null : 'Usa de 2 a 12 letras, números o guiones (ej. TB-905).';
  });

  protected readonly nameError = computed(() => {
    if (!this.touched()['name']) return null;
    const v = this.name().trim();
    return v.length >= 3 ? null : 'Escribe el nombre con el que el equipo la reconoce.';
  });

  protected touch(field: string): void {
    this.touched.update((t) => ({ ...t, [field]: true }));
  }

  protected numError(v: string): string | null {
    if (!v) return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= 50 ? null : 'De 0 a 50';
  }

  protected submit(e: Event): void {
    e.preventDefault();
    this.touch('code');
    this.touch('name');
    const bad =
      this.codeError() ||
      this.nameError() ||
      this.numError(this.bedrooms()) ||
      this.numError(this.bathrooms()) ||
      this.numError(this.guests());
    if (bad) {
      const firstInvalid = document.querySelector<HTMLElement>('app-property-form [aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }
    const num = (v: string) => (v === '' ? null : Number(v));
    this.submitted.emit({
      code: this.code().trim().toUpperCase(),
      name: this.name().trim(),
      type: this.type() as PropertyType,
      building_id: this.building() || null,
      address: this.address().trim() || null,
      bedrooms: num(this.bedrooms()),
      bathrooms: num(this.bathrooms()),
      max_guests: num(this.guests()),
    });
  }
}
