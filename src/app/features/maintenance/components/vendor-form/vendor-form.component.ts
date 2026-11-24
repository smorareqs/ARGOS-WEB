import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { MaintenanceStore } from '../../store/maintenance.store';
import { Vendor, VendorDraft } from '../../models/maintenance.model';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';

/** Alta y edición de un proveedor (W-G4). */
@Component({
  selector: 'app-vendor-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormSheetComponent, FormFieldComponent, InputComponent],
  template: `
    <app-form-sheet eyebrow="Proveedores" [title]="vendor() ? 'Editar proveedor' : 'Nuevo proveedor'" subtitle="Podrás asignarle incidencias y preventivos." spot="maintenance"
      [submitLabel]="vendor() ? 'Guardar cambios' : 'Dar de alta'" [saving]="store.busy() === 'vendor'" [error]="formError()" (submitted)="submit()" (cancel)="cancel.emit()">
      <app-form-field label="Nombre" for="vf-name" [required]="true" [error]="nameError()">
        <app-input inputId="vf-name" [compact]="true" [maxlength]="128" placeholder="Ej.: Fríos del Sur" [(value)]="fName" />
      </app-form-field>
      <app-form-field label="Especialidad" for="vf-type" [optional]="true">
        <app-input inputId="vf-type" [compact]="true" [maxlength]="64" placeholder="Aire acondicionado, elevadores, plomería…" [(value)]="fType" />
      </app-form-field>
      <div class="grid grid-cols-2 gap-3">
        <app-form-field label="Contacto" for="vf-contact" [optional]="true"><app-input inputId="vf-contact" [compact]="true" [(value)]="fContact" /></app-form-field>
        <app-form-field label="Teléfono" for="vf-phone" [optional]="true"><app-input inputId="vf-phone" type="tel" [compact]="true" placeholder="+502" [(value)]="fPhone" /></app-form-field>
      </div>
      <app-form-field label="Correo" for="vf-mail" [optional]="true" [error]="store.saveError()?.field('email') ?? null">
        <app-input inputId="vf-mail" type="email" [compact]="true" [(value)]="fEmail" />
      </app-form-field>
      <app-form-field label="Notas" for="vf-notes" [optional]="true">
        <textarea id="vf-notes" rows="2" class="field-native" maxlength="2000" placeholder="Horario, condiciones, número de contrato" [value]="fNotes()" (input)="fNotes.set($any($event.target).value)"></textarea>
      </app-form-field>
    </app-form-sheet>
  `,
})
export class VendorFormComponent {
  protected readonly store = inject(MaintenanceStore);
  readonly vendor = input<Vendor | null>(null);
  readonly cancel = output<void>();
  readonly saved = output<Vendor>();

  protected readonly tried = signal(false);
  protected readonly fName = signal('');
  protected readonly fType = signal('');
  protected readonly fContact = signal('');
  protected readonly fPhone = signal('');
  protected readonly fEmail = signal('');
  protected readonly fNotes = signal('');

  constructor() {
    this.store.clearSaveError();
    queueMicrotask(() => {
      const v = this.vendor();
      if (!v) return;
      this.fName.set(v.name);
      this.fType.set(v.service_type ?? '');
      this.fContact.set(v.contact_name ?? '');
      this.fPhone.set(v.phone ?? '');
      this.fEmail.set(v.email ?? '');
      this.fNotes.set(v.notes ?? '');
    });
  }

  protected nameError(): string | null {
    if (this.tried() && this.fName().trim().length < 2) return 'Escribe el nombre del proveedor.';
    return this.store.saveError()?.field('name') ?? null;
  }

  protected formError(): string | null {
    const e = this.store.saveError();
    return e && !e.field('name') && !e.field('email') ? e.detail : null;
  }

  protected async submit(): Promise<void> {
    this.tried.set(true);
    if (this.fName().trim().length < 2) return;
    const txt = (v: string) => v.trim() || null;
    const d: VendorDraft = {
      name: this.fName().trim(), service_type: txt(this.fType()), contact_name: txt(this.fContact()),
      phone: txt(this.fPhone()), email: txt(this.fEmail()), notes: txt(this.fNotes()),
    };
    const saved = await this.store.saveVendor(this.vendor()?.id ?? null, d);
    if (saved) this.saved.emit(saved);
  }
}
