import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { STATUS_META, TYPE_META, Task, isLate } from '../../models/task.model';

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

/**
 * Componente · calendario semanal (week-calendar, W-E1): filas por persona o
 * propiedad, columnas por día. Las tareas son bloques con el color de su
 * estado; arrastrar a otra fila reasigna y a otra columna reprograma. Como en
 * los calendarios de equipo de Breezeway o Coast, "Sin asignar" va arriba.
 */
@Component({
  selector: 'app-week-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, IconComponent],
  template: `
    <div class="wrap overflow-x-auto rounded-card border border-border-card bg-surface shadow-e1">
      <div class="wk grid" role="grid" aria-label="Semana">
        <div class="head sticky left-0 z-[2] border-b border-divider bg-surface px-4 py-3 text-[10.5px] uppercase tracking-[1px] text-text-secondary" role="columnheader">
          {{ by() === 'person' ? 'Colaborador' : 'Propiedad' }}
        </div>
        @for (d of days(); track d.key) {
          <div class="head border-b border-l border-divider px-3 py-2.5" [class.is-today]="d.today" role="columnheader">
            <div class="text-[10.5px] uppercase tracking-[1px]" [class]="d.today ? 'text-secondary font-bold' : 'text-text-secondary'">{{ d.weekday }}</div>
            <div class="font-display text-[20px] font-semibold leading-tight text-primary">{{ d.day }}</div>
          </div>
        }

        @for (r of rows(); track r.id ?? 'none'; let ri = $index) {
          <div class="rowhead sticky left-0 z-[1] flex items-center gap-2.5 border-b border-divider bg-surface px-4 py-3" [class.is-unassigned]="r.kind === 'unassigned'" role="rowheader">
            @if (r.kind === 'person') {
              <app-avatar [initials]="r.initials ?? ''" [name]="r.title" [size]="30" />
            } @else if (r.kind === 'unassigned') {
              <span class="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-pill border border-dashed border-warning text-warning"><app-icon name="user-plus" [size]="15" /></span>
            }
            <div class="min-w-0">
              <div class="truncate text-[13px] font-bold text-primary">{{ r.title }}</div>
              <div class="truncate text-[11.5px] text-text-secondary">{{ r.subtitle }}</div>
            </div>
          </div>
          @for (d of days(); track d.key) {
            @let cell = cells()[(r.id ?? 'none') + '|' + d.key] ?? [];
            <div
              class="cell flex min-h-[78px] flex-col gap-1.5 border-b border-l border-divider p-1.5"
              [class.is-today]="d.today"
              [class.is-over]="over() === (r.id ?? 'none') + '|' + d.key"
              [class.is-unassigned]="r.kind === 'unassigned'"
              role="gridcell"
              (dragover)="onOver($event, r, d)"
              (dragleave)="over.set(null)"
              (drop)="onDrop($event, r, d)"
            >
              @for (t of cell; track t.id) {
                @let late = isLate(t);
                <button
                  type="button"
                  class="block-t text-left"
                  [class.is-late]="late"
                  [class.is-flash]="flash() === t.id"
                  [class.is-muted]="t.status === 'cancelled'"
                  [style.--c]="meta[t.status].color"
                  [attr.draggable]="canDrag() && movable(t)"
                  [attr.aria-label]="label(t, late)"
                  (dragstart)="onStart($event, t)"
                  (dragend)="dragging.set(null); over.set(null)"
                  (click)="open.emit(t)"
                >
                  <span class="flex items-center gap-1">
                    <span class="tabular text-[11px] font-bold text-primary">{{ t.start }}</span>
                    @if (late) {
                      <app-icon name="clock" [size]="12" class="text-warning" />
                    } @else if (t.status === 'validated') {
                      <app-icon name="check-double" [size]="12" class="text-primary" />
                    } @else if (t.status === 'done') {
                      <app-icon name="check" [size]="12" class="text-success" />
                    }
                    @if (t.priority === 'high') {
                      <span class="ml-auto h-1.5 w-1.5 rounded-pill bg-danger" aria-hidden="true"></span>
                    }
                  </span>
                  <span class="block truncate text-[12px] font-bold text-text-body">{{ by() === 'person' ? t.property_code : (t.assignee_name ?? 'Sin asignar') }}</span>
                  <span class="block truncate text-[11px] text-text-secondary">{{ types[t.type].short }}</span>
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
    .wk { grid-template-columns: 184px repeat(7, minmax(118px, 1fr)); min-width: 1010px; }
    @media (max-width: 639px) { .wk { grid-template-columns: 128px repeat(7, 112px); min-width: 912px; } }
    .head.is-today, .cell.is-today { background: color-mix(in srgb, var(--color-teal-washed) 55%, transparent); }
    .rowhead.is-unassigned, .cell.is-unassigned { background: color-mix(in srgb, var(--color-warning-soft) 45%, white); }
    .cell { transition: background-color var(--dur-fast); }
    .cell.is-over { background: rgba(197, 135, 60, 0.12); box-shadow: inset 0 0 0 2px var(--color-secondary); }
    .block-t { position: relative; width: 100%; border-radius: 7px; padding: 5px 7px 5px 9px; background: color-mix(in srgb, var(--c) 9%, white); border: 1px solid color-mix(in srgb, var(--c) 22%, white); transition: transform var(--spring-snappy-dur) var(--spring-snappy), box-shadow var(--dur-fast); }
    .block-t::before { content: ''; position: absolute; left: 0; top: 4px; bottom: 4px; width: 3px; border-radius: 0 3px 3px 0; background: var(--c); }
    .block-t:hover { box-shadow: var(--shadow-e2); transform: translateY(-1px); }
    .block-t[draggable='true'] { cursor: grab; }
    .block-t.is-late { background: repeating-linear-gradient(135deg, var(--color-warning-soft) 0 6px, #fff8ec 6px 12px); border-color: color-mix(in srgb, var(--color-warning) 40%, white); }
    .block-t.is-late::before { background: var(--color-warning); }
    .block-t.is-muted { opacity: 0.5; text-decoration: line-through; }
    .block-t.is-flash { animation: flash 1.6s var(--ease-standard); }
    @keyframes flash { 0%, 40% { box-shadow: 0 0 0 3px rgba(197, 135, 60, 0.55); } }
    @media (prefers-reduced-motion: reduce) { .block-t, .block-t.is-flash { transition: none; animation: none; } }
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
  protected readonly isLate = isLate;
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
