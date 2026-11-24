/**
 * Ficha laboral (fase02.md §2 `employees`, contrato `/employees`). La lee y
 * escribe quien tiene `users.manage`. Los datos de RRHH (asistencia, nómina,
 * disciplina) llegan en la fase 5.
 */

export type PayType = 'fixed_monthly' | 'per_day' | 'per_hour' | 'per_cleaning';
export type DocumentType = 'dpi' | 'passport';

/** Bloque del horario: weekday 0 = domingo … 6 = sábado; horas HH:MM. */
export interface ScheduleBlock {
  readonly weekday: number;
  readonly starts_at: string;
  readonly ends_at: string;
}

export interface Employee {
  readonly id: string;
  readonly user_id: string;
  readonly full_name: string;
  readonly email: string;
  readonly employee_code: string;
  readonly position: string;
  readonly hire_date: string;
  readonly termination_date: string | null;
  readonly document_type: DocumentType | null;
  readonly document_number: string | null;
  readonly igss_number: string | null;
  readonly nit: string | null;
  readonly pay_type: PayType;
  readonly pay_rate: number;
  readonly on_payroll: boolean;
  readonly emergency_name: string | null;
  readonly emergency_phone: string | null;
  readonly emergency_relation: string | null;
  readonly notes: string | null;
  readonly schedule: readonly ScheduleBlock[];
  readonly created_at: string;
  readonly updated_at: string;
}

/** Cuerpo de alta (user_id) y de edición (sin user_id; null borra). */
export interface EmployeeDraft {
  readonly user_id?: string;
  readonly employee_code?: string | null;
  readonly position: string;
  readonly hire_date: string;
  readonly termination_date: string | null;
  readonly document_type: DocumentType | null;
  readonly document_number: string | null;
  readonly igss_number: string | null;
  readonly nit: string | null;
  readonly pay_type: PayType;
  readonly pay_rate: number;
  readonly on_payroll: boolean;
  readonly emergency_name: string | null;
  readonly emergency_phone: string | null;
  readonly emergency_relation: string | null;
  readonly notes: string | null;
}

export const PAY_TYPE_LABEL: Record<PayType, string> = {
  fixed_monthly: 'Mensual fijo',
  per_day: 'Por día',
  per_hour: 'Por hora',
  per_cleaning: 'Por limpieza',
};

/** Unidad de la tarifa ("Q 165 por limpieza"). */
export const PAY_UNIT: Record<PayType, string> = {
  fixed_monthly: 'al mes',
  per_day: 'por día',
  per_hour: 'por hora',
  per_cleaning: 'por limpieza',
};

/** Días en el orden de la semana laboral (lunes primero). */
export const WEEKDAYS: readonly { readonly value: number; readonly label: string; readonly short: string }[] = [
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
  { value: 0, label: 'Domingo', short: 'Dom' },
];

/** Horas por semana del horario. */
export function weeklyHours(blocks: readonly ScheduleBlock[]): number {
  const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return blocks.reduce((sum, b) => sum + (min(b.ends_at) - min(b.starts_at)) / 60, 0);
}
