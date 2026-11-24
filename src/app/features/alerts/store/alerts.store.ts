import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { SessionStore } from '../../../core/store/session.store';
import { toApiError } from '../../../core/http/api-error';
import { Alert, AlertsApi } from '../services/alerts-api.service';

/** Tienda de Alertas (W-L1). Vive con la pantalla. */
@Injectable()
export class AlertsStore {
  private readonly api = inject(AlertsApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);

  private readonly _open = signal<readonly Alert[]>([]);
  private readonly _resolved = signal<readonly Alert[] | null>(null);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _busy = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly canManage = computed(() => this.session.can('alerts.manage'));
  readonly open = this._open.asReadonly();
  readonly resolved = computed(() => this._resolved() ?? []);
  readonly items = computed(() => [...this._open(), ...this.resolved()]);

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      this._open.set(await this.api.list('open'));
    } catch (err) {
      this._error.set(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }

  /** Las resueltas se piden al mirarlas por primera vez. */
  async loadResolved(): Promise<void> {
    if (this._resolved()) return;
    try {
      this._resolved.set(await this.api.list('resolved'));
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    }
  }

  async acknowledge(a: Alert): Promise<void> {
    await this.step(a, () => this.api.acknowledge(a.id), 'Alerta reconocida: el equipo ve que ya la estás atendiendo.');
  }

  async resolve(a: Alert): Promise<void> {
    await this.step(a, () => this.api.resolve(a.id), 'Alerta resuelta. Si la causa sigue, el sistema la vuelve a levantar.');
  }

  private async step(a: Alert, fn: () => Promise<Alert>, message: string): Promise<void> {
    this._busy.set(a.id);
    try {
      const next = await fn();
      if (next.status === 'resolved') {
        this._open.update((l) => l.filter((x) => x.id !== next.id));
        this._resolved.update((l) => (l ? [next, ...l] : l));
      } else {
        this._open.update((l) => l.map((x) => (x.id === next.id ? next : x)));
      }
      this.toast.success(message);
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this._busy.set(null);
    }
  }
}
