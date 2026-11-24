import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { MaintenanceStore } from '../../store/maintenance.store';
import { CATEGORY_META, Plan, PlanDraft, placeOf } from '../../models/maintenance.model';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { dayKey } from '../../../../shared/utils/time';

const PRESETS: readonly [number, string][] = [[7, 'Semanal'], [30, 'Mensual'], [90, 'Trimestral'], [180, 'Semestral'], [365, 'Anual']];

/**
 * Nuevo preventivo o editarlo (W-G3): cada cuánto, cuándo toca, con cuánta
 * anticipación se crea su incidencia, quién lo hace o qué proveedor.
 */
@Component({
  selector: 'app-plan-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormSheetComponent, FormFieldComponent, InputComponent, SelectComponent, CheckboxComponent],
  template: `
    <app-form-sheet eyebrow="Preventivos" [title]="plan() ? 'Editar preventivo' : 'Nuevo preventivo'" subtitle="Su incidencia se crea sola cuando entra en la anticipación." spot="maintenance"
      [submitLabel]="plan() ? 'Guardar cambios' : 'Crear preventivo'" [saving]="store.busy() === 'plan'" [error]="store.saveError()?.detail ?? null" (submitted)="submit()" (cancel)="cancel.emit()">
      @if (!plan()) {
        <app-form-field label="Activo" [required]="true" [error]="tried() && !fAsset() ? 'Elige el activo.' : null">
          <app-select [compact]="true" placeholder="Elige un activo" [options]="assetOptions()" [(value)]="fAsset" ariaLabel="Activo" />
        </app-form-field>
      }
      <app-form-field label="Qué se hace" for="pf-name" [required]="true" [error]="tried() && fName().trim().length < 2 ? 'Ponle un nombre.' : null">
        <app-input inputId="pf-name" [compact]="true" [maxlength]="128" placeholder="Ej.: Limpieza de filtros" [(value)]="fName" />
      </app-form-field>
      <fieldset>
        <legend class="mb-1.5 text-[12.5px] font-bold text-primary">Cada cuánto</legend>
        <div class="flex flex-wrap gap-2">
          @for (p of presets; track p[0]) {
            <button type="button" class="pill h-8 rounded-pill px-3 text-[12px] font-bold" [attr.aria-pressed]="fFreq() === p[0]" (click)="fFreq.set(p[0])">{{ p[1] }}</button>
          }
          <label class="flex items-center gap-1.5 text-[12px] text-text-secondary">
            <input type="number" min="1" max="3650" class="field-native tabular !h-8 w-[78px]" [value]="fFreq()" (input)="fFreq.set(+$any($event.target).value)" aria-label="Días entre cada uno" /> días
          </label>
        </div>
      </fieldset>
      <div class="grid grid-cols-2 gap-3">
        <app-form-field label="Toca el" for="pf-next" [required]="true" [error]="tried() && !fNext() ? 'Elige la fecha.' : null">
          <input id="pf-next" type="date" class="field-native" [value]="fNext()" (input)="fNext.set($any($event.target).value)" />
        </app-form-field>
        <app-form-field label="Avisar con" for="pf-lead" hint="Días antes: ese día se crea la incidencia.">
          <input id="pf-lead" type="number" min="0" max="365" class="field-native tabular" [value]="fLead()" (input)="fLead.set(+$any($event.target).value)" />
        </app-form-field>
      </div>
      <app-form-field label="Responsable" [optional]="true" hint="Le llega asignada (y su tarea en la app).">
        <app-select [compact]="true" [options]="peopleOptions()" [(value)]="fResponsible" ariaLabel="Responsable" />
      </app-form-field>
      <app-form-field label="Proveedor" [optional]="true">
        <app-select [compact]="true" [options]="vendorOptions()" [(value)]="fVendor" ariaLabel="Proveedor" />
      </app-form-field>
      @if (plan()) {
        <app-checkbox [(checked)]="fActive">Activo (si lo pausas, deja de crear incidencias)</app-checkbox>
      }
    </app-form-sheet>
  `,
  styles: `
    .pill { border: 1px solid var(--color-border-field); color: var(--color-text-body); background: var(--color-surface); }
    .pill[aria-pressed='true'] { border-color: var(--color-primary); background: var(--color-primary); color: #fff; }
  `,
})
export class PlanFormComponent {
  protected readonly store = inject(MaintenanceStore);

  readonly plan = input<Plan | null>(null);
  readonly assetId = input<string | null>(null);
  readonly cancel = output<void>();
  readonly saved = output<Plan>();

  protected readonly presets = PRESETS;
  protected readonly tried = signal(false);
  protected readonly fAsset = signal('');
  protected readonly fName = signal('');
  protected readonly fFreq = signal(30);
  protected readonly fNext = signal(dayKey(30));
  protected readonly fLead = signal(7);
  protected readonly fResponsible = signal('');
  protected readonly fVendor = signal('');
  protected readonly fActive = signal(true);

  protected readonly assetOptions = computed(() =>
    this.store.assets().filter((a) => a.is_active).map((a) => ({ value: a.id, label: `${a.name} · ${placeOf(a)} · ${CATEGORY_META[a.category].label}` })),
  );
  protected readonly peopleOptions = computed(() => [
    { value: '', label: 'Nadie en particular' },
    ...this.store.assignables().map((a) => ({ value: a.user_id, label: `${a.full_name} · ${a.role_name}` })),
  ]);
  protected readonly vendorOptions = computed(() => [
    { value: '', label: 'El del activo (o ninguno)' },
    ...this.store.activeVendors().map((v) => ({ value: v.id, label: v.name })),
  ]);

  constructor() {
    this.store.clearSaveError();
    queueMicrotask(() => {
      if (this.assetId()) this.fAsset.set(this.assetId()!);
      const p = this.plan();
      if (!p) return;
      this.fAsset.set(p.asset_id);
      this.fName.set(p.name);
      this.fFreq.set(p.frequency_days);
      this.fNext.set(p.next_due_at);
      this.fLead.set(p.lead_days);
      this.fResponsible.set(p.responsible_user_id ?? '');
      this.fVendor.set(p.vendor_id ?? '');
      this.fActive.set(p.is_active);
    });
  }

  protected async submit(): Promise<void> {
    this.tried.set(true);
    if (!this.fAsset() || this.fName().trim().length < 2 || !this.fNext() || !(this.fFreq() >= 1)) return;
    const d: PlanDraft & { is_active?: boolean } = {
      name: this.fName().trim(), frequency_days: this.fFreq(), next_due_at: this.fNext(), lead_days: Math.max(0, this.fLead() || 0),
      responsible_user_id: this.fResponsible() || null, vendor_id: this.fVendor() || null,
      ...(this.plan() ? { is_active: this.fActive() } : {}),
    };
    const saved = await this.store.savePlan(this.fAsset(), this.plan()?.id ?? null, d);
    if (saved) this.saved.emit(saved);
  }
}
