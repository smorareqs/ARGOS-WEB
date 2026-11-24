import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { HrStore } from '../../store/hr.store';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Configuración de nómina (W-J5): tasas, meses de pago y la jornada. */
@Component({
  selector: 'app-payroll-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormFieldComponent, SelectComponent, ButtonComponent],
  template: `
    <form class="grid max-w-[880px] grid-cols-1 gap-5 rounded-card border border-border-card bg-surface p-6 shadow-e1 md:grid-cols-2" (submit)="$event.preventDefault(); save()">
      <app-form-field label="IGSS laboral (%)" for="c-igss" hint="Sobre base, extras y otros devengos." [error]="err('body.igss_employee_rate')">
        <input id="c-igss" type="number" step="0.01" min="0" max="50" class="field-native tabular" [value]="igss()" (input)="igss.set($any($event.target).value)" />
      </app-form-field>
      <app-form-field label="Cuota patronal (%)" for="c-igssp" hint="IGSS, IRTRA e INTECAP. Solo informativa en el Excel." [error]="err('body.igss_employer_rate')">
        <input id="c-igssp" type="number" step="0.01" min="0" max="50" class="field-native tabular" [value]="employer()" (input)="employer.set($any($event.target).value)" />
      </app-form-field>
      <app-form-field label="Mes de pago del Bono 14"><app-select [compact]="true" [options]="months" [(value)]="bonus14" ariaLabel="Mes del Bono 14" /></app-form-field>
      <app-form-field label="Mes de pago del aguinaldo"><app-select [compact]="true" [options]="months" [(value)]="aguinaldo" ariaLabel="Mes del aguinaldo" /></app-form-field>
      <app-form-field label="Bonificación incentivo (Q al mes)" for="c-inc" hint="Decreto 37-2001; no paga IGSS. En quincena va la mitad.">
        <input id="c-inc" type="number" step="10" min="0" class="field-native tabular" [value]="bonus()" (input)="bonus.set($any($event.target).value)" />
      </app-form-field>
      <app-form-field label="Minutos para contar un día" for="c-min" hint="Esquema por día: menos que esto no cuenta.">
        <input id="c-min" type="number" step="15" min="0" max="1440" class="field-native tabular" [value]="minutes()" (input)="minutes.set($any($event.target).value)" />
      </app-form-field>
      <app-form-field label="Días del mes" for="c-days" hint="Para llevar a un mes lo devengado por día u hora.">
        <input id="c-days" type="number" min="20" max="31" class="field-native tabular" [value]="days()" (input)="days.set($any($event.target).value)" />
      </app-form-field>
      <app-form-field label="Horas por día" for="c-hours" hint="Jornada cuando alguien no tiene horario cargado.">
        <input id="c-hours" type="number" min="1" max="24" class="field-native tabular" [value]="hours()" (input)="hours.set($any($event.target).value)" />
      </app-form-field>
      <div class="flex items-center justify-between gap-3 md:col-span-2">
        <p class="text-[12px] text-text-secondary">Aplica desde el próximo cálculo; los períodos cerrados no cambian.</p>
        <app-button variant="primary" type="submit" [loading]="store.busy() === 'settings'">Guardar configuración</app-button>
      </div>
    </form>
  `,
})
export class PayrollSettingsComponent {
  protected readonly store = inject(HrStore);
  protected readonly months = MONTHS.map((m, i) => ({ value: String(i + 1), label: m[0].toUpperCase() + m.slice(1) }));

  protected readonly igss = signal('');
  protected readonly employer = signal('');
  protected readonly bonus14 = signal('7');
  protected readonly aguinaldo = signal('12');
  protected readonly bonus = signal('');
  protected readonly minutes = signal('');
  protected readonly days = signal('');
  protected readonly hours = signal('');

  constructor() {
    effect(() => {
      const s = this.store.settings();
      if (!s) return;
      untracked(() => {
        this.igss.set(String(Math.round(s.igss_employee_rate * 10000) / 100));
        this.employer.set(String(Math.round(s.igss_employer_rate * 10000) / 100));
        this.bonus14.set(String(s.bonus14_month));
        this.aguinaldo.set(String(s.aguinaldo_month));
        this.bonus.set(String(s.incentive_bonus_monthly));
        this.minutes.set(String(s.min_minutes_for_day));
        this.days.set(String(s.monthly_days));
        this.hours.set(String(s.daily_hours));
      });
    });
  }

  protected err(loc: string): string | null {
    return this.store.saveError()?.errors.find((e) => e.location === loc)?.message ?? null;
  }

  protected async save(): Promise<void> {
    const n = (v: string, d: number) => (v.trim() === '' || isNaN(Number(v)) ? d : Number(v));
    await this.store.saveSettings({
      igss_employee_rate: Math.round(n(this.igss(), 4.83) * 100) / 10000,
      igss_employer_rate: Math.round(n(this.employer(), 12.67) * 100) / 10000,
      incentive_bonus_monthly: n(this.bonus(), 250),
      bonus14_month: Number(this.bonus14()),
      aguinaldo_month: Number(this.aguinaldo()),
      monthly_days: n(this.days(), 30),
      daily_hours: n(this.hours(), 8),
      min_minutes_for_day: n(this.minutes(), 240),
    });
  }
}
