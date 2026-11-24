import { ROLE_NAMES } from '../../../core/auth/permissions';
import { opsPeople, opsProperties, pick, seeded } from '../../../core/mocks/demo-ops';
import { addDays, dayKey, toDayKey } from '../../../shared/utils/time';
import { AttendanceDay, PayType, StaffOption, round2 } from '../models/hr.model';

/** Colaborador de demostración con lo que usa la nómina simulada. */
export interface DemoStaff extends StaffOption {
  readonly role: string;
  readonly pay_type: PayType;
  readonly pay_rate: number;
  readonly on_payroll: boolean;
  readonly hire_date: string;
}

/** Plantilla de la empresa en el modo demo (mismas personas que el resto de mocks). */
export function demoStaff(tenant: string): DemoStaff[] {
  const people = opsPeople(tenant, ['cleaner', 'maintenance', 'supervisor', 'security']);
  return people.map((p, i) => {
    const perCleaning = p.role === 'cleaner' && i % 2 === 1;
    const pay_type: PayType = perCleaning ? 'per_cleaning' : p.role === 'maintenance' && i % 2 === 0 ? 'per_day' : 'fixed_monthly';
    const pay_rate = perCleaning ? 165 : pay_type === 'per_day' ? 260 : p.role === 'supervisor' ? 7800 : p.role === 'maintenance' ? 5400 : 4200;
    return {
      id: `emp_${p.id}`,
      user_id: p.id,
      full_name: p.name,
      employee_code: `EMP-${String(101 + i).padStart(3, '0')}`,
      position: ROLE_NAMES[p.role],
      role: ROLE_NAMES[p.role],
      pay_type,
      pay_rate,
      on_payroll: i % 5 !== 4,
      hire_date: i % 3 === 0 ? '2023-02-01' : '2024-03-11',
    };
  });
}

/** Marcajes simulados del mes en curso (la asistencia es de Persona B). */
export function demoAttendance(tenant: string, staff: readonly StaffOption[]): AttendanceDay[] {
  const rnd = seeded(`hr-${tenant}-${dayKey().slice(0, 7)}`);
  const props = opsProperties(tenant);
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const out: AttendanceDay[] = [];
  for (let d = new Date(first); toDayKey(d) <= dayKey(); d = addDays(d, 1)) {
    if (d.getDay() === 0) continue;
    const date = toDayKey(d);
    for (const e of staff) {
      if (rnd() < 0.08) continue;
      const late = rnd() < 0.08;
      const inMin = 7 * 60 + (late ? 35 + Math.floor(rnd() * 30) : Math.floor(rnd() * 20));
      const isToday = date === dayKey();
      const noOut = !isToday && rnd() < 0.04;
      const outMin = inMin + (d.getDay() === 6 ? 300 : 480 + Math.floor(rnd() * 70));
      const offSchedule = !noOut && rnd() < 0.03;
      const place = pick(rnd, props).name;
      const at = (m: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(m / 60), m % 60).toISOString();
      const nowMin = today.getHours() * 60 + today.getMinutes();
      const stillIn = isToday && nowMin < outMin;
      if (isToday && nowMin < inMin) continue;
      out.push({
        employee_id: e.id,
        date,
        hours: noOut || stillIn ? round2(stillIn ? (nowMin - inMin) / 60 : 0) : round2((outMin - inMin) / 60),
        flag: noOut ? 'no_out' : offSchedule ? 'off_schedule' : late ? 'late' : null,
        punches: [
          { at: at(inMin), kind: 'in', place, manual: false, note: null },
          ...(noOut || stillIn ? [] : [{ at: at(outMin), kind: 'out' as const, place: offSchedule ? 'Zona 1, Ciudad de Guatemala (a 6 km)' : place, manual: false, note: null }]),
        ],
      });
    }
  }
  return out;
}
