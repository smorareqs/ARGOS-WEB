import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';
import { Page } from '../../../core/http/page';
import { AttendanceDay, AttendanceMonth, StaffOption } from '../models/hr.model';

export interface PunchFix {
  readonly employee_id: string;
  readonly date: string;
  readonly in: string;
  readonly out: string;
  readonly reason: string;
}

/**
 * Asistencia (W-J1). El módulo `attendance` es de Persona B: mientras no
 * exista, la web usa el mock (bandera `attendance` en MOCK_MODULES).
 */
export abstract class AttendanceApi {
  /** Mes `AAAA-MM`: colaboradores y un resumen por día. */
  abstract month(month: string): Promise<AttendanceMonth>;
  abstract fix(f: PunchFix): Promise<void>;
}

/** Un marcaje como lo describe fase05.md §2 (`attendance_records`). */
interface AttendanceRecord {
  readonly id: string;
  readonly employee_id: string;
  readonly clock_in_at: string;
  readonly clock_out_at: string | null;
  readonly source: 'app' | 'manual';
  readonly edit_reason: string | null;
  readonly worked_minutes: number | null;
  readonly late?: boolean;
  readonly off_schedule?: boolean;
}

/**
 * Contrato que la web espera de Persona B (documentado en avance.md):
 * `GET /attendance?from&to` → `{ items: AttendanceRecord[] }` y
 * `POST /attendance` `{ employee_id, clock_in_at, clock_out_at, edit_reason }`.
 */
@Injectable()
export class HttpAttendanceApi extends AttendanceApi {
  private readonly http = inject(ApiClient);

  async month(month: string): Promise<AttendanceMonth> {
    const [y, m] = month.split('-').map(Number);
    const from = `${month}-01`;
    const to = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    const [staff, records] = await Promise.all([
      this.http.get<Page<StaffOption & { termination_date: string | null }>>('/employees', { limit: '500' }),
      this.http.get<Page<AttendanceRecord>>('/attendance', { from, to, limit: '500' }),
    ]);
    return { employees: staff.items.filter((e) => !e.termination_date), days: summarize(records.items) };
  }

  async fix(f: PunchFix): Promise<void> {
    await this.http.post('/attendance', {
      employee_id: f.employee_id,
      clock_in_at: new Date(`${f.date}T${f.in}:00`).toISOString(),
      clock_out_at: new Date(`${f.date}T${f.out}:00`).toISOString(),
      edit_reason: f.reason,
    });
  }
}

function summarize(list: readonly AttendanceRecord[]): AttendanceDay[] {
  const byDay = new Map<string, AttendanceRecord[]>();
  for (const r of list) {
    const d = new Date(r.clock_in_at);
    const key = `${r.employee_id}|${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    byDay.set(key, [...(byDay.get(key) ?? []), r]);
  }
  return [...byDay.entries()].map(([key, rs]) => {
    const [employee_id, date] = key.split('|');
    const noOut = rs.some((r) => !r.clock_out_at);
    const minutes = rs.reduce((a, r) => a + (r.worked_minutes ?? 0), 0);
    return {
      employee_id,
      date,
      hours: Math.round((minutes / 60) * 100) / 100,
      flag: noOut ? 'no_out' : rs.some((r) => r.off_schedule) ? 'off_schedule' : rs.some((r) => r.late) ? 'late' : null,
      punches: rs.flatMap((r) => [
        { at: r.clock_in_at, kind: 'in' as const, place: 'Ubicación registrada', manual: r.source === 'manual', note: r.edit_reason },
        ...(r.clock_out_at ? [{ at: r.clock_out_at, kind: 'out' as const, place: 'Ubicación registrada', manual: r.source === 'manual', note: r.edit_reason }] : []),
      ]),
    };
  });
}
