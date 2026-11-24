import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';
import { ApiError } from '../../../core/http/api-error';
import { Page } from '../../../core/http/page';
import { MockTable, latency, uid } from '../../../core/mocks/mock-utils';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { peopleOf } from '../../../core/mocks/demo-people';
import { SessionStore } from '../../../core/store/session.store';
import { Employee, EmployeeDraft, ScheduleBlock } from '../models/employee.model';

/**
 * Servicio puro de fichas laborales (`/employees`, permiso users.manage). Se
 * elige en las rutas de Colaboradores junto con TeamApi (real o modo demo).
 */
export abstract class EmployeesApi {
  /** La ficha de la persona o null si aún no tiene. */
  abstract byUser(userId: string): Promise<Employee | null>;
  abstract create(draft: EmployeeDraft): Promise<Employee>;
  abstract update(id: string, draft: EmployeeDraft): Promise<Employee>;
  abstract setSchedule(id: string, blocks: readonly ScheduleBlock[]): Promise<Employee>;
}

@Injectable()
export class HttpEmployeesApi extends EmployeesApi {
  private readonly http = inject(ApiClient);

  async byUser(userId: string): Promise<Employee | null> {
    const page = await this.http.get<Page<Employee>>('/employees', { user_id: userId });
    return page.items[0] ?? null;
  }

  create(draft: EmployeeDraft): Promise<Employee> {
    return this.http.post<Employee>('/employees', draft);
  }

  update(id: string, draft: EmployeeDraft): Promise<Employee> {
    const { user_id: _ignored, ...patch } = draft;
    return this.http.patch<Employee>(`/employees/${id}`, patch);
  }

  setSchedule(id: string, blocks: readonly ScheduleBlock[]): Promise<Employee> {
    return this.http.put<Employee>(`/employees/${id}/schedule`, { blocks });
  }
}

/** Fichas simuladas (modo demo), por empresa en localStorage. */
@Injectable()
export class MockEmployeesApi extends EmployeesApi {
  private readonly session = inject(SessionStore);

  private table(): MockTable<Employee> {
    return new MockTable<Employee>(`employees_${mockTenantKey(this.session.tenant())}`, () => []);
  }

  async byUser(userId: string): Promise<Employee | null> {
    await latency(250, 450);
    return this.table().all().find((e) => e.user_id === userId) ?? null;
  }

  async create(d: EmployeeDraft): Promise<Employee> {
    await latency(500, 800);
    const rows = this.table().all();
    if (rows.some((e) => e.user_id === d.user_id)) {
      throw new ApiError(422, 'Revisa los datos.', [{ location: 'body.user_id', message: 'Esta persona ya tiene ficha laboral.' }]);
    }
    const person = peopleOf(mockTenantKey(this.session.tenant())).find((p) => p.id === d.user_id);
    const now = new Date().toISOString();
    const e: Employee = {
      ...d,
      id: uid('em'),
      user_id: d.user_id ?? '',
      full_name: person?.name ?? '',
      email: person?.email ?? '',
      employee_code: d.employee_code || `EMP-${String(rows.length + 1).padStart(4, '0')}`,
      schedule: [],
      created_at: now,
      updated_at: now,
    };
    this.table().update((list) => [...list, e]);
    return e;
  }

  async update(id: string, d: EmployeeDraft): Promise<Employee> {
    await latency(400, 700);
    this.table().update((list) =>
      list.map((e) => (e.id === id ? { ...e, ...d, user_id: e.user_id, employee_code: d.employee_code || e.employee_code, updated_at: new Date().toISOString() } : e)),
    );
    return this.table().all().find((e) => e.id === id)!;
  }

  async setSchedule(id: string, blocks: readonly ScheduleBlock[]): Promise<Employee> {
    await latency(400, 700);
    this.table().update((list) => list.map((e) => (e.id === id ? { ...e, schedule: [...blocks] } : e)));
    return this.table().all().find((e) => e.id === id)!;
  }
}
