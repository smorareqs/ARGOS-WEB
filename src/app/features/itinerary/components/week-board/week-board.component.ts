import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { DimIconComponent } from '../../../../shared/atoms/dim-icon/dim-icon.component';
import { STATUS_META, TYPE_META, Task, TaskType, isLate, progress } from '../../models/task.model';

export interface WeekRow {
  /** id de persona o propiedad; `null` = fila "Sin asignar". */
  readonly id: string | null;
  readonly title: string;
  readonly subtitle: string;
  readonly initials?: string;
  readonly kind: 'person' | 'property' | 'unassigned';
}

export interface WeekDrop {
  readonly task: Task;
  readonly rowId: string | null;
  readonly date: string;
}

export interface WeekDay {
  readonly key: string;
  readonly weekday: string;
  readonly day: number;
  readonly today: boolean;
}

type Badge = 'late' | 'validated' | 'done' | 'progress' | 'returned' | 'none';

/**
 * Componente · calendario semanal (week-calendar, W-E1): filas por persona o
 * propiedad, columnas por día. Cada tarea es un bloque del color de su tipo
 * con su ícono con volumen (ref. los eventos de Google Calendar) y una
 * insignia de estado: la retrasada late en rojo, la que está en curso lleva
 * barra de avance y las finalizadas se atenúan. Arrastrar a otra fila
 * reasigna y a otra columna reprograma. Como en Breezeway o Coast, "Sin
 * asignar" va arriba.
 */
@Component({
  selector: 'app-week-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, IconComponent, DimIconComponent],
  template: `
    <!-- Leyenda: cada tipo con su ícono y su color -->
    <div class="mb-3 flex flex-wrap items-center gap-2">
      @for (k of typeKeys; track k) {
        <span class="legend" [style.--bg]="types[k].bg" [style.--ink]="types[k].ink">
          <app-dim-icon [name]="types[k].dim" [size]="22" [animate]="false" />{{ types[k].short }}
        </span>
      }
      <span class="legend late-chip"><span class="h-2 w-2 rounded-pill bg-danger"></span>Retrasada</span>
    </div>
    <div class="wrap overflow-x-auto rounded-card border border-border-card bg-surface shadow-e1">
      <div class="wk grid" role="grid" aria-label="Semana">
        <div class="head sticky left-0 z-[2] flex items-end border-b border-divider bg-surface px-4 py-3 text-[10.5px] uppercase tracking-[1px] text-text-secondary" role="columnheader">
          {{ by() === 'person' ? 'Colaborador' : 'Propiedad' }}
        </div>
        @for (d of days(); track d.key) {
          <div class="head border-b border-l border-divider px-3 py-2.5" [class.is-today]="d.today" role="columnheader">
            <div class="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[1px]" [class]="d.today ? 'text-secondary font-bold' : 'text-text-secondary'">
              {{ d.weekday }}
              @if (d.today) {
                <span class="today">Hoy</span>
              }
            </div>
            <div class="flex items-baseline gap-2">
              <span class="font-display text-[24px] font-semibold leading-tight text-primary">{{ d.day }}</span>
              @if (perDay()[d.key]; as n) {
                <span class="text-[11px] text-text-secondary">{{ n }} {{ n === 1 ? 'tarea' : 'tareas' }}</span>
              }
            </div>
          </div>
        }

        @for (r of rows(); track r.id ?? 'none'; let ri = $index) {
          <div class="rowhead sticky left-0 z-[1] flex items-center gap-2.5 border-b border-divider bg-surface px-4 py-3" [class.is-unassigned]="r.kind === 'unassigned'" role="rowheader">
            @if (r.kind === 'person') {
              <app-avatar [initials]="r.initials ?? ''" [name]="r.title" [size]="38" />
            } @else if (r.kind === 'unassigned') {
              <span class="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-pill border-2 border-dashed border-warning text-warning"><app-icon name="user-plus" [size]="17" /></span>
            } @else {
              <app-dim-icon name="house" [size]="36" [animate]="false" />
            }
            <div class="min-w-0">
              <div class="truncate text-[13.5px] font-bold text-primary">{{ r.title }}</div>
              <div class="truncate text-[11.5px] text-text-secondary">{{ r.subtitle }}</div>
            </div>
          </div>
          @for (d of days(); track d.key) {
            @let cell = cells()[(r.id ?? 'none') + '|' + d.key] ?? [];
            <div
              class="cell flex min-h-[86px] flex-col gap-1.5 border-b border-l border-divider p-1.5"
              [class.is-today]="d.today"
              [class.is-over]="over() === (r.id ?? 'none') + '|' + d.key"
              [class.is-unassigned]="r.kind === 'unassigned'"
              role="gridcell"
              (dragover)="onOver($event, r, d)"
              (dragleave)="over.set(null)"
              (drop)="onDrop($event, r, d)"
            >
              @for (t of cell; track t.id; let ti = $index) {
                @let late = isLate(t);
                @let b = badge(t, late);
                <button
                  type="button"
                  class="block-t group text-left"
                  [class.is-late]="late"
                  [class.is-closed]="t.status === 'done' || t.status === 'validated'"
                  [class.is-flash]="flash() === t.id"
                  [class.is-muted]="t.status === 'cancelled'"
                  [style.--bg]="types[t.type].bg"
                  [style.--ink]="types[t.type].ink"
                  [style.--i]="ri * 2 + ti"
                  [attr.draggable]="canDrag() && movable(t)"
                  [attr.aria-label]="label(t, late)"
                  (dragstart)="onStart($event, t)"
                  (dragend)="dragging.set(null); over.set(null)"
                  (click)="open.emit(t)"
                >
                  <span class="flex items-center gap-1.5">
                    <app-dim-icon [name]="types[t.type].dim" [size]="26" class="-my-1 -ml-0.5" />
                    <span class="tabular text-[11.5px] font-bold" [style.color]="types[t.type].ink">{{ t.start }}</span>
                    @if (t.priority === 'high') {
                      <span class="h-1.5 w-1.5 rounded-pill bg-danger" title="Prioridad alta"></span>
                    }
                    @if (b !== 'none') {
                      <span [class]="'badge ' + b" [title]="late ? 'Retrasada' : meta[t.status].label">
                        @switch (b) {
                          @case ('late') { <app-icon name="clock" [size]="11" /> }
                          @case ('validated') { <app-icon name="check-double" [size]="11" /> }
                          @case ('done') { <app-icon name="check" [size]="11" /> }
                          @case ('progress') { <span class="live"></span> }
                          @case ('returned') { <app-icon name="undo" [size]="11" /> }
                        }
                      </span>
                    }
                  </span>
                  <span class="mt-1 block truncate text-[12.5px] font-extrabold text-primary">{{ by() === 'person' ? t.property_code : (t.assignee_name ?? 'Sin asignar') }}</span>
                  <span class="block truncate text-[11px] font-semibold" [style.color]="types[t.type].ink">{{ types[t.type].short }}</span>
                  @if (t.status === 'in_progress') {
                    <span class="bar"><span [style.width.%]="pct(t)"></span></span>
                  }
                </button>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .legend { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px 0 5px; border-radius: var(--radius-pill);
      background: var(--bg, #fff); color: var(--ink, var(--color-primary)); font-size: 12px; font-weight: 700; }
    .late-chip { padding-left: 11px; background: repeating-linear-gradient(135deg, var(--color-warning-soft) 0 6px, #fff8ec 6px 12px); color: var(--color-danger); }
    .wk { grid-template-columns: 196px repeat(7, minmax(128px, 1fr)); min-width: 1100px; }
    @media (max-width: 639px) { .wk { grid-template-columns: 132px repeat(7, 124px); min-width: 1000px; } }
    .head.is-today, .cell.is-today { background: color-mix(in srgb, #fdecc8 45%, transparent); }
    .today { border-radius: var(--radius-pill); background: var(--color-secondary); color: #fff; padding: 1px 7px; font-size: 9.5px; letter-spacing: .6px; }
    .rowhead.is-unassigned, .cell.is-unassigned { background: color-mix(in srgb, var(--color-warning-soft) 28%, white); }
    .cell.is-over { background: rgba(197, 135, 60, .12); box-shadow: inset 0 0 0 2px var(--color-secondary); }
    .block-t { position: relative; width: 100%; border-radius: 10px; padding: 6px 8px 7px; background: var(--bg);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ink) 14%, transparent), 0 1px 2px rgba(0,56,65,.06);
      animation: blk-in 380ms var(--spring-standard) backwards; animation-delay: calc(min(var(--i), 20) * 18ms);
      transition: transform var(--spring-snappy-dur) var(--spring-snappy), box-shadow var(--dur-fast), opacity var(--dur-fast); }
    @keyframes blk-in { from { opacity: 0; transform: translateY(6px) scale(.97); } }
    .block-t:hover { transform: translateY(-2px); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ink) 30%, transparent), 0 8px 18px -6px rgba(0,56,65,.28); }
    .block-t[draggable='true'] { cursor: grab; }
    .block-t.is-closed { opacity: .6; }
    .block-t.is-closed:hover { opacity: 1; }
    .block-t.is-late { background: repeating-linear-gradient(135deg, var(--color-warning-soft) 0 7px, #fff8ec 7px 14px);
      box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--color-danger) 45%, white); }
    .block-t.is-muted { opacity: .45; text-decoration: line-through; }
    .block-t.is-flash { animation: flash 1.6s var(--ease-standard); }
    @keyframes flash { 0%, 40% { box-shadow: 0 0 0 3px rgba(197,135,60,.55); } }
    .badge { margin-left: auto; display: grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; color: #fff; }
    .badge.done { background: var(--color-success); }
    .badge.validated { background: var(--color-primary); }
    .badge.returned { background: var(--color-warning); }
    .badge.late { background: var(--color-danger); animation: beat 1.6s ease-in-out infinite; }
    .badge.progress { background: #fff; box-shadow: inset 0 0 0 1.5px var(--color-secondary); }
    .live { width: 7px; height: 7px; border-radius: 50%; background: var(--color-secondary); animation: beat 1.2s ease-in-out infinite; }
    @keyframes beat { 50% { transform: scale(.78); opacity: .7; } }
    .bar { display: block; height: 4px; margin-top: 5px; border-radius: 4px; background: rgba(255,255,255,.75); overflow: hidden; }
    .bar > span { display: block; height: 100%; border-radius: 4px; background: var(--ink); }
    @media (prefers-reduced-motion: reduce) { .block-t, .badge, .live { animation: none !important; transition: none; } }
  `,
})
export class WeekBoardComponent {
  readonly days = input.required<readonly WeekDay[]>();
  readonly rows = input.required<readonly WeekRow[]>();
  readonly tasks = input.required<readonly Task[]>();
  readonly by = input<'person' | 'property'>('person');
  readonly canDrag = input<boolean>(false);
  readonly flash = input<string | null>(null);
  readonly open = output<Task>();
  readonly dropped = output<WeekDrop>();

  protected readonly meta = STATUS_META;
  protected readonly types = TYPE_META;
  protected readonly typeKeys = Object.keys(TYPE_META) as TaskType[];
  protected readonly isLate = isLate;
  protected readonly pct = progress;
  protected readonly over = signal<string | null>(null);
  protected readonly dragging = signal<Task | null>(null);

  protected readonly cells = computed(() => {
    const out: Partial<Record<string, Task[]>> = {};
    const byPerson = this.by() === 'person';
    for (const t of this.tasks()) {
      const row = byPerson ? (t.assignee_id ?? 'none') : t.property_id;
      (out[`${row}|${t.date}`] ??= []).push(t);
    }
    for (const k of Object.keys(out)) out[k]?.sort((a, b) => a.start.localeCompare(b.start));
    return out;
  });

  /** Tareas por día (para el encabezado). */
  protected readonly perDay = computed(() => {
    const out: Partial<Record<string, number>> = {};
    for (const t of this.tasks()) out[t.date] = (out[t.date] ?? 0) + 1;
    return out;
  });

  protected badge(t: Task, late: boolean): Badge {
    if (late) return 'late';
    if (t.status === 'validated') return 'validated';
    if (t.status === 'done') return 'done';
    if (t.status === 'in_progress') return 'progress';
    if (t.status === 'returned') return 'returned';
    return 'none';
  }

  protected movable(t: Task): boolean {
    return t.status === 'pending' || t.status === 'returned';
  }

  protected label(t: Task, late: boolean): string {
    return `${TYPE_META[t.type].label} en ${t.property_name}, ${t.start} a ${t.end}, ${STATUS_META[t.status].label}${late ? ', retrasada' : ''}`;
  }

  protected onStart(e: DragEvent, t: Task): void {
    this.dragging.set(t);
    e.dataTransfer?.setData('text/plain', t.id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  protected onOver(e: DragEvent, r: WeekRow, d: WeekDay): void {
    const t = this.dragging();
    if (!t) return;
    // Por propiedad solo se reprograma: no se mueve una tarea a otra propiedad.
    if (this.by() === 'property' && r.id !== t.property_id) return;
    e.preventDefault();
    this.over.set(`${r.id ?? 'none'}|${d.key}`);
  }

  protected onDrop(e: DragEvent, r: WeekRow, d: WeekDay): void {
    e.preventDefault();
    const t = this.dragging();
    this.over.set(null);
    this.dragging.set(null);
    if (!t) return;
    const sameRow = this.by() === 'person' ? (t.assignee_id ?? null) === r.id : true;
    if (sameRow && t.date === d.key) return;
    this.dropped.emit({ task: t, rowId: this.by() === 'person' ? r.id : (t.assignee_id ?? null), date: d.key });
  }
}
