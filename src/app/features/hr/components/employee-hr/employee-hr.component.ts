import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HrStore } from '../../store/hr.store';
import { PayrollApi } from '../../services/payroll-api.service';
import { DisciplinaryApi } from '../../services/disciplinary-api.service';
import { DisciplinaryAction, EmployeeLine, PERIOD_STATUS } from '../../models/hr.model';
import { DisciplineListComponent } from '../discipline-list/discipline-list.component';
import { ActionFormComponent } from '../action-form/action-form.component';
import { toApiError } from '../../../../core/http/api-error';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { gtq } from '../../../../shared/utils/time';

/**
 * RRHH de un colaborador en su ficha (W-D2): sus líneas de nómina por período
 * con la boleta, o su historial disciplinario con "Nueva acción".
 */
@Component({
  selector: 'app-employee-hr',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DisciplineListComponent, ActionFormComponent, DrawerComponent, EmptyStateComponent, BadgeComponent, ButtonComponent, IconComponent],
  providers: [HrStore],
  template: `
    @if (error(); as err) {
      <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="error" title="No pudimos cargar" [message]="err" /></div>
    } @else if (section() === 'nomina') {
      @if (lines(); as list) {
        @if (list.length) {
          <div class="overflow-x-auto rounded-card border border-border-card bg-surface shadow-e1">
            <table class="w-full min-w-[720px] border-collapse text-[12.5px]">
              <thead>
                <tr class="border-b border-divider text-[10.5px] uppercase tracking-[1px] text-text-secondary">
                  <th class="px-4 py-3 text-left font-normal">Período</th>
                  <th class="px-3 py-3 text-left font-normal">Estado</th>
                  <th class="px-3 py-3 text-right font-normal">Días</th>
                  <th class="px-3 py-3 text-right font-normal">Base</th>
                  <th class="px-3 py-3 text-right font-normal">Devengado</th>
                  <th class="px-3 py-3 text-right font-normal">IGSS</th>
                  <th class="px-3 py-3 text-right font-bold text-primary">Líquido</th>
                  <th class="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                @for (l of list; track l.id) {
                  <tr class="border-b border-divider last:border-0">
                    <td class="px-4 py-3"><div class="font-bold text-primary">{{ l.period_name }}</div><div class="text-[11.5px] text-text-secondary">{{ asDate(l.period_start) | date: 'd MMM' }} – {{ asDate(l.period_end) | date: 'd MMM y' }}</div></td>
                    <td class="px-3 py-3"><app-badge size="sm" [tone]="status(l).tone">{{ status(l).label }}</app-badge></td>
                    <td class="tabular px-3 py-3 text-right">{{ l.days_worked }}</td>
                    <td class="tabular px-3 py-3 text-right">{{ money(l.base_amount) }}</td>
                    <td class="tabular px-3 py-3 text-right">{{ money(l.gross_amount) }}</td>
                    <td class="tabular px-3 py-3 text-right text-danger">{{ l.igss_employee ? '−' + money(l.igss_employee) : '—' }}</td>
                    <td class="tabular px-3 py-3 text-right font-bold text-primary">{{ money(l.net_amount) }}</td>
                    <td class="px-3 py-3 text-right">
                      @if (store.canExport()) {
                        <app-button variant="icon" size="sm" ariaLabel="Descargar la boleta" [loading]="store.busy() === 'pdf:' + l.id" (pressed)="store.files.payslip(l.id)"><app-icon name="file" [size]="15" /></app-button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="soon" title="Sin nómina todavía" message="Aparece aquí cuando se calcule el primer período en que tenga contrato." /></div>
        }
      } @else {
        <div class="skeleton h-[220px] w-full !rounded-card"></div>
      }
    } @else {
      <div class="mb-4 flex items-center justify-between gap-3">
        <p class="text-[12.5px] text-text-secondary">Llamadas de atención, amonestaciones y suspensiones. No tocan la nómina.</p>
        <app-button variant="secondary" size="sm" (pressed)="acting.set(true)"><app-icon name="plus" [size]="15" /> Nueva acción</app-button>
      </div>
      @if (actions(); as list) {
        <app-discipline-list [actions]="list" [compact]="true" />
      } @else {
        <div class="skeleton h-[220px] w-full !rounded-card"></div>
      }
      <app-drawer [open]="acting()" (openChange)="acting.set($event)" label="Nueva acción disciplinaria" [width]="480">
        @if (acting()) { <app-action-form [employeeId]="employeeId()" (saved)="saved()" (cancel)="acting.set(false)" /> }
      </app-drawer>
    }
  `,
})
export class EmployeeHrComponent {
  protected readonly store = inject(HrStore);
  private readonly payroll = inject(PayrollApi);
  private readonly disciplinary = inject(DisciplinaryApi);
  readonly employeeId = input.required<string>();
  readonly section = input.required<'nomina' | 'disciplina'>();

  protected readonly lines = signal<EmployeeLine[] | null>(null);
  protected readonly actions = signal<DisciplinaryAction[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly acting = signal(false);
  protected readonly money = (v: number) => gtq(v, 2);

  constructor() {
    effect(() => {
      const id = this.employeeId();
      const s = this.section();
      untracked(() => void this.load(id, s));
    });
  }

  private async load(id: string, s: 'nomina' | 'disciplina'): Promise<void> {
    this.error.set(null);
    try {
      if (s === 'nomina') this.lines.set(await this.payroll.employeeLines(id));
      else {
        this.store.staff.set(await this.disciplinary.staff());
        this.actions.set(await this.disciplinary.list({ employee_id: id }));
      }
    } catch (e) {
      this.error.set(toApiError(e).detail);
    }
  }

  protected async saved(): Promise<void> {
    this.acting.set(false);
    this.actions.set(await this.disciplinary.list({ employee_id: this.employeeId() }));
  }

  protected status(l: EmployeeLine) {
    return PERIOD_STATUS[l.period_status];
  }
  protected asDate(k: string): Date {
    return new Date(`${k}T12:00:00`);
  }
}
