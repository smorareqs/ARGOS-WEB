import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, latency } from '../../../core/mocks/mock-utils';
import { ApiError } from '../../../core/http/api-error';
import { dayKey } from '../../../shared/utils/time';
import { AttendanceDay, AttendanceMonth, round2 } from '../models/hr.model';
import { AttendanceApi, PunchFix } from './attendance-api.service';
import { demoAttendance, demoStaff } from './hr-demo';

/** Asistencia simulada por empresa y mes (localStorage) hasta la API de B. */
@Injectable()
export class MockAttendanceApi extends AttendanceApi {
  private readonly session = inject(SessionStore);

  private table(): MockTable<AttendanceDay> {
    const t = mockTenantKey(this.session.tenant());
    return new MockTable<AttendanceDay>(`attendance_${t}_${dayKey().slice(0, 7)}`, () => demoAttendance(t, demoStaff(t)));
  }

  async month(): Promise<AttendanceMonth> {
    await latency(450, 800);
    return { employees: demoStaff(mockTenantKey(this.session.tenant())), days: this.table().all() };
  }

  async fix(f: PunchFix): Promise<void> {
    await latency(400, 700);
    const [hi, mi] = f.in.split(':').map(Number);
    const [ho, mo] = f.out.split(':').map(Number);
    const hours = round2((ho * 60 + mo - hi * 60 - mi) / 60);
    if (hours <= 0) throw new ApiError(422, 'Revisa los datos marcados.', [{ location: 'body.out', message: 'La salida debe ser después de la entrada.' }]);
    const me = this.session.user()?.nombre ?? 'Tú';
    const at = (h: number, m: number) => new Date(`${f.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).toISOString();
    const row: AttendanceDay = {
      employee_id: f.employee_id,
      date: f.date,
      hours,
      flag: null,
      punches: [
        { at: at(hi, mi), kind: 'in', place: 'Corrección manual', manual: true, note: `${f.reason} · ${me}` },
        { at: at(ho, mo), kind: 'out', place: 'Corrección manual', manual: true, note: `${f.reason} · ${me}` },
      ],
    };
    this.table().update((list) => [...list.filter((a) => !(a.employee_id === f.employee_id && a.date === f.date)), row]);
  }
}
