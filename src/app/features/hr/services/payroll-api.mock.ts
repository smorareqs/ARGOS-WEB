import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, latency, uid } from '../../../core/mocks/mock-utils';
import { seeded } from '../../../core/mocks/demo-ops';
import { ApiError } from '../../../core/http/api-error';
import { DownloadedFile } from '../../../core/http/http-api';
import { dayKey } from '../../../shared/utils/time';
import {
  EmployeeLine,
  FIELD_LABEL,
  LineField,
  LinePatch,
  PayrollLine,
  PayrollPeriod,
  PayrollSettings,
  PayrollTotals,
  PeriodAction,
  PeriodDetail,
  PeriodDraft,
  baseFor,
  nextRange,
  round2,
  settle,
} from '../models/hr.model';
import { PayrollApi } from './payroll-api.service';
import { DemoStaff, demoStaff } from './hr-demo';

const SETTINGS: PayrollSettings = {
  igss_employee_rate: 0.0483, igss_employer_rate: 0.1267, incentive_bonus_monthly: 250, bonus14_month: 7,
  aguinaldo_month: 12, monthly_days: 30, daily_hours: 8, min_minutes_for_day: 240,
};
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

interface State {
  readonly settings: PayrollSettings;
  readonly periods: readonly PeriodDetail[];
}

/** Nómina simulada por empresa (localStorage) para el modo demo. */
@Injectable()
export class MockPayrollApi extends PayrollApi {
  private readonly session = inject(SessionStore);

  private get tenant(): string {
    return mockTenantKey(this.session.tenant());
  }
  private table(): MockTable<State> {
    const t = this.tenant;
    return new MockTable<State>(`payroll_${t}`, () => [seed(t)]);
  }
  private read(): State {
    return this.table().all()[0];
  }
  private write(fn: (s: State) => State): State {
    const next = fn(this.read());
    this.table().save([next]);
    return next;
  }
  private find(id: string): PeriodDetail {
    const p = this.read().periods.find((x) => x.id === id);
    if (!p) throw new ApiError(404, 'El período no existe.');
    return p;
  }
  private replace(p: PeriodDetail): PeriodDetail {
    const s = this.read();
    const next = withTotals({ ...p, updated_at: new Date().toISOString() }, s.settings);
    this.write((x) => ({ ...x, periods: x.periods.map((q) => (q.id === p.id ? next : q)) }));
    return next;
  }

  async periods(): Promise<PayrollPeriod[]> {
    await latency(400, 700);
    return this.read().periods.map(({ entries: _e, totals: _t, currency: _c, sources: _s, ...p }) => p);
  }

  async period(id: string): Promise<PeriodDetail> {
    await latency(350, 650);
    return this.find(id);
  }

  async createPeriod(d: PeriodDraft): Promise<PayrollPeriod> {
    await latency(400, 700);
    const s = this.read();
    if (d.period_end < d.period_start) throw new ApiError(422, 'Revisa las fechas.', [{ location: 'body.period_end', message: 'El fin debe ser igual o posterior al inicio.' }]);
    if (s.periods.some((p) => p.kind === d.kind && p.period_start <= d.period_end && d.period_start <= p.period_end)) {
      throw new ApiError(422, 'Ya hay un período de ese tipo que se cruza con esas fechas.', [{ location: 'body.period_start', message: 'Ya hay un período de ese tipo que se cruza con esas fechas.' }]);
    }
    const p = empty(d.name?.trim() || nameFor(d.kind, d.period_start, d.period_end), d.kind, d.period_start, d.period_end, s.settings);
    this.write((x) => ({ ...x, periods: [p, ...x.periods].sort((a, b) => b.period_start.localeCompare(a.period_start)) }));
    return p;
  }

  async deletePeriod(id: string): Promise<void> {
    await latency(300, 500);
    if (this.find(id).status !== 'draft') throw new ApiError(409, 'El período ya no está en borrador.');
    this.write((x) => ({ ...x, periods: x.periods.filter((p) => p.id !== id) }));
  }

  async run(id: string, action: PeriodAction): Promise<PeriodDetail> {
    await latency(action === 'close' ? 1200 : 700, action === 'close' ? 1700 : 1100);
    const p = this.find(id);
    if (p.status === 'closed') throw new ApiError(409, 'El período está cerrado y no se puede cambiar.');
    const now = new Date().toISOString();
    switch (action) {
      case 'compute':
        if (p.status !== 'draft') throw new ApiError(409, 'El período ya no está en borrador: vuelve a borrador para recalcularlo.');
        return this.replace({ ...p, entries: compute(p, demoStaff(this.tenant), this.read().settings), computed_at: now });
      case 'review':
        if (!p.entries.length) throw new ApiError(422, 'Calcula el período antes de pasarlo a revisión.');
        return this.replace({ ...p, status: 'review', reviewed_at: now });
      case 'reopen':
        return this.replace({ ...p, status: 'draft' });
      case 'close':
        if (p.status !== 'review') throw new ApiError(409, 'Las líneas se corrigen con el período en revisión.');
        return this.replace({ ...p, status: 'closed', closed_at: now, closed_by_name: this.session.user()?.nombre ?? 'Tú', has_export: true, entries: p.entries.map((e) => ({ ...e, has_payslip: true })) });
    }
  }

  async updateLine(periodId: string, lineId: string, patch: LinePatch): Promise<PayrollLine> {
    await latency(250, 450);
    const p = this.find(periodId);
    if (p.status !== 'review') throw new ApiError(409, p.status === 'closed' ? 'El período está cerrado y no se puede cambiar.' : 'Las líneas se corrigen con el período en revisión.');
    const line = p.entries.find((e) => e.id === lineId);
    if (!line) throw new ApiError(404, 'La línea no existe.');
    const next = applyPatch(line, patch, this.session.user()?.nombre ?? 'Tú', this.read().settings);
    if (next === line) throw new ApiError(422, 'No hay cambios.');
    this.replace({ ...p, entries: p.entries.map((e) => (e.id === lineId ? next : e)) });
    return next;
  }

  async settings(): Promise<PayrollSettings> {
    await latency(250, 450);
    return this.read().settings;
  }

  async saveSettings(cfg: PayrollSettings): Promise<PayrollSettings> {
    await latency(400, 700);
    const next = { ...cfg, updated_at: new Date().toISOString() };
    this.write((x) => ({ ...x, settings: next }));
    return next;
  }

  async employeeLines(employeeId: string): Promise<EmployeeLine[]> {
    await latency(300, 500);
    return this.read().periods.flatMap((p) =>
      p.entries.filter((e) => e.employee_id === employeeId).map((e) => ({ ...e, period_name: p.name, period_start: p.period_start, period_end: p.period_end, period_status: p.status })),
    );
  }

  async exportXlsx(): Promise<DownloadedFile> {
    return this.noFiles();
  }
  async payslips(): Promise<DownloadedFile> {
    return this.noFiles();
  }
  async payslip(): Promise<DownloadedFile> {
    return this.noFiles();
  }
  private async noFiles(): Promise<DownloadedFile> {
    await latency(300, 500);
    throw new ApiError(501, 'En la demostración no se generan archivos: con la API real se descargan el Excel y las boletas en PDF.');
  }
}

function nameFor(kind: string, start: string, end: string): string {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  return kind === 'monthly' ? `Período ${MONTHS[s.getMonth()]} ${s.getFullYear()}` : `Quincena ${s.getDate()}–${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
}

function empty(name: string, kind: 'biweekly' | 'monthly', start: string, end: string, cfg: PayrollSettings): PeriodDetail {
  const now = new Date().toISOString();
  const month = (m: number) => start.slice(5, 7) === String(m).padStart(2, '0') && Number(start.slice(8)) <= 15;
  return withTotals({
    id: uid('pp'), name, kind, period_start: start, period_end: end, status: 'draft', computed_at: null, reviewed_at: null, closed_at: null,
    closed_by_name: null, employees_count: 0, gross_total: 0, igss_total: 0, net_total: 0, bonus14: month(cfg.bonus14_month),
    aguinaldo: month(cfg.aguinaldo_month), has_export: false, created_at: now, updated_at: now, entries: [],
    totals: {} as PayrollTotals, currency: 'GTQ', sources: { attendance: false, tasks: false, incentives: false },
  }, cfg);
}

function weekdays(start: string, end: string): number {
  let n = 0;
  for (let d = new Date(`${start}T12:00:00`); d <= new Date(`${end}T12:00:00`); d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) n++;
  return n;
}

function compute(p: PeriodDetail, staff: readonly DemoStaff[], cfg: PayrollSettings): PayrollLine[] {
  const rnd = seeded(`pl-${p.id}`);
  const days = weekdays(p.period_start, p.period_end);
  const share = p.kind === 'biweekly' ? 0.5 : 1;
  return staff.map((e) => {
    const cleanings = e.pay_type === 'per_cleaning' ? 14 + Math.floor(rnd() * 10) : 0;
    const line: PayrollLine = {
      id: uid('pe'), period_id: p.id, employee_id: e.id, user_id: e.user_id, employee_code: e.employee_code, full_name: e.full_name,
      position: e.position, pay_type: e.pay_type, pay_rate: e.pay_rate, on_payroll: e.on_payroll, attendance_source: 'schedule',
      days_worked: days, hours_worked: days * cfg.daily_hours, cleanings_count: cleanings, base_amount: 0, overtime_amount: 0,
      incentives_amount: 0, other_earnings: 0, incentive_bonus_amount: e.on_payroll ? round2(cfg.incentive_bonus_monthly * share) : 0,
      bonus14_amount: 0, aguinaldo_amount: 0, igss_employee: 0, other_deductions: 0, gross_amount: 0, net_amount: 0,
      bonus_detail: [], manual_fields: [], history: [], notes: null, has_payslip: false, updated_at: new Date().toISOString(),
    };
    const base = e.pay_type === 'fixed_monthly' ? round2(e.pay_rate * share) : baseFor(line);
    const monthly = e.pay_type === 'fixed_monthly' ? e.pay_rate : base / share;
    const bonus = e.on_payroll ? round2(monthly) : 0;
    return settle({
      ...line, base_amount: base,
      bonus14_amount: p.bonus14 ? bonus : 0,
      aguinaldo_amount: p.aguinaldo ? bonus : 0,
    }, cfg.igss_employee_rate);
  });
}

function applyPatch(l: PayrollLine, patch: LinePatch, actor: string, cfg: PayrollSettings): PayrollLine {
  let next: PayrollLine = l;
  const history = [...l.history];
  const manual = new Set(l.manual_fields);
  for (const [k, v] of Object.entries(patch) as [LineField | 'notes' | 'reason', number | string | null][]) {
    if (k === 'reason' || k === 'notes' || typeof v !== 'number' || !(k in FIELD_LABEL)) continue;
    const value = round2(Math.max(0, v));
    if (value === next[k]) continue;
    history.push({ field: k, from: next[k], to: value, actor_id: 'me', actor_name: actor, at: new Date().toISOString(), note: patch.reason ?? null });
    manual.add(k);
    next = { ...next, [k]: value };
  }
  if (next !== l && ['days_worked', 'hours_worked', 'cleanings_count'].some((k) => manual.has(k)) && !manual.has('base_amount')) {
    const base = baseFor(next);
    if (base !== next.base_amount) {
      history.push({ field: 'base_amount', from: next.base_amount, to: base, actor_id: 'me', actor_name: actor, at: new Date().toISOString(), note: patch.reason ?? null });
      next = { ...next, base_amount: base };
    }
  }
  if ('notes' in patch && (patch.notes ?? null) !== l.notes) next = { ...next, notes: patch.notes?.trim() || null };
  if (next === l) return l;
  return settle({ ...next, history, manual_fields: [...manual], updated_at: new Date().toISOString() }, cfg.igss_employee_rate);
}

function withTotals(p: PeriodDetail, cfg: PayrollSettings): PeriodDetail {
  const sum = (f: (e: PayrollLine) => number) => round2(p.entries.reduce((a, e) => a + f(e), 0));
  const totals: PayrollTotals = {
    days: sum((e) => e.days_worked), hours: sum((e) => e.hours_worked), cleanings: sum((e) => e.cleanings_count), base: sum((e) => e.base_amount),
    overtime: sum((e) => e.overtime_amount), incentives: sum((e) => e.incentives_amount), other_earnings: sum((e) => e.other_earnings),
    incentive_bonus: sum((e) => e.incentive_bonus_amount), bonus14: sum((e) => e.bonus14_amount), aguinaldo: sum((e) => e.aguinaldo_amount),
    gross: sum((e) => e.gross_amount), igss: sum((e) => e.igss_employee), other_deductions: sum((e) => e.other_deductions), net: sum((e) => e.net_amount),
    igss_employer: sum((e) => (e.on_payroll ? (e.base_amount + e.overtime_amount + e.other_earnings) * cfg.igss_employer_rate : 0)),
  };
  return { ...p, totals, employees_count: p.entries.length, gross_total: totals.gross, igss_total: totals.igss, net_total: totals.net };
}

function seed(tenant: string): State {
  const staff = demoStaff(tenant);
  const periods: PeriodDetail[] = [];
  let last: PayrollPeriod | undefined;
  const today = dayKey();
  const first = nextRange('biweekly', undefined, dayKey(-45));
  for (let i = 0; i < 4; i++) {
    const r = last ? nextRange('biweekly', last, today) : first;
    if (r.start > today) break;
    let p = empty(nameFor('biweekly', r.start, r.end), 'biweekly', r.start, r.end, SETTINGS);
    p = withTotals({ ...p, entries: compute(p, staff, SETTINGS), computed_at: new Date().toISOString() }, SETTINGS);
    if (r.end < today) p = withTotals({ ...p, status: 'closed', closed_at: `${r.end}T23:00:00.000Z`, closed_by_name: 'Ana López', has_export: true, entries: p.entries.map((e) => ({ ...e, has_payslip: true })) }, SETTINGS);
    periods.unshift(p);
    last = p;
  }
  return { settings: SETTINGS, periods };
}
