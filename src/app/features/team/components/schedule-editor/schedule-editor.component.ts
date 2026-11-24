import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { ScheduleBlock, WEEKDAYS, weeklyHours } from '../../models/employee.model';

interface Row {
  start: string;
  end: string;
}

const START_HOUR = 5;
const END_HOUR = 23;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/**
 * Horario semanal (W-D2 · Horario): una fila por día con sus bloques como
 * barras sobre una regla de 5:00 a 23:00 y los campos de hora para editarlos.
 * Atajos: copiar el lunes de martes a viernes y vaciar. Avisa de bloques
 * que se cruzan antes de guardar (el backend también lo valida).
 */
@Component({
  selector: 'app-schedule-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, IconComponent],
  template: `
    <section class="rounded-card border border-border-card bg-surface p-5 shadow-e1">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="font-display text-[17px] font-semibold text-primary">Horario semanal</h2>
          <p class="mt-1 text-[12.5px] text-text-body">
            <b class="tabular text-primary">{{ hours() }}</b> horas por semana. Lo ve en la app y lo usa el itinerario para saber quién está libre.
          </p>
        </div>
        @if (editable()) {
          <div class="flex flex-wrap gap-2">
            <app-button variant="tertiary" size="sm" (pressed)="copyMonday()"><app-icon name="copy" [size]="14" /> Copiar el lunes de martes a viernes</app-button>
            <app-button variant="tertiary" size="sm" (pressed)="clear()">Vaciar</app-button>
          </div>
        }
      </div>

      <div class="ruler mt-5 hidden pl-[104px] pr-[0px] md:block" aria-hidden="true">
        <div class="relative h-4">
          @for (h of ticks; track h) {
            <span class="absolute -translate-x-1/2 text-[10px] text-text-muted" [style.left.%]="pos(h * 60)">{{ h }}:00</span>
          }
        </div>
      </div>

      <ul class="mt-1 flex flex-col divide-y divide-divider">
        @for (d of days; track d.value) {
          @let rows = byDay()[d.value];
          <li class="grid gap-3 py-3 md:grid-cols-[92px_minmax(0,1fr)] md:items-center">
            <div class="flex items-baseline justify-between md:block">
              <div class="text-[13px] font-bold text-primary">{{ d.label }}</div>
              <div class="text-[11.5px] text-text-secondary">{{ rows.length ? dayHours(rows) + ' h' : 'Libre' }}</div>
            </div>
            <div>
              <div class="track relative hidden h-7 rounded-xs md:block">
                @for (h of ticks; track h) {
                  <span class="tick absolute inset-y-0" [style.left.%]="pos(h * 60)"></span>
                }
                @for (r of rows; track $index) {
                  @if (valid(r)) {
                    <span class="bar absolute inset-y-1 rounded-[5px]" [style.left.%]="pos(toMin(r.start))" [style.width.%]="pos(toMin(r.end)) - pos(toMin(r.start))"></span>
                  }
                }
              </div>
              @if (editable()) {
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  @for (r of rows; track $index; let i = $index) {
                    <span class="inline-flex items-center gap-1 rounded-field border border-border-field bg-surface-soft py-0.5 pl-1.5 pr-0.5" [class.!border-danger]="!valid(r)">
                      <input type="time" class="time" [value]="r.start" (change)="set(d.value, i, 'start', $any($event.target).value)" [attr.aria-label]="d.label + ' inicio del bloque ' + (i + 1)" />
                      <span class="text-text-muted">–</span>
                      <input type="time" class="time" [value]="r.end" (change)="set(d.value, i, 'end', $any($event.target).value)" [attr.aria-label]="d.label + ' fin del bloque ' + (i + 1)" />
                      <button type="button" class="flex h-6 w-6 items-center justify-center rounded-xs text-text-muted hover:text-danger" [attr.aria-label]="'Quitar bloque de ' + d.label" (click)="remove(d.value, i)">
                        <app-icon name="x" [size]="13" />
                      </button>
                    </span>
                  }
                  <button type="button" class="add inline-flex h-8 items-center gap-1 rounded-field px-2 text-[12px] font-bold" (click)="add(d.value)">
                    <app-icon name="plus" [size]="13" /> Bloque
                  </button>
                </div>
              }
            </div>
          </li>
        }
      </ul>

      @if (problem(); as p) {
        <p class="mt-3 rounded-field bg-danger-soft px-4 py-2.5 text-[12.5px] text-danger" role="alert">{{ p }}</p>
      }
      @if (editable()) {
        <div class="mt-4 flex justify-end gap-2">
          <app-button variant="tertiary" [disabled]="!dirty()" (pressed)="reset()">Deshacer</app-button>
          <app-button variant="primary" [disabled]="!dirty() || !!problem()" [loading]="saving()" (pressed)="save()">Guardar horario</app-button>
        </div>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .track { background: var(--color-background); }
    .tick { width: 1px; background: color-mix(in srgb, var(--color-border-card) 80%, transparent); }
    .bar { background: var(--color-teal-muted); box-shadow: inset 0 0 0 1px rgba(255,255,255,.25); transition: left var(--dur-base), width var(--dur-base); }
    .time { background: transparent; font-size: 12.5px; color: var(--color-primary); font-variant-numeric: tabular-nums; padding: 2px; }
    .add { color: var(--color-teal-muted); }
    .add:hover { color: var(--color-primary); background: var(--color-surface-soft); }
    @media (prefers-reduced-motion: reduce) { .bar { transition: none; } }
  `,
})
export class ScheduleEditorComponent {
  readonly schedule = input<readonly ScheduleBlock[]>([]);
  readonly editable = input<boolean>(true);
  readonly saving = input<boolean>(false);
  readonly saved = output<ScheduleBlock[]>();

  protected readonly days = WEEKDAYS;
  protected readonly ticks = [6, 9, 12, 15, 18, 21];
  protected readonly toMin = toMin;
  protected readonly byDay = signal<Record<number, Row[]>>({});

  constructor() {
    effect(() => {
      this.schedule();
      untracked(() => this.reset());
    });
  }

  protected readonly blocks = computed<ScheduleBlock[]>(() =>
    WEEKDAYS.flatMap((d) => (this.byDay()[d.value] ?? []).map((r) => ({ weekday: d.value, starts_at: r.start, ends_at: r.end }))),
  );
  protected readonly hours = computed(() => fmt(weeklyHours(this.blocks().filter((b) => b.ends_at > b.starts_at))));
  protected readonly dirty = computed(() => key(this.blocks()) !== key(this.schedule()));

  protected readonly problem = computed(() => {
    for (const d of WEEKDAYS) {
      const rows = [...(this.byDay()[d.value] ?? [])].sort((a, b) => a.start.localeCompare(b.start));
      if (rows.some((r) => !this.valid(r))) return `${d.label}: cada bloque debe terminar después de empezar.`;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i].start < rows[i - 1].end) return `${d.label}: hay bloques que se cruzan.`;
      }
    }
    return null;
  });

  reset(): void {
    const map: Record<number, Row[]> = {};
    for (const d of WEEKDAYS) map[d.value] = [];
    for (const b of this.schedule()) map[b.weekday]?.push({ start: b.starts_at, end: b.ends_at });
    this.byDay.set(map);
  }

  protected pos(min: number): number {
    const span = (END_HOUR - START_HOUR) * 60;
    return Math.min(100, Math.max(0, ((min - START_HOUR * 60) / span) * 100));
  }

  protected valid(r: Row): boolean {
    return /^\d\d:\d\d$/.test(r.start) && /^\d\d:\d\d$/.test(r.end) && r.end > r.start;
  }

  protected dayHours(rows: readonly Row[]): string {
    return fmt(rows.filter((r) => this.valid(r)).reduce((s, r) => s + (toMin(r.end) - toMin(r.start)) / 60, 0));
  }

  private edit(day: number, fn: (rows: Row[]) => void): void {
    const map = { ...this.byDay() };
    const rows = (map[day] ?? []).map((r) => ({ ...r }));
    fn(rows);
    map[day] = rows;
    this.byDay.set(map);
  }

  protected set(day: number, i: number, k: 'start' | 'end', v: string): void {
    this.edit(day, (rows) => (rows[i][k] = v));
  }

  protected add(day: number): void {
    this.edit(day, (rows) => {
      const last = rows[rows.length - 1];
      rows.push(last ? { start: last.end, end: last.end < '20:00' ? addHours(last.end, 2) : '23:00' } : { start: '07:00', end: '15:00' });
    });
  }

  protected remove(day: number, i: number): void {
    this.edit(day, (rows) => rows.splice(i, 1));
  }

  protected copyMonday(): void {
    const monday = this.byDay()[1] ?? [];
    const map = { ...this.byDay() };
    for (const d of [2, 3, 4, 5]) map[d] = monday.map((r) => ({ ...r }));
    this.byDay.set(map);
  }

  protected clear(): void {
    const map: Record<number, Row[]> = {};
    for (const d of WEEKDAYS) map[d.value] = [];
    this.byDay.set(map);
  }

  protected save(): void {
    if (!this.problem()) this.saved.emit(this.blocks());
  }
}

function fmt(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

function addHours(t: string, h: number): string {
  const m = Math.min(toMin(t) + h * 60, 23 * 60 + 59);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function key(list: readonly ScheduleBlock[]): string {
  return [...list].map((b) => `${b.weekday}-${b.starts_at}-${b.ends_at}`).sort().join('|');
}
