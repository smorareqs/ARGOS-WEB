import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { SessionStore } from '../../../core/store/session.store';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { DownloadedFile } from '../../../core/http/http-api';
import { dayKey } from '../../../shared/utils/time';
import { downloadBlob } from '../../../shared/utils/csv';
import { PayrollApi } from '../services/payroll-api.service';
import { DisciplinaryApi } from '../services/disciplinary-api.service';
import { AttendanceApi, PunchFix } from '../services/attendance-api.service';
import {
  ActionDraft,
  AttendanceMonth,
  DisciplinaryAction,
  LinePatch,
  PayrollPeriod,
  PayrollSettings,
  PeriodAction,
  PeriodDetail,
  PeriodDraft,
  StaffOption,
} from '../models/hr.model';

const DONE: Record<PeriodAction, string> = {
  compute: 'Nómina calculada con la asistencia, las limpiezas y los incentivos del período.',
  review: 'Período en revisión: ya puedes corregir las líneas.',
  reopen: 'El período volvió a borrador. Al recalcular se reemplazan las correcciones.',
  close: 'Período cerrado. Cada colaborador recibe su boleta por correo y en la app.',
};

/** Tienda de RRHH (W-J1–W-J5). Vive con la pantalla. */
@Injectable()
export class HrStore {
  private readonly payrollApi = inject(PayrollApi);
  private readonly disciplinaryApi = inject(DisciplinaryApi);
  private readonly attendanceApi = inject(AttendanceApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);

  readonly hasPayroll = computed(() => this.session.hasFeature('payroll'));
  readonly canAttendance = computed(() => this.session.can('hr.attendance.manage'));
  readonly canPayroll = computed(() => this.hasPayroll() && this.session.can('hr.payroll.manage'));
  readonly canSeePayroll = computed(() => this.hasPayroll() && this.session.canAny(['hr.payroll.manage', 'hr.payroll.export']));
  readonly canExport = computed(() => this.canSeePayroll());
  readonly canDiscipline = computed(() => this.session.can('hr.disciplinary.manage'));

  readonly periods = signal<PayrollPeriod[] | null>(null);
  readonly detail = signal<PeriodDetail | null>(null);
  readonly settings = signal<PayrollSettings | null>(null);
  readonly actions = signal<DisciplinaryAction[] | null>(null);
  readonly staff = signal<StaffOption[]>([]);
  readonly attendance = signal<AttendanceMonth | null>(null);
  readonly error = signal<string | null>(null);
  readonly detailError = signal<string | null>(null);
  readonly busy = signal<string | null>(null);
  readonly saveError = signal<ApiError | null>(null);

  readonly current = computed(() => (this.periods() ?? []).find((p) => p.status !== 'closed') ?? null);
  readonly pendingAck = computed(() => (this.actions() ?? []).filter((a) => !a.acknowledged_at).length);
  readonly flags = computed(() => (this.attendance()?.days ?? []).filter((d) => d.flag !== null));

  /** Carga lo que la persona puede ver; cada parte falla por su cuenta. */
  async load(): Promise<void> {
    this.error.set(null);
    const jobs: Promise<unknown>[] = [];
    if (this.canSeePayroll()) {
      jobs.push(this.payrollApi.periods().then((p) => this.periods.set(p)));
      if (this.canPayroll()) jobs.push(this.payrollApi.settings().then((s) => this.settings.set(s)));
    }
    if (this.canDiscipline()) {
      jobs.push(this.disciplinaryApi.list().then((a) => this.actions.set(a)));
      jobs.push(this.disciplinaryApi.staff().then((s) => this.staff.set(s)));
    }
    if (this.canAttendance()) {
      jobs.push(this.attendanceApi.month(dayKey().slice(0, 7)).then((m) => this.attendance.set(m)).catch(() => this.attendance.set({ employees: [], days: [] })));
    }
    const results = await Promise.allSettled(jobs);
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed) this.error.set(toApiError(failed.reason).detail);
  }

  clearSaveError(): void {
    this.saveError.set(null);
  }

  async openPeriod(id: string): Promise<void> {
    if (this.detail()?.id !== id) this.detail.set(null);
    this.detailError.set(null);
    try {
      this.detail.set(await this.payrollApi.period(id));
    } catch (err) {
      this.detailError.set(toApiError(err).detail);
    }
  }

  async createPeriod(d: PeriodDraft): Promise<PayrollPeriod | null> {
    let created: PayrollPeriod | null = null;
    const ok = await this.save('period', async () => (created = await this.payrollApi.createPeriod(d)), 'Período creado. Calcúlalo cuando termine.', true);
    if (ok) await this.refreshPeriods();
    return ok ? created : null;
  }

  async deletePeriod(p: PayrollPeriod): Promise<boolean> {
    const ok = await this.save(p.id, () => this.payrollApi.deletePeriod(p.id), `Borraste ${p.name}.`, false);
    if (ok) {
      this.detail.set(null);
      await this.refreshPeriods();
    }
    return ok;
  }

  async run(p: PayrollPeriod, action: PeriodAction): Promise<boolean> {
    const ok = await this.save(`${p.id}:${action}`, async () => this.detail.set(await this.payrollApi.run(p.id, action)), DONE[action], false);
    if (ok) await this.refreshPeriods();
    return ok;
  }

  /** Corrige una línea; el detalle se vuelve a leer para tener los totales. */
  async updateLine(periodId: string, lineId: string, patch: LinePatch, key: string): Promise<boolean> {
    this.busy.set(key);
    this.saveError.set(null);
    try {
      await this.payrollApi.updateLine(periodId, lineId, patch);
      this.detail.set(await this.payrollApi.period(periodId));
      await this.refreshPeriods();
      return true;
    } catch (err) {
      const e = toApiError(err);
      this.saveError.set(e);
      this.toast.error(e.errors[0]?.message ?? e.detail);
      return false;
    } finally {
      this.busy.set(null);
    }
  }

  async saveSettings(s: PayrollSettings): Promise<boolean> {
    return this.save('settings', async () => this.settings.set(await this.payrollApi.saveSettings(s)), 'Configuración de nómina guardada. Aplica desde el próximo cálculo.', true);
  }

  async createAction(d: ActionDraft, files: readonly File[]): Promise<boolean> {
    const ok = await this.save('action', () => this.disciplinaryApi.create(d, files), 'Acción registrada. El colaborador recibe un correo y la ve en la app para dar su acuse.', true);
    if (ok) this.actions.set(await this.disciplinaryApi.list());
    return ok;
  }

  async fix(f: PunchFix): Promise<boolean> {
    const ok = await this.save('fix', () => this.attendanceApi.fix(f), 'Marcaje corregido. Queda en la bitácora con tu motivo.', true);
    if (ok) this.attendance.set(await this.attendanceApi.month(dayKey().slice(0, 7)));
    return ok;
  }

  /** Descarga Excel o boletas con la sesión y los guarda con su nombre. */
  async download(key: string, fn: () => Promise<DownloadedFile>): Promise<void> {
    this.busy.set(key);
    try {
      const f = await fn();
      downloadBlob(f.name, f.blob);
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this.busy.set(null);
    }
  }

  readonly files = {
    xlsx: (id: string) => this.download(`xlsx:${id}`, () => this.payrollApi.exportXlsx(id)),
    payslips: (id: string) => this.download(`pdfs:${id}`, () => this.payrollApi.payslips(id)),
    payslip: (lineId: string) => this.download(`pdf:${lineId}`, () => this.payrollApi.payslip(lineId)),
  };

  private async refreshPeriods(): Promise<void> {
    try {
      this.periods.set(await this.payrollApi.periods());
    } catch {
      /* la lista se refresca en la siguiente carga */
    }
  }

  private async save(key: string, fn: () => Promise<unknown>, ok: string, fieldErrors: boolean): Promise<boolean> {
    this.busy.set(key);
    this.saveError.set(null);
    try {
      await fn();
      this.toast.success(ok);
      return true;
    } catch (err) {
      const e = toApiError(err);
      if (fieldErrors) this.saveError.set(e);
      else this.toast.error(e.detail);
      return false;
    } finally {
      this.busy.set(null);
    }
  }
}
