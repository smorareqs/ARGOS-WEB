import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { ApiError } from '../../../../core/http/api-error';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { DocumentType, Employee, EmployeeDraft, PAY_TYPE_LABEL, PAY_UNIT, PayType } from '../../models/employee.model';

/**
 * Formulario de la ficha laboral (W-D2 · Laboral): puesto y fechas,
 * documentos (DPI, IGSS, NIT), esquema de pago con su tarifa, planilla y
 * contacto de emergencia. Los errores del servidor van junto a su campo.
 */
@Component({
  selector: 'app-employee-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormFieldComponent, SegmentedComponent, InputComponent, SelectComponent, CheckboxComponent, ButtonComponent],
  template: `
    <form novalidate class="flex flex-col gap-6" (submit)="submit($event)">
      <section class="rounded-card border border-border-card bg-surface p-5 shadow-e1">
        <h2 class="font-display text-[17px] font-semibold text-primary">Puesto</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <app-form-field label="Puesto" for="ef-pos" [required]="true" [error]="err('position')" class="lg:col-span-2">
            <app-input inputId="ef-pos" [compact]="true" placeholder="Colaboradora de limpieza" [invalid]="!!err('position')" [(value)]="position" />
          </app-form-field>
          <app-form-field label="Código" for="ef-code" [optional]="true" [error]="err('employee_code')" [hint]="initial() ? null : 'Vacío = EMP-0001…'">
            <app-input inputId="ef-code" [compact]="true" [mono]="true" [uppercase]="true" placeholder="EMP-0007" [(value)]="code" />
          </app-form-field>
          <div></div>
          <app-form-field label="Ingreso" for="ef-hire" [required]="true" [error]="err('hire_date')">
            <input id="ef-hire" type="date" class="field-native" [value]="hireDate()" (change)="hireDate.set($any($event.target).value)" />
          </app-form-field>
          <app-form-field label="Baja" for="ef-end" [optional]="true" [error]="err('termination_date')">
            <input id="ef-end" type="date" class="field-native" [min]="hireDate()" [value]="endDate()" (change)="endDate.set($any($event.target).value)" />
          </app-form-field>
        </div>
      </section>

      <section class="rounded-card border border-border-card bg-surface p-5 shadow-e1">
        <h2 class="font-display text-[17px] font-semibold text-primary">Documentos</h2>
        <p class="mt-1 text-[12.5px] text-text-body">Son datos personales: la bitácora dice que cambiaron, nunca su valor.</p>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <app-form-field label="Tipo" for="ef-doct" [error]="err('document_type')">
            <app-select selectId="ef-doct" [compact]="true" [options]="docTypes" [(value)]="docType" />
          </app-form-field>
          <app-form-field label="Número" for="ef-docn" [error]="err('document_number')" [hint]="docType() === 'dpi' ? '13 dígitos' : null">
            <app-input inputId="ef-docn" [compact]="true" [mono]="true" [placeholder]="docType() === 'dpi' ? '2547 89654 0101' : ''" [invalid]="!!err('document_number')" [(value)]="docNumber" />
          </app-form-field>
          <app-form-field label="Afiliación IGSS" for="ef-igss" [optional]="true">
            <app-input inputId="ef-igss" [compact]="true" [mono]="true" [(value)]="igss" />
          </app-form-field>
          <app-form-field label="NIT" for="ef-nit" [optional]="true" [error]="err('nit')">
            <app-input inputId="ef-nit" [compact]="true" [mono]="true" [uppercase]="true" placeholder="1234567-8 o CF" [invalid]="!!err('nit')" [(value)]="nit" />
          </app-form-field>
        </div>
      </section>

      <section class="rounded-card border border-border-card bg-surface p-5 shadow-e1">
        <h2 class="font-display text-[17px] font-semibold text-primary">Pago</h2>
        <div class="mt-4 flex flex-col gap-4">
          <app-form-field label="Esquema">
            <app-segmented [options]="payTypes" [(value)]="payType" ariaLabel="Esquema de pago" class="w-full" />
          </app-form-field>
          <div class="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-end">
            <app-form-field label="Tarifa" for="ef-rate" [required]="true" [error]="err('pay_rate') ?? rateError()" [hint]="'Quetzales ' + unit()">
              <app-input inputId="ef-rate" type="number" inputmode="decimal" [compact]="true" placeholder="165.00" [(value)]="rate" />
            </app-form-field>
            <app-checkbox [(checked)]="onPayroll">En planilla (IGSS y prestaciones)</app-checkbox>
          </div>
        </div>
      </section>

      <section class="rounded-card border border-border-card bg-surface p-5 shadow-e1">
        <h2 class="font-display text-[17px] font-semibold text-primary">Emergencias y notas</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-3">
          <app-form-field label="Contacto" for="ef-en" [optional]="true">
            <app-input inputId="ef-en" [compact]="true" placeholder="Rosa Ramos" [(value)]="emName" />
          </app-form-field>
          <app-form-field label="Teléfono" for="ef-ep" [optional]="true" [error]="err('emergency_phone')">
            <app-input inputId="ef-ep" type="tel" [compact]="true" placeholder="+502 5555 1234" [invalid]="!!err('emergency_phone')" [(value)]="emPhone" />
          </app-form-field>
          <app-form-field label="Relación" for="ef-er" [optional]="true">
            <app-input inputId="ef-er" [compact]="true" placeholder="Hermana" [(value)]="emRelation" />
          </app-form-field>
          <app-form-field label="Notas" for="ef-notes" [optional]="true" class="sm:col-span-3">
            <textarea id="ef-notes" rows="2" class="field-native" [value]="notes()" (input)="notes.set($any($event.target).value)"></textarea>
          </app-form-field>
        </div>
      </section>

      @if (generalError(); as e) {
        <p class="rounded-field bg-danger-soft px-4 py-3 text-[13px] text-danger" role="alert">{{ e }}</p>
      }
      <div class="flex justify-end gap-2">
        @if (initial()) {
          <app-button variant="tertiary" (pressed)="reset()">Deshacer cambios</app-button>
        }
        <app-button variant="primary" type="submit" [loading]="saving()">{{ initial() ? 'Guardar ficha' : 'Crear ficha laboral' }}</app-button>
      </div>
    </form>
  `,
  styles: `:host { display: block; }`,
})
export class EmployeeFormComponent {
  readonly initial = input<Employee | null>(null);
  readonly userId = input.required<string>();
  readonly saving = input<boolean>(false);
  readonly serverError = input<ApiError | null>(null);
  readonly submitted = output<EmployeeDraft>();

  protected readonly position = signal('');
  protected readonly code = signal('');
  protected readonly hireDate = signal(new Date().toISOString().slice(0, 10));
  protected readonly endDate = signal('');
  protected readonly docType = signal<string>('dpi');
  protected readonly docNumber = signal('');
  protected readonly igss = signal('');
  protected readonly nit = signal('');
  protected readonly payType = signal<string>('per_cleaning');
  protected readonly rate = signal('');
  protected readonly onPayroll = signal(false);
  protected readonly emName = signal('');
  protected readonly emPhone = signal('');
  protected readonly emRelation = signal('');
  protected readonly notes = signal('');
  private readonly tried = signal(false);

  protected readonly docTypes = [
    { value: '', label: 'Sin documento' },
    { value: 'dpi', label: 'DPI' },
    { value: 'passport', label: 'Pasaporte' },
  ];
  protected readonly payTypes = (Object.keys(PAY_TYPE_LABEL) as PayType[]).map((v) => ({ value: v, label: PAY_TYPE_LABEL[v] }));
  protected readonly unit = computed(() => PAY_UNIT[this.payType() as PayType]);

  protected readonly rateError = computed(() => {
    if (!this.tried()) return null;
    const n = Number(this.rate());
    return this.rate() !== '' && Number.isFinite(n) && n >= 0 ? null : 'Escribe la tarifa (0 o más).';
  });

  protected readonly generalError = computed(() => {
    const e = this.serverError();
    if (!e) return null;
    const known = ['position', 'employee_code', 'hire_date', 'termination_date', 'document_type', 'document_number', 'nit', 'pay_rate', 'emergency_phone'];
    return known.some((f) => e.field(f)) ? null : (e.errors[0]?.message ?? e.detail);
  });

  constructor() {
    effect(() => {
      this.initial();
      untracked(() => this.reset());
    });
  }

  protected err(field: string): string | null {
    return this.serverError()?.field(field) ?? null;
  }

  reset(): void {
    const e = this.initial();
    this.position.set(e?.position ?? '');
    this.code.set(e?.employee_code ?? '');
    this.hireDate.set(e?.hire_date ?? new Date().toISOString().slice(0, 10));
    this.endDate.set(e?.termination_date ?? '');
    this.docType.set(e ? (e.document_type ?? '') : 'dpi');
    this.docNumber.set(e?.document_number ?? '');
    this.igss.set(e?.igss_number ?? '');
    this.nit.set(e?.nit ?? '');
    this.payType.set(e?.pay_type ?? 'per_cleaning');
    this.rate.set(e ? String(e.pay_rate) : '');
    this.onPayroll.set(e?.on_payroll ?? false);
    this.emName.set(e?.emergency_name ?? '');
    this.emPhone.set(e?.emergency_phone ?? '');
    this.emRelation.set(e?.emergency_relation ?? '');
    this.notes.set(e?.notes ?? '');
  }

  protected submit(ev: Event): void {
    ev.preventDefault();
    this.tried.set(true);
    if (this.rateError()) return;
    const text = (v: string) => v.trim() || null;
    const number = text(this.docNumber());
    this.submitted.emit({
      user_id: this.initial() ? undefined : this.userId(),
      employee_code: text(this.code()),
      position: this.position().trim(),
      hire_date: this.hireDate(),
      termination_date: this.endDate() || null,
      document_type: number ? ((this.docType() || null) as DocumentType | null) : null,
      document_number: number,
      igss_number: text(this.igss()),
      nit: text(this.nit()),
      pay_type: this.payType() as PayType,
      pay_rate: Number(this.rate()),
      on_payroll: this.onPayroll(),
      emergency_name: text(this.emName()),
      emergency_phone: text(this.emPhone()),
      emergency_relation: text(this.emRelation()),
      notes: text(this.notes()),
    });
  }
}
