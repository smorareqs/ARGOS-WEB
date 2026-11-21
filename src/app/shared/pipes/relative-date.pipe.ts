import { Pipe, PipeTransform } from '@angular/core';

const TZ = 'America/Guatemala';

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

/**
 * Fechas según distancia (ux-ui.md §3.7): "Hoy 09:30", "Ayer 16:30",
 * "Lun 16 nov", "16 nov 2025". `mode="day"` omite la hora.
 */
@Pipe({ name: 'relativeDate' })
export class RelativeDatePipe implements PipeTransform {
  transform(iso: string | null | undefined, mode: 'time' | 'day' = 'time', empty = 'Nunca'): string {
    if (!iso) return empty;
    const d = new Date(iso);
    const now = new Date();
    const time = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).format(d);
    const withTime = (label: string) => (mode === 'time' ? `${label} ${time}` : label);
    const today = dayKey(now);
    const yesterday = dayKey(new Date(now.getTime() - 86_400_000));
    const key = dayKey(d);
    if (key === today) return withTime('Hoy');
    if (key === yesterday) return withTime('Ayer');
    const diffDays = Math.abs(now.getTime() - d.getTime()) / 86_400_000;
    if (diffDays < 7) {
      const wd = new Intl.DateTimeFormat('es-GT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ }).format(d);
      return capitalize(wd.replace(/\./g, '').replace(',', ''));
    }
    const sameYear = d.getFullYear() === now.getFullYear();
    return new Intl.DateTimeFormat('es-GT', {
      day: 'numeric',
      month: 'short',
      year: sameYear ? undefined : 'numeric',
      timeZone: TZ,
    })
      .format(d)
      .replace(/\./g, '');
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
