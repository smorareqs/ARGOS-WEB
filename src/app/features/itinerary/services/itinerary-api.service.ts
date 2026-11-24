import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';
import { Page } from '../../../core/http/page';
import { Task, TaskDraft, TaskMove, TaskStatus } from '../models/task.model';

export interface Assignable {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly role: string;
}

export interface PropertyOption {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly building_id: string | null;
  readonly building_name: string | null;
}

/** Servicio puro del itinerario (fase02.md §4). Sin estado. */
export abstract class ItineraryApi {
  /** Tareas entre dos días locales, inclusive. */
  abstract list(from: string, to: string): Promise<Page<Task>>;
  abstract people(): Promise<readonly Assignable[]>;
  abstract properties(): Promise<readonly PropertyOption[]>;
  abstract create(draft: TaskDraft): Promise<Task>;
  abstract move(id: string, move: TaskMove): Promise<Task>;
  abstract setStatus(id: string, status: TaskStatus, note?: string): Promise<Task>;
  /** Crea limpiezas de salida para las reservas que aún no tienen una. */
  abstract generateFromReservations(from: string, to: string): Promise<{ created: number }>;
}

@Injectable()
export class HttpItineraryApi extends ItineraryApi {
  private readonly http = inject(ApiClient);

  list(from: string, to: string): Promise<Page<Task>> {
    return this.http.get<Page<Task>>('/tasks', { from, to, limit: 500 });
  }
  people(): Promise<readonly Assignable[]> {
    return this.http.get<readonly Assignable[]>('/tasks/assignables');
  }
  properties(): Promise<readonly PropertyOption[]> {
    return this.http.get<Page<PropertyOption>>('/properties', { limit: 200 }).then((p) => p.items);
  }
  create(draft: TaskDraft): Promise<Task> {
    return this.http.post<Task>('/tasks', draft);
  }
  move(id: string, move: TaskMove): Promise<Task> {
    return this.http.post<Task>(`/tasks/${id}/reschedule`, move);
  }
  setStatus(id: string, status: TaskStatus, note?: string): Promise<Task> {
    const action = status === 'validated' ? 'validate' : status === 'returned' ? 'return' : 'cancel';
    return this.http.post<Task>(`/tasks/${id}/${action}`, { note: note ?? null });
  }
  generateFromReservations(from: string, to: string): Promise<{ created: number }> {
    return this.http.post<{ created: number }>('/tasks/generate-from-reservations', { from, to });
  }
}
