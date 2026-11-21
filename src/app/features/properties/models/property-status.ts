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
 * Estado de hoy de una propiedad: color + icono + texto (nunca solo color).
 * Los colores coinciden con los pines del mapa del Inicio.
 */
export const STATUS_META: Record<TodayStatus | 'inactive', StatusMeta> = {
  ready: { label: 'Lista', tone: 'success', icon: 'check-circle', dot: 'var(--color-success)' },
  cleaning: { label: 'En limpieza', tone: 'warning', icon: 'broom', dot: 'var(--color-secondary)' },
  pending: { label: 'Por limpiar', tone: 'neutral', icon: 'clock', dot: 'var(--color-disabled)' },
  occupied: { label: 'Ocupada', tone: 'info', icon: 'door', dot: 'var(--color-primary)' },
  inactive: { label: 'Inactiva', tone: 'muted', icon: 'ban', dot: 'var(--color-text-muted)' },
};

export function statusOf(p: Property): StatusMeta {
  return p.is_active ? STATUS_META[p.today_status] : STATUS_META.inactive;
}
