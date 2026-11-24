/**
 * Utilidades de fecha y moneda del panel. Los días viajan como `AAAA-MM-DD`
 * en hora local (la del tenant), nunca como ISO UTC, para no saltar de día
 * en la noche de Guatemala (UTC−6).
 */

/** Fecha local `AAAA-MM-DD` a `days` de hoy. */
export function dayKey(days = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDayKey(d);
}

export function toDayKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Lunes de la semana que contiene `d`. */
export function mondayOf(d: Date): Date {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Hora `HH:MM` → minutos desde medianoche. */
export function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function hhmm(min: number): string {
  return `${`${Math.floor(min / 60)}`.padStart(2, '0')}:${`${min % 60}`.padStart(2, '0')}`;
}

/** Quetzales con separador de miles y dos decimales (ux-ui.md §3.7). */
export function gtq(amount: number, decimals = 2): string {
  return `Q ${amount.toLocaleString('es-GT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
