import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, latency, uid } from '../../../core/mocks/mock-utils';
import { ApiError } from '../../../core/http/api-error';
import { dayKey } from '../../../shared/utils/time';
import { ActionDraft, DisciplinaryAction, StaffOption } from '../models/hr.model';
import { ActionFilter, DisciplinaryApi } from './disciplinary-api.service';
import { demoStaff } from './hr-demo';

/** Disciplina simulada por empresa (localStorage) para el modo demo. */
@Injectable()
export class MockDisciplinaryApi extends DisciplinaryApi {
  private readonly session = inject(SessionStore);

  private get tenant(): string {
    return mockTenantKey(this.session.tenant());
  }
  private table(): MockTable<DisciplinaryAction> {
    const t = this.tenant;
    return new MockTable<DisciplinaryAction>(`disciplinary_${t}`, () => seed(t));
  }

  async list(filter: ActionFilter = {}): Promise<DisciplinaryAction[]> {
    await latency(350, 650);
    return this.table()
      .all()
      .filter((a) => (!filter.employee_id || a.employee_id === filter.employee_id) && (!filter.pending || !a.acknowledged_at))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async create(d: ActionDraft, files: readonly File[]): Promise<DisciplinaryAction> {
    await latency(450, 750);
    if (d.description.trim().length < 10) throw new ApiError(422, 'Revisa los datos.', [{ location: 'body.description', message: 'Describe qué pasó (al menos 10 caracteres).' }]);
    const e = demoStaff(this.tenant).find((x) => x.id === d.employee_id);
    if (!e) throw new ApiError(422, 'Elige un colaborador con ficha laboral.', [{ location: 'body.employee_id', message: 'Elige un colaborador con ficha laboral.' }]);
    const now = new Date().toISOString();
    const a: DisciplinaryAction = {
      id: uid('da'), employee_id: e.id, user_id: e.user_id, employee_name: e.full_name, employee_code: e.employee_code, position: e.position,
      type: d.type, occurred_on: d.occurred_on, description: d.description.trim(), issued_by: null, issued_by_name: this.session.user()?.nombre ?? 'Tú',
      suspension_from: d.suspension_from ?? null, suspension_to: d.suspension_to ?? null, acknowledged_at: null, acknowledgement_note: null,
      attachments: files.map((f) => ({ file_id: uid('f'), name: f.name, content_type: f.type, url: '#', expires_at: now })),
      created_at: now, updated_at: now,
    };
    this.table().update((list) => [a, ...list]);
    return a;
  }

  async staff(): Promise<StaffOption[]> {
    await latency(200, 400);
    return demoStaff(this.tenant);
  }
}

function seed(tenant: string): DisciplinaryAction[] {
  const staff = demoStaff(tenant);
  if (staff.length < 3) return [];
  const make = (i: number, type: DisciplinaryAction['type'], days: number, description: string, ack: string | null, by: string): DisciplinaryAction => {
    const e = staff[i];
    const at = `${dayKey(-days)}T15:00:00.000Z`;
    return {
      id: `da_${i}`, employee_id: e.id, user_id: e.user_id, employee_name: e.full_name, employee_code: e.employee_code, position: e.position,
      type, occurred_on: dayKey(-days), description, issued_by: null, issued_by_name: by, suspension_from: null, suspension_to: null,
      acknowledged_at: ack ? `${dayKey(-days + 1)}T14:00:00.000Z` : null, acknowledgement_note: ack, attachments: [], created_at: at, updated_at: at,
    };
  };
  return [
    make(2, 'written', 3, 'Cerró una limpieza sin fotos del baño; el huésped reportó toallas faltantes.', null, 'Ana López'),
    make(1, 'verbal', 9, 'Tres llegadas tarde en la semana sin aviso al supervisor.', 'Tuve problemas con el bus; ya salgo más temprano.', 'Jorge Peña'),
  ];
}
