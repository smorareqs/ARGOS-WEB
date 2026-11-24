import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { SessionStore } from '../../../core/store/session.store';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { addDays, toDayKey } from '../../../shared/utils/time';
import { Assignable, ItineraryApi, PropertyOption } from '../services/itinerary-api.service';
import { Task, TaskDraft, TaskMove, TaskStatus, isLate } from '../models/task.model';

/** Tienda del itinerario (W-E1–W-E4). Vive con la pantalla. */
@Injectable()
export class ItineraryStore {
  private readonly api = inject(ItineraryApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);

  private readonly _tasks = signal<readonly Task[]>([]);
  private readonly _people = signal<readonly Assignable[]>([]);
  private readonly _properties = signal<readonly PropertyOption[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _busy = signal<string | null>(null);
  private readonly _saving = signal(false);
  private readonly _saveError = signal<ApiError | null>(null);
  private readonly _flash = signal<string | null>(null);
  private range: [string, string] = ['', ''];

  readonly tasks = this._tasks.asReadonly();
  readonly people = this._people.asReadonly();
  readonly properties = this._properties.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly busy = this._busy.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly saveError = this._saveError.asReadonly();
  /** Tarea recién creada o movida: se resalta un momento. */
  readonly flash = this._flash.asReadonly();

  readonly canManage = computed(() => this.session.can('tasks.manage'));
  readonly canAssign = computed(() => this.session.canAny(['tasks.assign', 'tasks.manage']));
  readonly canValidate = computed(() => this.session.can('tasks.validate'));

  readonly today = computed(() => {
    const key = toDayKey(new Date());
    const list = this._tasks().filter((t) => t.date === key && t.status !== 'cancelled');
    return {
      total: list.length,
      done: list.filter((t) => t.status === 'done' || t.status === 'validated').length,
      inProgress: list.filter((t) => t.status === 'in_progress').length,
      late: list.filter((t) => isLate(t)).length,
      toValidate: list.filter((t) => t.status === 'done').length,
      unassigned: this._tasks().filter((t) => !t.assignee_id && t.status === 'pending').length,
    };
  });

  /** Carga la semana que empieza en `monday` (y lo necesario del día de hoy). */
  async load(monday: Date): Promise<void> {
    const from = toDayKey(monday);
    const to = toDayKey(addDays(monday, 6));
    const todayKey = toDayKey(new Date());
    this.range = [from < todayKey ? from : todayKey, to > todayKey ? to : todayKey];
    this._loading.set(true);
    this._error.set(null);
    try {
      const [page, people, props] = await Promise.all([
        this.api.list(this.range[0], this.range[1]),
        this._people().length ? Promise.resolve(this._people()) : this.api.people(),
        this._properties().length ? Promise.resolve(this._properties()) : this.api.properties(),
      ]);
      this._tasks.set(page.items);
      this._people.set(people);
      this._properties.set(props);
    } catch (err) {
      this._error.set(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }

  async create(draft: TaskDraft): Promise<Task | null> {
    this._saving.set(true);
    this._saveError.set(null);
    try {
      const t = await this.api.create(draft);
      this.replace(t, true);
      this.toast.success(`Tarea #${t.number} creada en ${t.property_code}.`);
      return t;
    } catch (err) {
      this._saveError.set(toApiError(err));
      return null;
    } finally {
      this._saving.set(false);
    }
  }

  async move(task: Task, move: TaskMove): Promise<boolean> {
    const before = task;
    // Optimista: el bloque cambia de lugar de inmediato y vuelve si falla.
    this.replace({ ...task, date: move.date ?? task.date, assignee_id: move.assignee_id === undefined ? task.assignee_id : move.assignee_id }, false);
    this._busy.set(task.id);
    try {
      const t = await this.api.move(task.id, move);
      this.replace(t, true);
      this.toast.success(`Tarea #${t.number} actualizada.`, {
        label: 'Deshacer',
        run: () => void this.move(t, { date: before.date, assignee_id: before.assignee_id, reason: 'Deshacer cambio' }),
      });
      return true;
    } catch (err) {
      this.replace(before, false);
      this.toast.error(toApiError(err).detail);
      return false;
    } finally {
      this._busy.set(null);
    }
  }

  async setStatus(task: Task, status: TaskStatus, note?: string): Promise<boolean> {
    this._busy.set(task.id);
    try {
      const t = await this.api.setStatus(task.id, status, note);
      this.replace(t, true);
      const msg: Partial<Record<TaskStatus, string>> = { validated: 'validada', returned: 'devuelta', cancelled: 'cancelada' };
      this.toast.success(`Tarea #${t.number} ${msg[status] ?? 'actualizada'}.`);
      return true;
    } catch (err) {
      this.toast.error(toApiError(err).detail);
      return false;
    } finally {
      this._busy.set(null);
    }
  }

  async generate(monday: Date): Promise<void> {
    this._busy.set('generate');
    try {
      const { created } = await this.api.generateFromReservations(toDayKey(monday), toDayKey(addDays(monday, 13)));
      if (created === 0) {
        this.toast.show('Todas las salidas de estas semanas ya tienen su limpieza.');
      } else {
        this.toast.success(`Se crearon ${created} limpiezas de salida sin asignar.`);
        await this.load(monday);
      }
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this._busy.set(null);
    }
  }

  clearSaveError(): void {
    this._saveError.set(null);
  }

  private replace(t: Task, flash: boolean): void {
    this._tasks.update((list) => (list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t]));
    if (flash) {
      this._flash.set(t.id);
      setTimeout(() => this._flash() === t.id && this._flash.set(null), 2400);
    }
  }
}
