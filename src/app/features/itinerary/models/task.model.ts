import { BadgeTone } from '../../../shared/atoms/badge/badge.component';
import { SpotIconName } from '../../../shared/atoms/spot-icon/spot-icon.component';

/** Contrato de tareas (fase02.md §4 · `GET /tasks`, lo sirve el módulo de Persona B). */

export type TaskType = 'checkout_cleaning' | 'deep_cleaning' | 'touch_up' | 'inspection' | 'maintenance';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'validated' | 'returned' | 'cancelled';
export type TaskPriority = 'normal' | 'high';

export interface TaskEvent {
  readonly at: string;
  readonly text: string;
  readonly actor: string;
}

export interface ChecklistSection {
  readonly name: string;
  readonly total: number;
  readonly done: number;
}

export interface TaskConsumption {
  readonly item: string;
  readonly qty: number;
  readonly unit: string;
}

export interface Task {
  readonly id: string;
  readonly number: number;
  readonly type: TaskType;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly property_id: string;
  readonly property_code: string;
  readonly property_name: string;
  readonly building_id: string | null;
  readonly assignee_id: string | null;
  readonly assignee_name: string | null;
  /** Día local `AAAA-MM-DD`. */
  readonly date: string;
  /** Ventana `HH:MM`. */
  readonly start: string;
  readonly end: string;
  readonly checklist: readonly ChecklistSection[];
  readonly photos: number;
  readonly started_at: string | null;
  readonly finished_at: string | null;
  readonly reservation_code: string | null;
  readonly notes: string | null;
  readonly consumption: readonly TaskConsumption[];
  readonly discrepancy: string | null;
  readonly timeline: readonly TaskEvent[];
}

export interface TaskDraft {
  readonly type: TaskType;
  readonly property_id: string;
  readonly date: string;
  readonly start: string;
  readonly end: string;
  readonly assignee_id: string | null;
  readonly priority: TaskPriority;
  readonly notes: string | null;
}

export interface TaskMove {
  readonly assignee_id?: string | null;
  readonly date?: string;
  readonly reason: string;
}

export const TYPE_META: Record<TaskType, { label: string; short: string; spot: SpotIconName }> = {
  checkout_cleaning: { label: 'Limpieza de salida', short: 'Salida', spot: 'cleaning' },
  deep_cleaning: { label: 'Limpieza profunda', short: 'Profunda', spot: 'cleaning' },
  touch_up: { label: 'Repaso antes de llegada', short: 'Repaso', spot: 'arrivals' },
  inspection: { label: 'Inspección', short: 'Inspección', spot: 'evidence' },
  maintenance: { label: 'Mantenimiento', short: 'Manten.', spot: 'maintenance' },
};

export const STATUS_META: Record<TaskStatus, { label: string; tone: BadgeTone; color: string }> = {
  pending: { label: 'Pendiente', tone: 'neutral', color: 'var(--color-teal-muted)' },
  in_progress: { label: 'En progreso', tone: 'info', color: 'var(--color-secondary)' },
  done: { label: 'Finalizada', tone: 'success', color: 'var(--color-success)' },
  validated: { label: 'Validada', tone: 'validated', color: 'var(--color-primary)' },
  returned: { label: 'Devuelta', tone: 'warning', color: 'var(--color-warning)' },
  cancelled: { label: 'Cancelada', tone: 'muted', color: 'var(--color-text-muted)' },
};

/** Retrasada: la ventana ya terminó y la tarea no se ha finalizado. */
export function isLate(t: Task, now = new Date()): boolean {
  if (t.status !== 'pending' && t.status !== 'in_progress' && t.status !== 'returned') return false;
  const [h, m] = t.end.split(':').map(Number);
  const [y, mo, d] = t.date.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m).getTime() < now.getTime();
}

export function progress(t: Task): number {
  const total = t.checklist.reduce((a, s) => a + s.total, 0);
  const done = t.checklist.reduce((a, s) => a + s.done, 0);
  return total ? Math.round((done / total) * 100) : 0;
}
