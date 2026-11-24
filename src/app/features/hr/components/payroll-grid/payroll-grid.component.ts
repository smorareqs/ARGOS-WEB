import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { LineField, PayrollLine, PayrollTotals, PeriodDetail } from '../../models/hr.model';

export interface LineEdit {
  readonly line: PayrollLine;
  readonly field: LineField;
  readonly value: number;
}

interface Col {
  readonly key: keyof PayrollLine;
  readonly total: keyof PayrollTotals;
  readonly label: string;
  readonly money: boolean;
  readonly edit?: LineField;
  readonly minus?: boolean;
  readonly strong?: boolean;
  /** Solo se muestra si algún colaborador tiene monto. */
  readonly optional?: boolean;
}

const COLS: readonly Col[] = [
  { key: 'days_worked', total: 'days', label: 'Días', money: false, edit: 'days_worked' },
  { key: 'hours_worked', total: 'hours', label: 'Horas', money: false, edit: 'hours_worked' },
  { key: 'cleanings_count', total: 'cleanings', label: 'Limpiezas', money: false, edit: 'cleanings_count' },
  { key: 'base_amount', total: 'base', label: 'Base', money: true },
  { key: 'overtime_amount', total: 'overtime', label: 'Extras', money: true, edit: 'overtime_amount' },
  { key: 'incentives_amount', total: 'incentives', label: 'Incentivos', money: true, edit: 'incentives_amount' },
  { key: 'other_earnings', total: 'other_earnings', label: 'Otros', money: true, edit: 'other_earnings' },
  { key: 'incentive_bonus_amount', total: 'incentive_bonus', label: 'Bonif.', money: true },
  { key: 'bonus14_amount', total: 'bonus14', label: 'Bono 14', money: true, edit: 'bonus14_amount', optional: true },
  { key: 'aguinaldo_amount', total: 'aguinaldo', label: 'Aguinaldo', money: true, edit: 'aguinaldo_amount', optional: true },
  { key: 'gross_amount', total: 'gross', label: 'Devengado', money: true, strong: true },
  { key: 'igss_employee', total: 'igss', label: 'IGSS', money: true, minus: true },
  { key: 'other_deductions', total: 'other_deductions', label: 'Deducc.', money: true, edit: 'other_deductions', minus: true },
  { key: 'net_amount', total: 'net', label: 'Líquido', money: true, strong: true },
];

/**
 * Componente · planilla de nómina (payroll-grid, W-J3): una fila por
 * colaborador, columnas numéricas a la derecha, totales fijos al pie y, en
 * revisión, celdas editables. Una celda corregida a mano lleva subrayado
 * punteado; el historial está en la ficha de la línea.
 */
@Component({
  selector: 'app-payroll-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent],
  template: `
    <div class="overflow-x-auto rounded-card border border-border-card bg-surface shadow-e1">
      <table class="w-full min-w-[1180px] border-collapse text-[12.5px]">
        <thead>
          <tr class="border-b border-divider">
            <th class="sticky left-0 z-[2] bg-surface px-4 py-3 text-left text-[10.5px] font-normal uppercase tracking-[1px] text-text-secondary">Colaborador</th>
            @for (c of cols(); track c.key) {
              <th class="whitespace-nowrap px-2.5 py-3 text-right text-[10.5px] font-normal uppercase tracking-[1px]" [class]="c.strong ? 'text-primary font-bold' : 'text-text-secondary'">{{ c.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (l of period().entries; track l.id) {
            <tr class="row border-b border-divider" [class.is-active]="active() === l.id" (click)="pick.emit(l.id)">
              <td class="sticky left-0 z-[1] bg-inherit px-4 py-2.5">
                <div class="flex items-center gap-2.5">
                  <app-avatar [initials]="l.full_name.slice(0, 1)" [name]="l.full_name" [size]="28" />
                  <div class="min-w-0">
                    <div class="max-w-[180px] truncate font-bold text-primary">{{ l.full_name }}</div>
                    <div class="text-[10.5px] text-text-secondary"><span class="font-mono">{{ l.employee_code }}</span> · {{ l.on_payroll ? 'En planilla' : 'Sin planilla' }}@if (l.history.length) { · {{ l.history.length }} {{ l.history.length === 1 ? 'cambio' : 'cambios' }} }</div>
                  </div>
                </div>
              </td>
              @for (c of cols(); track c.key) {
                <td class="tabular whitespace-nowrap px-2.5 py-2.5 text-right" [class.font-bold]="c.strong" [class.text-primary]="c.strong" [class.text-danger]="c.minus && num(l, c) > 0">
                  @if (c.edit && editable()) {
                    <input type="number" [step]="c.money ? 25 : 0.5" min="0" class="cell-in tabular" [class.is-manual]="manual(l, c)" [value]="num(l, c)"
                      [attr.aria-label]="c.label + ' de ' + l.full_name" (click)="$event.stopPropagation()" (change)="commit(l, c.edit, $any($event.target).value)" />
                  } @else {
                    <span [class.manual]="manual(l, c)">{{ c.minus && num(l, c) > 0 ? '−' : '' }}{{ fmt(num(l, c), c.money) }}</span>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
        <tfoot>
          <tr class="foot">
            <td class="sticky left-0 z-[2] px-4 py-3 text-[12px] font-bold uppercase tracking-[0.8px] text-primary">Totales · {{ period().entries.length }}</td>
            @for (c of cols(); track c.key) {
              <td class="tabular whitespace-nowrap px-2.5 py-3 text-right font-bold text-primary">{{ c.minus && period().totals[c.total] > 0 ? '−' : '' }}{{ fmt(period().totals[c.total], c.money) }}</td>
            }
          </tr>
        </tfoot>
      </table>
    </div>
  `,
  styles: `
    :host { display: block; }
    .row { cursor: pointer; background: var(--color-surface); transition: background-color var(--dur-fast); }
    .row:hover { background: var(--color-surface-soft); }
    .row.is-active { background: rgba(197, 135, 60, 0.08); }
    .foot td { background: var(--color-teal-washed); }
    .manual { text-decoration: underline dotted var(--color-action); text-underline-offset: 3px; }
    .cell-in { width: 78px; height: 30px; border-radius: 6px; border: 1px solid var(--color-border-field); background: #fffdf8; padding: 0 7px; text-align: right; color: var(--color-primary); font-weight: 700; }
    .cell-in.is-manual { border-color: color-mix(in srgb, var(--color-action) 55%, white); }
    .cell-in:focus { outline: 2px solid var(--color-secondary); outline-offset: 1px; }
  `,
})
export class PayrollGridComponent {
  readonly period = input.required<PeriodDetail>();
  readonly editable = input<boolean>(false);
  readonly active = input<string | null>(null);
  readonly edit = output<LineEdit>();
  readonly pick = output<string>();

  protected readonly cols = computed(() => COLS.filter((c) => !c.optional || this.period().totals[c.total] > 0 || (c.key === 'bonus14_amount' ? this.period().bonus14 : this.period().aguinaldo)));

  protected num(l: PayrollLine, c: Col): number {
    return l[c.key] as number;
  }

  protected manual(l: PayrollLine, c: Col): boolean {
    return l.manual_fields.includes(c.key as string);
  }

  protected fmt(v: number, money: boolean): string {
    return money ? v.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.toLocaleString('es-GT', { maximumFractionDigits: 2 });
  }

  protected commit(l: PayrollLine, field: LineField, raw: string): void {
    const value = Math.max(0, Math.round((Number(raw) || 0) * 100) / 100);
    if (value !== l[field]) this.edit.emit({ line: l, field, value });
  }
}
