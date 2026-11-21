import { Injectable, computed, inject, signal } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { ToastService } from '../../../core/services/toast.service';
import { toApiError } from '../../../core/http/api-error';
import { DashboardApi } from '../services/dashboard-api.service';
import { DashboardAlert, DashboardData } from '../models/dashboard.model';

/**
 * Tienda del Inicio. Vive con la pantalla (providers del componente): al
 * salir o al cambiar de empresa se destruye y la siguiente carga es fresca.
 */
@Injectable()
export class DashboardStore {
  private readonly api = inject(DashboardApi);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);

  private readonly _data = signal<DashboardData | null>(null);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly firstName = computed(() => this.session.user()?.nombre.split(' ')[0] ?? '');
  readonly tenantName = computed(() => this.session.tenant()?.name ?? '');
  readonly canManageAlerts = computed(() => this.session.can('alerts.manage'));

  readonly greeting = computed(() => {
    const h = Number(
      new Intl.DateTimeFormat('es-GT', { hour: 'numeric', hour12: false, timeZone: 'America/Guatemala' }).format(new Date()),
    );
    const salute = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    return `${salute}, ${this.firstName()}`;
  });

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      this._data.set(await this.api.get());
    } catch (err) {
      this._error.set(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }

  /** Reconocer una alerta: se quita al instante y se ofrece deshacer (6 s). */
  async acknowledge(alert: DashboardAlert): Promise<void> {
    const before = this._data();
    if (!before) return;
    this.patchAlerts((list) => list.filter((a) => a.id !== alert.id), -1);
    try {
      await this.api.acknowledge(alert.id);
      this.toast.success('Alerta reconocida.', {
        label: 'Deshacer',
        run: () => void this.undo(alert, before.alerts.indexOf(alert)),
      });
    } catch (err) {
      this._data.set(before);
      this.toast.error(toApiError(err).detail);
    }
  }

  private async undo(alert: DashboardAlert, index: number): Promise<void> {
    this.patchAlerts((list) => {
      const next = [...list];
      next.splice(Math.max(0, index), 0, alert);
      return next;
    }, +1);
    await this.api.restore(alert.id).catch(() => undefined);
  }

  private patchAlerts(fn: (a: readonly DashboardAlert[]) => readonly DashboardAlert[], delta: number): void {
    this._data.update((d) => (d ? { ...d, alerts: fn(d.alerts), totalAlerts: d.totalAlerts + delta } : d));
  }
}
