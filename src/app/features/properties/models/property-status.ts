import { BadgeTone } from '../../../shared/atoms/badge/badge.component';
import { IconName } from '../../../shared/atoms/icon/icon.component';
import { Property, TodayStatus } from './property.model';

export interface StatusMeta {
  readonly label: string;
  readonly tone: BadgeTone;
  readonly icon: IconName;
  readonly dot: string;
}

/**
 * Estado de una propiedad: color + icono + texto (nunca solo color). El estado
 * "de hoy" (lista, en limpieza, ocupada) llega cuando existan tareas
 * (fase02.md, módulo de Persona B); mientras tanto se muestra Activa o
 * Inactiva. Los colores coinciden con los pines del mapa del Inicio.
 */
export const STATUS_META: Record<TodayStatus | 'active' | 'inactive', StatusMeta> = {
  ready: { label: 'Lista', tone: 'success', icon: 'check-circle', dot: 'var(--color-success)' },
  cleaning: { label: 'En limpieza', tone: 'warning', icon: 'broom', dot: 'var(--color-secondary)' },
  pending: { label: 'Por limpiar', tone: 'neutral', icon: 'clock', dot: 'var(--color-disabled)' },
  occupied: { label: 'Ocupada', tone: 'info', icon: 'door', dot: 'var(--color-primary)' },
  active: { label: 'Activa', tone: 'success', icon: 'check-circle', dot: 'var(--color-success)' },
  inactive: { label: 'Inactiva', tone: 'muted', icon: 'ban', dot: 'var(--color-text-muted)' },
};

export function statusOf(p: Property): StatusMeta {
  if (!p.is_active) return STATUS_META.inactive;
  return p.today_status ? STATUS_META[p.today_status] : STATUS_META.active;
}

/** Lo que le falta a una propiedad para operar (se muestra como aviso). */
export function gapsOf(p: Property): string[] {
  const gaps: string[] = [];
  if (!p.is_active) return gaps;
  if (!p.assigned.length) gaps.push('Sin asignados');
  if (!p.checklist_template_id) gaps.push('Sin checklist');
  if (!p.has_access_info) gaps.push('Sin acceso');
  return gaps;
}
