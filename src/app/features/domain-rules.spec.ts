import { nightsBetween, overlaps } from './reservations/models/reservation.model';
import { PayrollLine, PayrollPeriod, baseFor, nextRange, settle } from './hr/models/hr.model';
import { Task, isLate, progress } from './itinerary/models/task.model';
import { plural } from '../shared/utils/plural';
import { Plan, overLimits, priceOf, yearlySaving } from './billing/models/billing.model';
import { addDays, mondayOf, toDayKey } from '../shared/utils/time';

/** Reglas de negocio de los módulos de operación (las usan pantallas y mocks). */
describe('reglas de dominio', () => {
  it('una estancia que sale el día que entra otra no se solapa', () => {
    const a = { check_in_date: '2026-11-20', check_out_date: '2026-11-23' };
    expect(overlaps(a, { check_in_date: '2026-11-23', check_out_date: '2026-11-25' })).toBe(false);
    expect(overlaps(a, { check_in_date: '2026-11-22', check_out_date: '2026-11-24' })).toBe(true);
    expect(nightsBetween(a.check_in_date, a.check_out_date)).toBe(3);
  });

  it('la nómina cobra IGSS sobre base, extras y otros devengos, y solo en planilla', () => {
    const line = {
      base_amount: 2000, overtime_amount: 200, incentives_amount: 125, other_earnings: 0, incentive_bonus_amount: 125,
      bonus14_amount: 166.67, aguinaldo_amount: 0, other_deductions: 100, on_payroll: true,
    } as unknown as PayrollLine;
    const out = settle(line, 0.0483);
    expect(out.igss_employee).toBe(106.26);
    expect(out.gross_amount).toBe(2616.67);
    expect(out.net_amount).toBe(2410.41);
    expect(settle({ ...line, on_payroll: false }, 0.0483).igss_employee).toBe(0);
  });

  it('por limpieza, la base sale de las limpiezas validadas', () => {
    const line = { pay_type: 'per_cleaning', pay_rate: 165, cleanings_count: 20, base_amount: 0 } as unknown as PayrollLine;
    expect(baseFor(line)).toBe(3300);
    expect(baseFor({ ...line, pay_type: 'fixed_monthly' } as PayrollLine)).toBe(0);
  });

  it('el siguiente período es la quincena después de la última', () => {
    const last = { period_end: '2026-11-15' } as PayrollPeriod;
    expect(nextRange('biweekly', last, '2026-11-22')).toEqual({ start: '2026-11-16', end: '2026-11-30' });
    expect(nextRange('biweekly', { period_end: '2026-11-30' } as PayrollPeriod, '2026-11-22')).toEqual({ start: '2026-12-01', end: '2026-12-15' });
    expect(nextRange('monthly', undefined, '2026-11-22')).toEqual({ start: '2026-11-01', end: '2026-11-30' });
  });

  it('una tarea pendiente cuya ventana ya terminó está retrasada; una validada no', () => {
    const base = { date: '2026-11-21', start: '09:00', end: '11:00', checklist: [{ name: 'Cocina', total: 8, done: 4 }] } as unknown as Task;
    const noon = new Date(2026, 10, 21, 12, 0);
    expect(isLate({ ...base, status: 'pending' }, noon)).toBe(true);
    expect(isLate({ ...base, status: 'validated' }, noon)).toBe(false);
    expect(isLate({ ...base, status: 'pending' }, new Date(2026, 10, 21, 10, 0))).toBe(false);
    expect(progress(base)).toBe(50);
  });

  it('las fechas viajan como día local y la semana empieza en lunes', () => {
    const sat = new Date(2026, 10, 21, 23, 30);
    expect(toDayKey(sat)).toBe('2026-11-21');
    expect(toDayKey(mondayOf(sat))).toBe('2026-11-16');
    expect(toDayKey(addDays(mondayOf(sat), 6))).toBe('2026-11-22');
  });

  it('un plan no alcanza si el uso pasa sus límites', () => {
    const plan = { price_monthly: 1450, price_yearly: 14500, limits: { max_properties: 25, max_users: 30, features: [] } } as unknown as Plan;
    expect(overLimits(plan, { properties: 25, users: 30, storage_bytes: 0 })).toEqual([]);
    expect(overLimits(plan, { properties: 26, users: 31, storage_bytes: 0 })).toEqual(['26 propiedades (permite 25)', '31 personas (permite 30)']);
    expect(overLimits({ ...plan, limits: { max_properties: null, max_users: null, features: [] } }, { properties: 999, users: 999, storage_bytes: 0 })).toEqual([]);
    expect(priceOf(plan, 'yearly')).toBe(14500);
    expect(yearlySaving(plan)).toBe(2900);
  });

  it('el número y la palabra concuerdan', () => {
    expect(plural(1, 'crítica', 'críticas')).toBe('1 crítica');
    expect(plural(0, 'crítica', 'críticas')).toBe('0 críticas');
  });
});
