import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HrStore } from '../../store/hr.store';
import { FIELD_LABEL, LineField, PAY_TYPE_LABEL, PayrollLine, PeriodDetail } from '../../models/hr.model';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { gtq } from '../../../../shared/utils/time';

/**
 * Ficha de una línea de nómina (W-J3, panel lateral): la boleta en vista
 * previa con devengos y deducciones, cómo se calcularon Bono 14 o aguinaldo,
 * el historial de correcciones, la nota y la descarga del PDF.
 */
@Component({
  selector: 'app-line-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, AvatarComponent, BadgeComponent, ButtonComponent, IconComponent, FormFieldComponent],
  template: `
    @let l = line();
    <div class="px-6 pb-8 pt-7">
      <div class="flex items-center gap-3.5 pr-10">
        <app-avatar [initials]="l.full_name.slice(0, 1)" [name]="l.full_name" [size]="48" />
        <div class="min-w-0">
          <div class="text-[11px] uppercase tracking-[1.4px] text-secondary"><span class="font-mono">{{ l.employee_code }}</span> · {{ payType(l) }} · {{ money2(l.pay_rate) }}</div>
          <h2 class="truncate font-display text-[22px] font-semibold text-primary">{{ l.full_name }}</h2>
          <div class="text-[12.5px] text-text-secondary">{{ l.position }} · {{ l.on_payroll ? 'en planilla (IGSS)' : 'sin planilla' }}</div>
        </div>
      </div>

      <div class="slip mt-6 rounded-card border border-border-card bg-surface p-5">
        <div class="flex items-baseline justify-between border-b border-dashed border-border-field pb-3">
          <span class="text-[12px] font-bold uppercase tracking-[1px] text-primary">Boleta · vista previa</span>
          <span class="text-[11.5px] text-text-secondary">{{ period().name }}</span>
        </div>
        <p class="mt-2 text-[12px] text-text-secondary">{{ trim(l.days_worked) }} días · {{ trim(l.hours_worked) }} h@if (l.pay_type === 'per_cleaning') { · {{ l.cleanings_count }} limpiezas } · {{ l.attendance_source === 'schedule' ? 'según el horario semanal' : 'según los marcajes' }}</p>
        <dl class="mt-3 space-y-1.5 text-[13px]">
          @for (r of earnings(); track r.label) {
            <div class="flex justify-between gap-3"><dt class="text-text-body">{{ r.label }}</dt><dd class="tabular">{{ money2(r.value) }}</dd></div>
          }
          <div class="flex justify-between gap-3 border-t border-divider pt-1.5 font-bold text-primary"><dt>Total devengado</dt><dd class="tabular">{{ money2(l.gross_amount) }}</dd></div>
          @if (l.igss_employee) { <div class="flex justify-between gap-3 text-danger"><dt>IGSS laboral</dt><dd class="tabular">−{{ money2(l.igss_employee) }}</dd></div> }
          @if (l.other_deductions) { <div class="flex justify-between gap-3 text-danger"><dt>Otras deducciones</dt><dd class="tabular">−{{ money2(l.other_deductions) }}</dd></div> }
        </dl>
        <div class="mt-3 flex items-baseline justify-between border-t border-border-card pt-3">
          <span class="text-[13px] font-bold text-primary">Líquido a recibir</span>
          <span class="tabular font-display text-[24px] font-semibold text-primary">{{ money2(l.net_amount) }}</span>
        </div>
      </div>

      @if (store.canExport()) {
        <app-button class="mt-3 block" variant="tertiary" size="sm" [full]="true" [loading]="store.busy() === 'pdf:' + l.id" (pressed)="store.files.payslip(l.id)">
          <app-icon name="file" [size]="15" /> Descargar boleta (PDF)
        </app-button>
      }

      @for (b of l.bonus_detail; track b.kind) {
        <div class="mt-5 rounded-field bg-surface-soft px-4 py-3 text-[12.5px] text-text-body">
          <div class="font-bold text-primary">{{ b.kind === 'bonus14' ? 'Bono 14' : 'Aguinaldo' }}: {{ money2(b.amount) }}</div>
          Devengado del {{ asDate(b.window_start) | date: 'd MMM y' }} al {{ asDate(b.window_end) | date: 'd MMM y' }}: {{ money2(b.earnings) }} ÷ 12.
          {{ b.months_history }} {{ b.months_history === 1 ? 'mes' : 'meses' }} con nómina en ARGOS@if (b.months_estimated) { y {{ b.months_estimated }} estimados con el salario actual }.
        </div>
      }

      @if (editable()) {
        <app-form-field class="mt-5 block" label="Nota de la línea" for="lp-note" [optional]="true" hint="Sale en la boleta. Ej.: adelanto descontado.">
          <textarea id="lp-note" rows="2" class="field-native" maxlength="2000" [value]="note()" (input)="note.set($any($event.target).value)"></textarea>
        </app-form-field>
        @if (noteChanged()) {
          <div class="mt-2 flex justify-end"><app-button variant="secondary" size="sm" [loading]="store.busy() === 'note:' + l.id" (pressed)="saveNote()">Guardar nota</app-button></div>
        }
      } @else if (l.notes) {
        <p class="mt-5 rounded-field bg-surface-soft px-4 py-3 text-[12.5px] text-text-body"><b class="text-primary">Nota:</b> {{ l.notes }}</p>
      }

      @if (l.history.length) {
        <h3 class="mb-2 mt-6 text-[12px] font-bold uppercase tracking-[0.8px] text-text-secondary">Correcciones</h3>
        <ul class="space-y-2">
          @for (h of history(); track $index) {
            <li class="rounded-field border border-border-card bg-surface px-3.5 py-2.5 text-[12.5px]">
              <b class="text-primary">{{ label(h.field) }}</b>: {{ show(h.field, h.from) }} → {{ show(h.field, h.to) }}
              <div class="text-[11.5px] text-text-secondary">{{ h.actor_name }} · {{ h.at | date: 'd MMM, HH:mm' }}@if (h.note) { · {{ h.note }} }</div>
            </li>
          }
        </ul>
      } @else if (editable()) {
        <p class="mt-6 text-[12px] text-text-secondary"><app-badge size="sm" tone="neutral">Sin correcciones</app-badge> Corrige las celdas en la planilla; cada cambio queda aquí con quién y cuándo.</p>
      }
    </div>
  `,
})
export class LinePanelComponent {
  protected readonly store = inject(HrStore);
  readonly line = input.required<PayrollLine>();
  readonly period = input.required<PeriodDetail>();
  readonly editable = input<boolean>(false);

  protected readonly money2 = (v: number) => gtq(v, 2);
  protected readonly note = signal('');
  protected readonly noteChanged = computed(() => this.note().trim() !== (this.line().notes ?? ''));
  protected readonly history = computed(() => [...this.line().history].reverse());
  protected readonly earnings = computed(() => {
    const l = this.line();
    const rows = [
      { label: 'Salario base', value: l.base_amount, always: true },
      { label: 'Horas extra', value: l.overtime_amount },
      { label: 'Incentivos', value: l.incentives_amount },
      { label: 'Otros devengos', value: l.other_earnings },
      { label: 'Bonificación incentivo', value: l.incentive_bonus_amount },
      { label: 'Bono 14', value: l.bonus14_amount },
      { label: 'Aguinaldo', value: l.aguinaldo_amount },
    ];
    return rows.filter((r) => r.always || r.value);
  });

  constructor() {
    effect(() => {
      const n = this.line().notes ?? '';
      untracked(() => this.note.set(n));
    });
  }

  protected payType(l: PayrollLine): string {
    return PAY_TYPE_LABEL[l.pay_type];
  }
  protected label(f: string): string {
    return FIELD_LABEL[f as LineField] ?? f;
  }
  protected show(f: string, v: number): string {
    return ['days_worked', 'hours_worked', 'cleanings_count'].includes(f) ? this.trim(v) : gtq(v, 2);
  }
  protected trim(v: number): string {
    return v.toLocaleString('es-GT', { maximumFractionDigits: 2 });
  }
  protected asDate(k: string): Date {
    return new Date(`${k}T12:00:00`);
  }

  protected async saveNote(): Promise<void> {
    const l = this.line();
    await this.store.updateLine(l.period_id, l.id, { notes: this.note().trim() || null }, `note:${l.id}`);
  }
}
