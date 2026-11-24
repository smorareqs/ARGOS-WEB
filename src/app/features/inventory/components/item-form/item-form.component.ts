import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ApiError } from '../../../../core/http/api-error';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { CATEGORY_LABEL, ItemCategory, ItemDraft } from '../../models/inventory.model';

/** Formulario "Nuevo artículo" (W-F1). */
@Component({
  selector: 'app-item-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormSheetComponent, FormFieldComponent, InputComponent, SelectComponent],
  template: `
    <app-form-sheet eyebrow="Inventario" title="Nuevo artículo" subtitle="El mínimo dispara la alerta de reposición." spot="inventory" submitLabel="Crear artículo" [saving]="saving()" (submitted)="submit()" (cancel)="cancel.emit()">
      <div class="grid grid-cols-[130px_1fr] gap-3">
        <app-form-field label="SKU" for="if-sku" [required]="true" [error]="skuError()">
          <app-input inputId="if-sku" [compact]="true" [mono]="true" [uppercase]="true" [maxlength]="12" placeholder="AM-ACO" [invalid]="!!skuError()" [(value)]="sku" />
        </app-form-field>
        <app-form-field label="Nombre" for="if-name" [required]="true" [error]="tried() && !name().trim() ? 'Escribe el nombre.' : null">
          <app-input inputId="if-name" [compact]="true" placeholder="Acondicionador 30 ml" [(value)]="name" />
        </app-form-field>
      </div>
      <app-form-field label="Categoría" [required]="true">
        <app-select [compact]="true" [options]="categories" [(value)]="category" ariaLabel="Categoría" />
      </app-form-field>
      <div class="grid grid-cols-2 gap-3">
        <app-form-field label="Unidad" for="if-unit" [required]="true">
          <app-input inputId="if-unit" [compact]="true" placeholder="unidades" [(value)]="unit" />
        </app-form-field>
        <app-form-field label="Mínimo" for="if-min" [required]="true" hint="0 = sin alerta">
          <input id="if-min" type="number" min="0" class="field-native tabular" [value]="min()" (input)="min.set($any($event.target).value)" />
        </app-form-field>
      </div>
    </app-form-sheet>
  `,
})
export class ItemFormComponent {
  readonly saving = input<boolean>(false);
  readonly serverError = input<ApiError | null>(null);
  readonly submitted = output<ItemDraft>();
  readonly cancel = output<void>();

  protected readonly categories = (Object.keys(CATEGORY_LABEL) as ItemCategory[]).map((c) => ({ value: c, label: CATEGORY_LABEL[c] }));
  protected readonly sku = signal('');
  protected readonly name = signal('');
  protected readonly category = signal<string>('amenities');
  protected readonly unit = signal('unidades');
  protected readonly min = signal('10');
  protected readonly tried = signal(false);
  protected readonly skuError = computed(() => {
    const s = this.serverError()?.errors.find((e) => e.location === 'body.sku')?.message;
    if (s) return s;
    return this.tried() && !/^[A-Z0-9-]{2,12}$/.test(this.sku().trim().toUpperCase()) ? 'De 2 a 12 letras, números o guiones.' : null;
  });

  protected submit(): void {
    this.tried.set(true);
    if (this.skuError() || !this.name().trim()) return;
    this.submitted.emit({ sku: this.sku(), name: this.name(), category: this.category() as ItemCategory, unit: this.unit(), min: Math.max(0, Number(this.min()) || 0) });
  }
}
