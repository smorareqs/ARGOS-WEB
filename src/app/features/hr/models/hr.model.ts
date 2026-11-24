/**
 * Contrato de RRHH (fase05.md §4.1).
 * - Nómina y disciplina: Persona A, API real (`/payroll/*`, `/disciplinary/*`).
 * - Asistencia: Persona B; simulada hasta que publique `/attendance`.
 */

export type PayType = 'fixed_monthly' | 'per_day' | 'per_hour' | 'per_cleaning';
export type PeriodKind = 'biweekly' | 'monthly';
export type PeriodStatus = 'draft' | 'review' | 'closed';
export type DisciplineType = 'verbal' | 'written' | 'suspension' | 'other';
export type AttendanceFlag = 'no_out' | 'off_schedule' | 'late';

// --- Nómina ---------------------------------------------------------------------

export interface PayrollSettings {
  readonly igss_employee_rate: number;
  readonly igss_employer_rate: number;
  readonly incentive_bonus_monthly: number;
  readonly bonus14_month: number;
  readonly aguinaldo_month: number;
  readonly monthly_days: number;
  readonly daily_hours: number;
  readonly min_minutes_for_day: number;
  readonly updated_at?: string;
}

export interface PayrollPeriod {
  readonly id: string;
  readonly name: string;
  readonly kind: PeriodKind;
  readonly period_start: string;
  readonly period_end: string;
  readonly status: PeriodStatus;
  readonly computed_at: string | null;
  readonly reviewed_at: string | null;
  readonly closed_at: string | null;
  readonly closed_by_name: string | null;
  readonly employees_count: number;
  readonly gross_total: number;
  readonly igss_total: number;
  readonly net_total: number;
  readonly bonus14: boolean;
  readonly aguinaldo: boolean;
  readonly has_export: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface PeriodDraft {
  readonly name?: string;
  readonly kind: PeriodKind;
  readonly period_start: string;
  readonly period_end: string;
}

export interface BonusDetail {
  readonly kind: 'bonus14' | 'aguinaldo';
  readonly window_start: string;
  readonly window_end: string;
  readonly months_history: number;
  readonly months_estimated: number;
  readonly earnings: number;
  readonly amount: number;
}

export interface LineChange {
  readonly field: string;
  readonly from: number;
  readonly to: number;
  readonly actor_id: string;
  readonly actor_name: string;
  readonly at: string;
  readonly note: string | null;
}

export interface PayrollLine {
  readonly id: string;
  readonly period_id: string;
  readonly employee_id: string;
  readonly user_id: string;
  readonly employee_code: string;
  readonly full_name: string;
  readonly position: string;
  readonly pay_type: PayType;
  readonly pay_rate: number;
  readonly on_payroll: boolean;
  readonly attendance_source: 'attendance' | 'schedule';
  readonly days_worked: number;
  readonly hours_worked: number;
  readonly cleanings_count: number;
  readonly base_amount: number;
  readonly overtime_amount: number;
  readonly incentives_amount: number;
  readonly other_earnings: number;
  readonly incentive_bonus_amount: number;
  readonly bonus14_amount: number;
  readonly aguinaldo_amount: number;
  readonly igss_employee: number;
  readonly other_deductions: number;
  readonly gross_amount: number;
  readonly net_amount: number;
  readonly bonus_detail: readonly BonusDetail[];
  readonly manual_fields: readonly string[];
  readonly history: readonly LineChange[];
  readonly notes: string | null;
  readonly has_payslip: boolean;
  readonly updated_at: string;
}

export interface PayrollTotals {
  readonly days: number;
  readonly hours: number;
  readonly cleanings: number;
  readonly base: number;
  readonly overtime: number;
  readonly incentives: number;
  readonly other_earnings: number;
  readonly incentive_bonus: number;
  readonly bonus14: number;
  readonly aguinaldo: number;
  readonly gross: number;
  readonly igss: number;
  readonly other_deductions: number;
  readonly net: number;
  readonly igss_employer: number;
}

/** De dónde salen los datos que dependen de módulos de Persona B. */
export interface PayrollSources {
  readonly attendance: boolean;
  readonly tasks: boolean;
  readonly incentives: boolean;
}

export interface PeriodDetail extends PayrollPeriod {
  readonly entries: readonly PayrollLine[];
  readonly totals: PayrollTotals;
  readonly currency: string;
  readonly sources: PayrollSources;
}

/** Línea con su período (ficha del colaborador, W-D2). */
export interface EmployeeLine extends PayrollLine {
  readonly period_name: string;
  readonly period_start: string;
  readonly period_end: string;
  readonly period_status: PeriodStatus;
}

export type LineField =
  | 'days_worked'
  | 'hours_worked'
  | 'cleanings_count'
  | 'base_amount'
  | 'overtime_amount'
  | 'incentives_amount'
  | 'other_earnings'
  | 'incentive_bonus_amount'
  | 'bonus14_amount'
  | 'aguinaldo_amount'
  | 'other_deductions';

export type LinePatch = Partial<Record<LineField, number>> & { readonly notes?: string | null; readonly reason?: string };

export type PeriodAction = 'compute' | 'review' | 'reopen' | 'close';

// --- Disciplina -----------------------------------------------------------------

export interface Attachment {
  readonly file_id: string;
  readonly name: string;
  readonly content_type: string;
  readonly url: string;
  readonly expires_at: string;
}

export interface DisciplinaryAction {
  readonly id: string;
  readonly employee_id: string;
  readonly user_id: string;
  readonly employee_name: string;
  readonly employee_code: string;
  readonly position: string;
  readonly type: DisciplineType;
  readonly occurred_on: string;
  readonly description: string;
  readonly issued_by: string | null;
  readonly issued_by_name: string | null;
  readonly suspension_from: string | null;
  readonly suspension_to: string | null;
  readonly acknowledged_at: string | null;
  readonly acknowledgement_note: string | null;
  readonly attachments: readonly Attachment[];
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ActionDraft {
  readonly employee_id: string;
  readonly type: DisciplineType;
  readonly occurred_on: string;
  readonly description: string;
  readonly suspension_from?: string;
  readonly suspension_to?: string;
}

/** Colaborador con ficha laboral (selectores de disciplina). */
export interface StaffOption {
  readonly id: string;
  readonly user_id: string;
  readonly full_name: string;
  readonly employee_code: string;
  readonly position: string;
}

// --- Asistencia (Persona B, simulada) ----------------------------------------------

export interface Punch {
  readonly at: string;
  readonly kind: 'in' | 'out';
  readonly place: string;
  readonly manual: boolean;
  readonly note: string | null;
}

export interface AttendanceDay {
  readonly employee_id: string;
  /** `AAAA-MM-DD` */
  readonly date: string;
  readonly hours: number;
  readonly flag: AttendanceFlag | null;
  readonly punches: readonly Punch[];
}

export interface AttendanceMonth {
  readonly employees: readonly StaffOption[];
  readonly days: readonly AttendanceDay[];
}

// --- Etiquetas ----------------------------------------------------------------------

export const PAY_TYPE_LABEL: Record<PayType, string> = {
  fixed_monthly: 'Salario mensual',
  per_day: 'Por día',
  per_hour: 'Por hora',
  per_cleaning: 'Por limpieza',
};

export const PERIOD_STATUS: Record<PeriodStatus, { label: string; tone: 'neutral' | 'warning' | 'success' }> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  review: { label: 'En revisión', tone: 'warning' },
  closed: { label: 'Cerrado', tone: 'success' },
};

export const DISCIPLINE_LABEL: Record<DisciplineType, string> = {
  verbal: 'Llamada de atención verbal',
  written: 'Amonestación escrita',
  suspension: 'Suspensión',
  other: 'Otra acción',
};

export const FLAG_LABEL: Record<AttendanceFlag, string> = {
  no_out: 'Sin marca de salida',
  off_schedule: 'Fuera de horario',
  late: 'Llegada tarde',
};

export const FIELD_LABEL: Record<LineField, string> = {
  days_worked: 'Días',
  hours_worked: 'Horas',
  cleanings_count: 'Limpiezas',
  base_amount: 'Salario base',
  overtime_amount: 'Horas extra',
  incentives_amount: 'Incentivos',
  other_earnings: 'Otros devengos',
  incentive_bonus_amount: 'Bonificación incentivo',
  bonus14_amount: 'Bono 14',
  aguinaldo_amount: 'Aguinaldo',
  other_deductions: 'Otras deducciones',
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * IGSS, devengado y líquido de una línea (fase05.md §3): el IGSS se cobra
 * sobre base, extras y otros devengos, solo en planilla; Bono 14, aguinaldo,
 * incentivos y la bonificación incentivo no lo pagan.
 */
export function settle(l: PayrollLine, rate: number): PayrollLine {
  const igss = l.on_payroll ? round2((l.base_amount + l.overtime_amount + l.other_earnings) * rate) : 0;
  const gross = round2(
    l.base_amount + l.overtime_amount + l.incentives_amount + l.other_earnings + l.incentive_bonus_amount + l.bonus14_amount + l.aguinaldo_amount,
  );
  return { ...l, igss_employee: igss, gross_amount: gross, net_amount: round2(gross - igss - l.other_deductions) };
}

/** Base según el esquema con días, horas o limpiezas (salario fijo no cambia). */
export function baseFor(l: PayrollLine): number {
  switch (l.pay_type) {
    case 'per_day':
      return round2(l.days_worked * l.pay_rate);
    case 'per_hour':
      return round2(l.hours_worked * l.pay_rate);
    case 'per_cleaning':
      return round2(l.cleanings_count * l.pay_rate);
    default:
      return l.base_amount;
  }
}

/** Siguiente período sugerido: la quincena (o el mes) después del último. */
export function nextRange(kind: PeriodKind, last: PayrollPeriod | undefined, today: string): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  let start = last ? new Date(`${last.period_end}T12:00:00`) : new Date(`${today}T12:00:00`);
  if (last) start.setDate(start.getDate() + 1);
  else start = new Date(start.getFullYear(), start.getMonth(), start.getDate() <= 15 || kind === 'monthly' ? 1 : 16, 12);
  if (kind === 'monthly') {
    const s = new Date(start.getFullYear(), start.getMonth(), 1, 12);
    return { start: key(s), end: key(new Date(s.getFullYear(), s.getMonth() + 1, 0, 12)) };
  }
  const end = start.getDate() <= 15 ? new Date(start.getFullYear(), start.getMonth(), 15, 12) : new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
  return { start: key(start), end: key(end) };
}
