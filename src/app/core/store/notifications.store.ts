import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { NotificationsApi, AppNotification } from '../http/notifications-api';
import { SessionStore } from './session.store';

/** Cada cuánto se revisa la bandeja mientras no haya WebSocket (WS /ws de Persona B). */
const POLL_MS = 60_000;

/**
 * Tienda global de la campana. Lee la bandeja al entrar, cada minuto con la
 * pestaña visible y al abrirla. Cuando exista `WS /ws` (fase 3, Persona B),
 * `push()` recibe cada notificación nueva y el sondeo se apaga.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly api = inject(NotificationsApi);
  private readonly session = inject(SessionStore);

  readonly items = signal<readonly AppNotification[]>([]);
  readonly unread = signal(0);
  readonly loading = signal(false);
  readonly failed = signal(false);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly hasUnread = computed(() => this.unread() > 0);

  /** Arranca el sondeo (lo llama el layout principal). */
  start(destroy: DestroyRef): void {
    void this.refresh();
    this.timer = setInterval(() => {
      if (document.visibilityState === 'visible') void this.refresh();
    }, POLL_MS);
    destroy.onDestroy(() => this.stop());
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async refresh(): Promise<void> {
    if (!this.session.tenant()) return;
    this.loading.set(true);
    try {
      const page = await this.api.list();
      this.items.set(page.items);
      this.unread.set(page.unread);
      this.failed.set(false);
    } catch {
      this.failed.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /** Una notificación nueva por WebSocket. */
  push(n: AppNotification): void {
    this.items.update((l) => [n, ...l.filter((x) => x.id !== n.id)]);
    if (!n.read_at) this.unread.update((u) => u + 1);
  }

  async markRead(n: AppNotification): Promise<void> {
    if (n.read_at) return;
    const now = new Date().toISOString();
    this.items.update((l) => l.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)));
    this.unread.update((u) => Math.max(0, u - 1));
    await this.api.markRead(n.id).catch(() => undefined);
  }

  async markAllRead(): Promise<void> {
    const now = new Date().toISOString();
    this.items.update((l) => l.map((x) => (x.read_at ? x : { ...x, read_at: now })));
    this.unread.set(0);
    await this.api.markAllRead().catch(() => undefined);
  }
}
