/**
 * Utilidades del backend simulado (módulos con mock activo en MOCK_MODULES).
 * Los datos viven en localStorage para que crear o editar sobreviva a una
 * recarga, igual que con el backend real.
 */

/** Latencia de red simulada (ux-ui.md: el esqueleto aparece a partir de 300 ms). */
export function latency(min = 380, max = 720): Promise<void> {
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function uid(prefix: string): string {
  const rnd = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}_${rnd[0].toString(36)}${rnd[1].toString(36)}`;
}

/** Colección persistida en localStorage con semilla inicial. */
export class MockTable<T> {
  private readonly key: string;

  constructor(
    name: string,
    private readonly seed: () => T[],
  ) {
    this.key = `argos.mock.${name}`;
  }

  all(): T[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return JSON.parse(raw) as T[];
    } catch {
      /* almacenamiento bloqueado: se usa la semilla en memoria */
    }
    const rows = this.seed();
    this.save(rows);
    return rows;
  }

  save(rows: T[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(rows));
    } catch {
      /* sin almacenamiento: los cambios duran hasta recargar */
    }
  }

  update(fn: (rows: T[]) => T[]): T[] {
    const next = fn(this.all());
    this.save(next);
    return next;
  }
}

/** Fecha ISO relativa a hoy (días y hora local), para semillas creíbles. */
export function isoFromToday(days: number, hh = 9, mm = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}
