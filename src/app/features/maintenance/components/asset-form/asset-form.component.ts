import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { MaintenanceStore } from '../../store/maintenance.store';
import { ASSET_STATUS, Asset, AssetCategory, AssetDraft, AssetStatus, CATEGORIES, CATEGORY_META } from '../../models/maintenance.model';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';

/**
 * Alta y edición de un activo (W-G2). Es de una propiedad o del edificio
 * completo (elevador, cámaras, cisterna): el selector cambia la lista.
 */
@Component({
  selector: 'app-asset-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormSheetComponent, FormFieldComponent, SegmentedComponent, InputComponent, SelectComponent],
  template: `
    <app-form-sheet eyebrow="Mantenimiento" [title]="asset() ? 'Editar activo' : 'Nuevo activo'" subtitle="Con su proveedor y garantía; los preventivos se agregan en su ficha." spot="maintenance"
      [submitLabel]="asset() ? 'Guardar cambios' : 'Dar de alta'" [saving]="store.busy() === 'asset'" [error]="store.saveError()?.detail ?? null" (submitted)="submit()" (cancel)="cancel.emit()">
      <app-form-field label="Es de">
        <app-segmented [options]="ownerOptions" [(value)]="owner" [compact]="true" ariaLabel="Dueño del activo" />
      </app-form-field>
      @if (owner() === 'property') {
        <app-form-field label="Propiedad" [required]="true" [error]="err('property_id', !fProp() ? 'Elige la propiedad.' : null)">
          <app-select [compact]="true" placeholder="Elige una propiedad" [options]="propOptions()" [(value)]="fProp" ariaLabel="Propiedad" />
        </app-form-field>
      } @else {
        <app-form-field label="Edificio" [required]="true" [error]="err('building_id', !fBuilding() ? 'Elige el edificio.' : null)">
          <app-select [compact]="true" placeholder="Elige un edificio" [options]="buildingOptions()" [(value)]="fBuilding" ariaLabel="Edificio" />
        </app-form-field>
      }
      <div class="grid grid-cols-2 gap-3">
        <app-form-field label="Categoría" [required]="true">
          <app-select [compact]="true" [options]="categoryOptions" [(value)]="fCategory" ariaLabel="Categoría" />
        </app-form-field>
        <app-form-field label="Estado">
          <app-select [compact]="true" [options]="statusOptions" [(value)]="fStatus" ariaLabel="Estado" />
        </app-form-field>
      </div>
      <app-form-field label="Nombre" for="af-name" [required]="true" [error]="err('name', fName().trim().length < 2 ? 'Ponle un nombre que se reconozca.' : null)">
        <app-input inputId="af-name" [compact]="true" [maxlength]="128" placeholder="Ej.: A/C de la sala, Elevador A" [(value)]="fName" />
      </app-form-field>
      <div class="grid grid-cols-2 gap-3">
        <app-form-field label="Marca" for="af-brand" [optional]="true"><app-input inputId="af-brand" [compact]="true" [(value)]="fBrand" /></app-form-field>
        <app-form-field label="Modelo" for="af-model" [optional]="true"><app-input inputId="af-model" [compact]="true" [(value)]="fModel" /></app-form-field>
        <app-form-field label="Serie" for="af-serial" [optional]="true"><app-input inputId="af-serial" [compact]="true" [mono]="true" [(value)]="fSerial" /></app-form-field>
        <app-form-field label="Ubicación" for="af-loc" [optional]="true"><app-input inputId="af-loc" [compact]="true" placeholder="Cocina, azotea…" [(value)]="fLocation" /></app-form-field>
        <app-form-field label="Instalado" for="af-inst" [optional]="true">
          <input id="af-inst" type="date" class="field-native" [value]="fInstalled()" (input)="fInstalled.set($any($event.target).value)" />
        </app-form-field>
        <app-form-field label="Garantía hasta" for="af-war" [optional]="true" [error]="err('warranty_until', fWarranty() && fInstalled() && fWarranty() < fInstalled() ? 'Termina antes de la instalación.' : null)">
          <input id="af-war" type="date" class="field-native" [value]="fWarranty()" (input)="fWarranty.set($any($event.target).value)" />
        </app-form-field>
      </div>
      <app-form-field label="Proveedor" [optional]="true" hint="Quien le da servicio; los preventivos nuevos lo usan por defecto.">
        <app-select [compact]="true" [options]="vendorOptions()" [(value)]="fVendor" ariaLabel="Proveedor" />
      </app-form-field>
      <app-form-field label="Notas" for="af-notes" [optional]="true">
        <textarea id="af-notes" rows="2" class="field-native" maxlength="2000" [value]="fNotes()" (input)="fNotes.set($any($event.target).value)"></textarea>
      </app-form-field>
    </app-form-sheet>
  `,
})
export class AssetFormComponent {
  protected readonly store = inject(MaintenanceStore);

  readonly asset = input<Asset | null>(null);
  readonly cancel = output<void>();
  readonly saved = output<Asset>();

  protected readonly tried = signal(false);
  protected readonly owner = signal('property');
  protected readonly fProp = signal('');
  protected readonly fBuilding = signal('');
  protected readonly fCategory = signal<string>('hvac');
  protected readonly fStatus = signal<string>('operational');
  protected readonly fName = signal('');
  protected readonly fBrand = signal('');
  protected readonly fModel = signal('');
  protected readonly fSerial = signal('');
  protected readonly fLocation = signal('');
  protected readonly fInstalled = signal('');
  protected readonly fWarranty = signal('');
  protected readonly fVendor = signal('');
  protected readonly fNotes = signal('');

  protected readonly ownerOptions = [
    { value: 'property', label: 'Una propiedad' },
    { value: 'building', label: 'Un edificio' },
  ];
  protected readonly categoryOptions = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label }));
  protected readonly statusOptions = (Object.keys(ASSET_STATUS) as AssetStatus[]).map((s) => ({ value: s, label: ASSET_STATUS[s].label }));

  protected readonly propOptions = computed(() => this.store.properties().map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })));
  protected readonly buildingOptions = computed(() => this.store.buildings().map((b) => ({ value: b.id, label: b.name })));
  protected readonly vendorOptions = computed(() => [
    { value: '', label: 'Sin proveedor' },
    ...this.store.activeVendors().map((v) => ({ value: v.id, label: v.service_type ? `${v.name} · ${v.service_type}` : v.name })),
  ]);

  constructor() {
    this.store.clearSaveError();
    queueMicrotask(() => this.fill());
  }

  private fill(): void {
    const a = this.asset();
    if (!a) return;
    this.owner.set(a.property_id ? 'property' : 'building');
    this.fProp.set(a.property_id ?? '');
    this.fBuilding.set(a.property_id ? '' : (a.building_id ?? ''));
    this.fCategory.set(a.category);
    this.fStatus.set(a.status);
    this.fName.set(a.name);
    this.fBrand.set(a.brand ?? '');
    this.fModel.set(a.model ?? '');
    this.fSerial.set(a.serial ?? '');
    this.fLocation.set(a.location ?? '');
    this.fInstalled.set(a.installed_at ?? '');
    this.fWarranty.set(a.warranty_until ?? '');
    this.fVendor.set(a.vendor_id ?? '');
    this.fNotes.set(a.notes ?? '');
  }

  /** Error local tras intentar guardar, o el del servidor para ese campo. */
  protected err(field: string, local: string | null): string | null {
    return (this.tried() ? local : null) ?? this.store.saveError()?.field(field) ?? null;
  }

  protected async submit(): Promise<void> {
    this.tried.set(true);
    const place = this.owner() === 'property' ? this.fProp() : this.fBuilding();
    if (!place || this.fName().trim().length < 2 || (this.fWarranty() && this.fInstalled() && this.fWarranty() < this.fInstalled())) return;
    const txt = (v: string) => v.trim() || null;
    const d: AssetDraft = {
      property_id: this.owner() === 'property' ? place : null,
      building_id: this.owner() === 'building' ? place : null,
      category: this.fCategory() as AssetCategory, name: this.fName().trim(), brand: txt(this.fBrand()), model: txt(this.fModel()),
      serial: txt(this.fSerial()), location: txt(this.fLocation()), installed_at: this.fInstalled() || null,
      warranty_until: this.fWarranty() || null, vendor_id: this.fVendor() || null, status: this.fStatus() as AssetStatus, notes: txt(this.fNotes()),
    };
    const saved = await this.store.saveAsset(this.asset()?.id ?? null, d);
    if (saved) this.saved.emit(saved);
  }
}
