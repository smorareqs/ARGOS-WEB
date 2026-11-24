import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { SessionStore } from '../../../core/store/session.store';
import { toApiError } from '../../../core/http/api-error';
import { Goal, Incentive, MetricsApi, MetricsBoard, MetricsRange } from '../services/metrics-api.service';

/** Tienda de Métricas (W-K1, W-K2). Vive con la pantalla. */
@Injectable()
export class MetricsStore {
  private readonly api = inject(MetricsApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);

  private readonly _board = signal<MetricsBoard | null>(null);
  private readonly _goals = signal<readonly Goal[]>([]);
  private readonly _incentives = signal<readonly Incentive[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _busy = signal(false);

  readonly board = this._board.asReadonly();
  readonly goals = this._goals.asReadonly();
  readonly incentives = this._incentives.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly busy = this._busy.asReadonly();

  readonly canApprove = computed(() => this.session.canAny(['metrics.all', 'hr.payroll.manage']));
  readonly canExport = computed(() => this.session.can('reports.export'));

  readonly totals = computed(() => {
    const b = this._board();
    if (!b) return { cleanings: 0, onTime: 0, avg: 0, late: 0 };
    const cleanings = b.people.reduce((a, p) => a + p.cleanings, 0);
    const late = b.people.reduce((a, p) => a + p.late, 0);
    const avg = cleanings ? Math.round(b.people.reduce((a, p) => a + p.avg_minutes * p.cleanings, 0) / cleanings) : 0;
    return { cleanings, late, avg, onTime: cleanings ? Math.round(((cleanings - late) / cleanings) * 100) : 0 };
  });

  async load(range: MetricsRange): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const [board, goals, incentives] = await Promise.all([this.api.board(range), this.api.goals(), this.api.incentives()]);
      this._board.set(board);
      this._goals.set(goals);
      this._incentives.set(incentives);
    } catch (err) {
      this._error.set(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }

  async decide(ids: readonly string[], status: 'approved' | 'rejected'): Promise<boolean> {
    this._busy.set(true);
    try {
      this._incentives.set(await this.api.decide(ids, status));
      this.toast.success(`${ids.length} ${ids.length === 1 ? 'incentivo' : 'incentivos'} ${status === 'approved' ? 'aprobados: entran en la próxima nómina' : 'rechazados'}.`);
      return true;
    } catch (err) {
      this.toast.error(toApiError(err).detail);
      return false;
    } finally {
      this._busy.set(false);
    }
  }
}
