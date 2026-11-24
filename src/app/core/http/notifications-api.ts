import { Injectable, inject } from '@angular/core';
import { ApiClient } from './http-api';
import { SessionStore } from '../store/session.store';
import { latency } from '../mocks/mock-utils';

/**
 * Bandeja de notificaciones (campana de la topbar). El módulo es de Persona
 * B (fase03.md §4: tabla notifications, GET /notifications,
 * POST /notifications/{id}/read, POST /notifications/read-all). Este es el
 * contrato que la web espera; está en fase03.md §4.1 "Para B".
 */
export interface AppNotification {
  readonly id: string;
  /** ticket_created, ticket_assigned, maintenance_due, task_late, low_stock… */
  readonly type: string;
  readonly title: string;
  readonly body: string;
  /** Destino al tocarla: { route: '/mantenimiento?ver=…' } y ids. */
  readonly data: Readonly<Record<string, unknown>>;
  readonly read_at: string | null;
  readonly created_at: string;
}

export interface NotificationPage {
  readonly items: readonly AppNotification[];
  readonly next_cursor: string | null;
  /** Total sin leer (para el punto de la campana). */
  readonly unread: number;
}

export abstract class NotificationsApi {
  abstract list(): Promise<NotificationPage>;
  abstract markRead(id: string): Promise<void>;
  abstract markAllRead(): Promise<void>;
}

@Injectable()
export class HttpNotificationsApi extends NotificationsApi {
  private readonly http = inject(ApiClient);

  list(): Promise<NotificationPage> {
    return this.http.get<NotificationPage>('/notifications', { limit: 30 });
  }
  markRead(id: string): Promise<void> {
    return this.http.post<void>(`/notifications/${id}/read`);
  }
  markAllRead(): Promise<void> {
    return this.http.post<void>('/notifications/read-all');
  }
}

/** Mock en memoria mientras no exista la API de Persona B. */
@Injectable()
export class MockNotificationsApi extends NotificationsApi {
  private readonly session = inject(SessionStore);
  private read = new Set<string>();

  private items(): AppNotification[] {
    const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
    const t = this.session.tenant()?.name ?? '';
    return [
      { id: 'nt_1', type: 'ticket_created', title: 'Incidencia nueva', body: 'La bomba de la piscina no arranca · reportó Luis Torres', data: { route: '/mantenimiento' }, read_at: null, created_at: ago(8) },
      { id: 'nt_2', type: 'task_late', title: 'Limpieza retrasada', body: 'Torre Botánica 1102 debía terminar a las 11:00', data: { route: '/itinerario' }, read_at: null, created_at: ago(34) },
      { id: 'nt_3', type: 'maintenance_due', title: 'Preventivo por hacer', body: 'Mantenimiento mensual del Elevador A toca en 4 días', data: { route: '/mantenimiento?tab=preventivos' }, read_at: null, created_at: ago(190) },
      { id: 'nt_4', type: 'low_stock', title: 'Stock bajo', body: `Toallas de baño en la bodega central de ${t}`, data: { route: '/inventario' }, read_at: ago(60), created_at: ago(26 * 60) },
      { id: 'nt_5', type: 'ticket_resolved', title: 'Incidencia resuelta', body: 'Fuga en el lavamanos del baño · Torre Botánica 207', data: { route: '/mantenimiento' }, read_at: ago(70), created_at: ago(30 * 60) },
    ].map((n) => (this.read.has(n.id) ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n));
  }

  async list(): Promise<NotificationPage> {
    await latency(200, 400);
    const items = this.items();
    return { items, next_cursor: null, unread: items.filter((n) => !n.read_at).length };
  }
  async markRead(id: string): Promise<void> {
    this.read.add(id);
  }
  async markAllRead(): Promise<void> {
    for (const n of this.items()) this.read.add(n.id);
  }
}
