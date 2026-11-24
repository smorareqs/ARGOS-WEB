import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { HrStore } from '../../store/hr.store';
import { PeriodKind, PayrollPeriod, nextRange } from '../../models/hr.model';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { dayKey } from '../../../../shared/utils/time';

/** Nuevo período de nómina (W-J2): quincena o mes, con fechas sugeridas. */
@Component({
  selector: 'app-period-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormSheetComponent, FormFieldComponent, SegmentedComponent],
  template: `
    <app-form-sheet eyebrow="Nómina" title="Nuevo período" subtitle="Queda en borrador. Calcúlalo cuando termine la quincena o el mes." spot="payroll"
      submitLabel="Crear período" [saving]="store.busy() === 'period'" [error]="generalError()" (submitted)="save()" (cancel)="cancel.emit()">
      <fieldset>
        <legend class="mb-1.5 text-[12.5px] font-bold text-primary">Tipo</legend>
        <app-segmented [options]="kinds" [value]="kind()" (valueChange)="setKind($any($event))" ariaLabel="Tipo de período" />
      </fieldset>
      <div class="grid grid-cols-2 gap-3">
        <app-form-field label="Desde" for="pf-start" [required]="true" [error]="fieldError('body.period_start')">
          <input id="pf-start" type="date" class="field-native" [value]="start()" (input)="start.set($any($event.target).value)" />
        </app-form-field>
        <app-form-field label="Hasta" for="pf-end" [required]="true" [error]="end() < start() ? 'Debe ser igual o después del inicio.' : fieldError('body.period_end')">
          <input id="pf-end" type="date" class="field-native" [min]="start()" [value]="end()" (input)="end.set($any($event.target).value)" />
        </app-form-field>
      </div>
      <app-form-field label="Nombre" for="pf-name" [optional]="true" hint="Si lo dejas vacío: “Quincena 16–30 nov 2026”.">
        <input id="pf-name" class="field-native" maxlength="64" [value]="name()" (input)="name.set($any($event.target).value)" />
      </app-form-field>
    </app-form-sheet>
  `,
})
export class PeriodFormComponent implements OnInit {
  protected readonly store = inject(HrStore);
  readonly saved = output<PayrollPeriod>();
  readonly cancel = output<void>();

  protected readonly kinds = [{ value: 'biweekly', label: 'Quincena' }, { value: 'monthly', label: 'Mes' }];
  protected readonly kind = signal<PeriodKind>('biweekly');
  protected readonly start = signal('');
  protected readonly end = signal('');
  protected readonly name = signal('');
  protected readonly generalError = computed(() => {
    const e = this.store.saveError();
    return e && !e.errors.length ? e.detail : null;
  });

  ngOnInit(): void {
    this.store.clearSaveError();
    this.setKind('biweekly');
  }

  protected setKind(k: PeriodKind): void {
    this.kind.set(k);
    const last = (this.store.periods() ?? []).filter((p) => p.kind === k).sort((a, b) => b.period_end.localeCompare(a.period_end))[0];
    const r = nextRange(k, last, dayKey());
    this.start.set(r.start);
    this.end.set(r.end);
  }

  protected fieldError(loc: string): string | null {
    return this.store.saveError()?.errors.find((e) => e.location === loc)?.message ?? null;
  }

  protected async save(): Promise<void> {
    if (!this.start() || this.end() < this.start()) return;
    const p = await this.store.createPeriod({ kind: this.kind(), period_start: this.start(), period_end: this.end(), ...(this.name().trim() ? { name: this.name().trim() } : {}) });
    if (p) this.saved.emit(p);
  }
}
