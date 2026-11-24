import { Injectable, inject } from '@angular/core';
import { ApiClient, DownloadedFile } from '../../../core/http/http-api';
import { Page } from '../../../core/http/page';
import { EmployeeLine, LinePatch, PayrollLine, PayrollPeriod, PayrollSettings, PeriodAction, PeriodDetail, PeriodDraft } from '../models/hr.model';

/** Servicio puro de nómina (fase05.md §4.1, API de Persona A). Sin estado. */
export abstract class PayrollApi {
  abstract periods(): Promise<PayrollPeriod[]>;
  abstract period(id: string): Promise<PeriodDetail>;
  abstract createPeriod(draft: PeriodDraft): Promise<PayrollPeriod>;
  abstract deletePeriod(id: string): Promise<void>;
  abstract run(id: string, action: PeriodAction): Promise<PeriodDetail>;
  abstract updateLine(periodId: string, lineId: string, patch: LinePatch): Promise<PayrollLine>;
  abstract settings(): Promise<PayrollSettings>;
  abstract saveSettings(s: PayrollSettings): Promise<PayrollSettings>;
  abstract employeeLines(employeeId: string): Promise<EmployeeLine[]>;
  abstract exportXlsx(id: string): Promise<DownloadedFile>;
  abstract payslips(id: string): Promise<DownloadedFile>;
  abstract payslip(lineId: string): Promise<DownloadedFile>;
}

@Injectable()
export class HttpPayrollApi extends PayrollApi {
  private readonly http = inject(ApiClient);

  async periods(): Promise<PayrollPeriod[]> {
    return [...(await this.http.get<Page<PayrollPeriod>>('/payroll/periods')).items];
  }
  period(id: string): Promise<PeriodDetail> {
    return this.http.get<PeriodDetail>(`/payroll/periods/${id}`);
  }
  createPeriod(draft: PeriodDraft): Promise<PayrollPeriod> {
    return this.http.post<PayrollPeriod>('/payroll/periods', draft);
  }
  deletePeriod(id: string): Promise<void> {
    return this.http.delete<void>(`/payroll/periods/${id}`);
  }
  run(id: string, action: PeriodAction): Promise<PeriodDetail> {
    return this.http.post<PeriodDetail>(`/payroll/periods/${id}/${action}`);
  }
  updateLine(periodId: string, lineId: string, patch: LinePatch): Promise<PayrollLine> {
    return this.http.patch<PayrollLine>(`/payroll/periods/${periodId}/entries/${lineId}`, patch);
  }
  settings(): Promise<PayrollSettings> {
    return this.http.get<PayrollSettings>('/payroll/settings');
  }
  saveSettings(s: PayrollSettings): Promise<PayrollSettings> {
    const { updated_at: _skip, ...body } = s;
    return this.http.put<PayrollSettings>('/payroll/settings', body);
  }
  async employeeLines(employeeId: string): Promise<EmployeeLine[]> {
    return [...(await this.http.get<Page<EmployeeLine>>('/payroll/entries', { employee_id: employeeId })).items];
  }
  exportXlsx(id: string): Promise<DownloadedFile> {
    return this.http.blob(`/payroll/periods/${id}/export.xlsx`, 'nomina.xlsx');
  }
  payslips(id: string): Promise<DownloadedFile> {
    return this.http.blob(`/payroll/periods/${id}/payslips.pdf`, 'boletas.pdf');
  }
  payslip(lineId: string): Promise<DownloadedFile> {
    return this.http.blob(`/payroll/entries/${lineId}/payslip.pdf`, 'boleta.pdf');
  }
}
