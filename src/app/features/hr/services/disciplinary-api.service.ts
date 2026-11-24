import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';
import { FilesApi } from '../../../core/http/files-api';
import { Page } from '../../../core/http/page';
import { ActionDraft, DisciplinaryAction, StaffOption } from '../models/hr.model';

export interface ActionFilter {
  readonly employee_id?: string;
  readonly pending?: boolean;
}

/** Servicio puro de disciplina (fase05.md §4.1, API de Persona A). Sin estado. */
export abstract class DisciplinaryApi {
  abstract list(filter?: ActionFilter): Promise<DisciplinaryAction[]>;
  /** Sube los adjuntos (módulo disciplinary) y registra la acción. */
  abstract create(draft: ActionDraft, files: readonly File[]): Promise<DisciplinaryAction>;
  /** Colaboradores con ficha laboral, para elegir a quién va la acción. */
  abstract staff(): Promise<StaffOption[]>;
}

@Injectable()
export class HttpDisciplinaryApi extends DisciplinaryApi {
  private readonly http = inject(ApiClient);
  private readonly files = inject(FilesApi);

  async list(filter: ActionFilter = {}): Promise<DisciplinaryAction[]> {
    const params: Record<string, string> = { limit: '200' };
    if (filter.employee_id) params['employee_id'] = filter.employee_id;
    if (filter.pending) params['pending'] = 'true';
    return [...(await this.http.get<Page<DisciplinaryAction>>('/disciplinary', params)).items];
  }

  async create(draft: ActionDraft, files: readonly File[]): Promise<DisciplinaryAction> {
    const ids: string[] = [];
    for (const f of files) ids.push(await this.files.upload(f, { module: 'disciplinary', kind: 'attachment' }));
    return this.http.post<DisciplinaryAction>('/disciplinary', { ...draft, ...(ids.length ? { attachment_file_ids: ids } : {}) });
  }

  async staff(): Promise<StaffOption[]> {
    const page = await this.http.get<Page<StaffOption & { termination_date: string | null }>>('/employees', { limit: '500' });
    return page.items.filter((e) => !e.termination_date).map(({ id, user_id, full_name, employee_code, position }) => ({ id, user_id, full_name, employee_code, position }));
  }
}
