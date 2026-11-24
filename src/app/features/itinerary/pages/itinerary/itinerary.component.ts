import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ItineraryStore } from '../../store/itinerary.store';
import { STATUS_META, TYPE_META, Task, TaskDraft, TaskMove, TaskType, isLate, progress } from '../../models/task.model';
import { WeekBoardComponent, WeekDay, WeekDrop, WeekRow } from '../../components/week-board/week-board.component';
import { TaskDetailComponent } from '../../components/task-detail/task-detail.component';
import { TaskFormComponent } from '../../components/task-form/task-form.component';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { CanDirective } from '../../../../core/auth/can.directive';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { BoardCardDirective, BoardComponent, BoardMove } from '../../../../shared/organisms/board/board.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { addDays, mondayOf, toDayKey } from '../../../../shared/utils/time';

const WEEKDAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const MOVE_REASONS = ['Cambio de turno', 'Huésped salió tarde', 'Llegada adelantada', 'Balancear carga'];

/**
 * Screen · Itinerario (W-E1 calendario semanal, W-E2 tablero del día, W-E3
 * ficha de tarea, W-E4 nueva tarea). Todo el estado de vista vive en la URL:
 * `?vista=hoy&por=propiedad&semana=AAAA-MM-DD&tarea=ID`.
 */
@Component({
  selector: 'app-itinerary-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    WeekBoardComponent,
    TaskDetailComponent,
    TaskFormComponent,
    CanDirective,
    PageHeaderComponent,
    DemoDataNoteComponent,
    SegmentedComponent,
    EmptyStateComponent,
    BoardComponent,
    BoardCardDirective,
    DrawerComponent,
    ButtonComponent,
    IconComponent,
    SelectComponent,
    AvatarComponent,
    BadgeComponent,
  ],
  providers: [ItineraryStore],
  template: `
    @let s = store.today();
    <app-page-header
      title="Itinerario"
      eyebrow="Operación"
      [subtitle]="store.loading() ? 'Cargando el plan de la semana…' : 'Hoy: ' + s.done + ' de ' + s.total + ' tareas hechas · ' + s.late + (s.late === 1 ? ' retrasada' : ' retrasadas') + ' · ' + s.toValidate + ' por validar'"
    >
      <app-button *argosCan="'tasks.manage'" variant="tertiary" [loading]="store.busy() === 'generate'" (pressed)="store.generate(monday())">
        <app-icon name="refresh" [size]="16" /> Generar desde reservas
      </app-button>
      <app-button *argosCan="'tasks.manage'" variant="primary" (pressed)="openCreate()"><app-icon name="plus" [size]="17" /> Nueva tarea</app-button>
    </app-page-header>
    <app-demo-data-note module="itinerary" label="Itinerario" />

    <div class="toolbar reveal sticky top-16 z-20 -mx-2 mt-2 flex flex-wrap items-center gap-3 rounded-card px-2 py-2.5" style="--i: 1">
      <app-segmented [options]="viewOptions" [value]="view()" (valueChange)="set('vista', $event === 'hoy' ? 'hoy' : null)" ariaLabel="Vista" />
      @if (view() === 'semana') {
        <div class="flex items-center gap-1 rounded-field border border-border-card bg-surface p-1">
          <button type="button" class="nav-btn" aria-label="Semana anterior" (click)="shiftWeek(-1)"><app-icon name="chevron-left" [size]="17" /></button>
          <span class="tabular min-w-[150px] px-1 text-center text-[13px] font-bold text-primary">{{ monday() | date: 'd MMM' }} – {{ sunday() | date: 'd MMM' }}</span>
          <button type="button" class="nav-btn" aria-label="Semana siguiente" (click)="shiftWeek(1)"><app-icon name="chevron-right" [size]="17" /></button>
        </div>
        @if (!isThisWeek()) {
          <app-button variant="ghost" size="sm" (pressed)="set('semana', null)">Esta semana</app-button>
        }
        <app-segmented [options]="byOptions" [value]="by()" (valueChange)="set('por', $event === 'property' ? 'propiedad' : null)" [compact]="true" ariaLabel="Agrupar por" />
      }
      <div class="ml-auto flex w-full gap-2.5 sm:w-auto">
        <app-select class="flex-1 sm:w-[190px]" [compact]="true" [options]="typeOptions" [value]="tipo() ?? 'all'" (changed)="set('tipo', $event === 'all' ? null : $event)" ariaLabel="Tipo" />
        @if (buildingOptions().length > 2) {
          <app-select class="flex-1 sm:w-[200px]" [compact]="true" [options]="buildingOptions()" [value]="edificio() ?? 'all'" (changed)="set('edificio', $event === 'all' ? null : $event)" ariaLabel="Edificio" />
        }
      </div>
    </div>

    <div class="mt-4">
      @if (store.error(); as err) {
        <div class="rounded-card border border-border-card bg-surface shadow-e1">
          <app-empty-state kind="error" title="No pudimos cargar el itinerario" [message]="err">
            <app-button variant="secondary" (pressed)="store.load(monday())"><app-icon name="refresh" [size]="16" /> Reintentar</app-button>
          </app-empty-state>
        </div>
      } @else if (store.loading()) {
        <div class="skeleton h-[520px] w-full !rounded-card"></div>
      } @else if (view() === 'semana') {
        <app-week-board
          class="reveal"
          style="--i: 2"
          [days]="days()"
          [rows]="rows()"
          [tasks]="weekTasks()"
          [by]="by()"
          [canDrag]="store.canAssign()"
          [flash]="store.flash()"
          (open)="openTask($event)"
          (dropped)="onDrop($event)"
        />
        <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-text-secondary">
          @for (k of legend; track k) {
            <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-[3px]" [style.background]="status[k].color"></span>{{ status[k].label }}</span>
          }
          <span class="flex items-center gap-1.5"><span class="late-swatch h-2.5 w-4 rounded-[3px]"></span>Retrasada</span>
          @if (store.canAssign()) {
            <span class="ml-auto hidden items-center gap-1.5 lg:flex"><app-icon name="swap" [size]="14" /> Arrastra un bloque pendiente a otra fila o día para reasignar o reprogramar.</span>
          }
        </div>
      } @else {
        <app-board
          class="reveal"
          style="--i: 2"
          [columns]="dayColumns"
          [items]="todayTasks()"
          [columnOf]="columnOf"
          [keyOf]="keyOf"
          [canDrag]="canValidateDrag"
          (moved)="onBoardMove($event)"
        >
          <ng-template appBoardCard let-t>
            @let late = isLate(t);
            <button type="button" class="tcard w-full overflow-hidden rounded-tile border border-border-card bg-surface text-left shadow-e1" [class.is-late]="late" (click)="openTask(t)">
              @if (late) {
                <span class="flex items-center gap-1.5 bg-warning-soft px-3 py-1 text-[11px] font-bold text-warning"><app-icon name="clock" [size]="12" /> Retrasada · ventana hasta {{ t.end }}</span>
              }
              <span class="block px-3.5 pb-3 pt-3">
                <span class="flex items-center justify-between gap-2">
                  <span class="font-mono text-[11px] font-bold text-teal-muted">{{ t.property_code }}</span>
                  <span class="tabular text-[11.5px] text-text-secondary">{{ t.start }}–{{ t.end }}</span>
                </span>
                <span class="mt-1 block truncate text-[13.5px] font-bold text-primary">{{ t.property_name }}</span>
                <span class="block text-[12px] text-text-secondary">{{ typeLabel(t) }}</span>
                @if (t.status === 'in_progress') {
                  <span class="mt-2.5 block h-[4px] overflow-hidden rounded-pill bg-track"><span class="block h-full rounded-pill bg-secondary" [style.width.%]="progress(t)"></span></span>
                }
                <span class="mt-3 flex items-center gap-2">
                  @if (t.assignee_name) {
                    <app-avatar [initials]="t.assignee_name.slice(0, 1)" [name]="t.assignee_name" [size]="22" />
                    <span class="truncate text-[12px] text-text-body">{{ t.assignee_name }}</span>
                  } @else {
                    <span class="text-[12px] font-bold text-warning">Sin asignar</span>
                  }
                  @if (t.status === 'returned') {
                    <app-badge class="ml-auto" tone="warning" size="sm">Devuelta</app-badge>
                  } @else if (t.photos) {
                    <span class="ml-auto flex items-center gap-1 text-[11.5px] text-text-secondary"><app-icon name="eye" [size]="13" />{{ t.photos }}</span>
                  }
                </span>
              </span>
            </button>
          </ng-template>
        </app-board>
        @if (store.canValidate()) {
          <p class="mt-3 text-[12px] text-text-secondary">Arrastra una tarea finalizada a "Validadas" para aprobarla, o ábrela para revisar las evidencias antes.</p>
        }
      }
    </div>

    <app-drawer [open]="!!selected()" (openChange)="!$event && set('tarea', null)" label="Ficha de tarea" [width]="520">
      @if (selected(); as t) {
        <app-task-detail [task]="t" [people]="store.people()" [canAssign]="store.canAssign()" [busy]="store.busy() === t.id" (move)="moveFromDetail(t, $event)" />
      }
      @if (selected(); as t) {
        @if (t.status === 'done' || t.status === 'pending' || t.status === 'in_progress' || t.status === 'returned') {
          <div drawer-footer class="material-glass flex flex-wrap justify-end gap-2.5 border-t border-divider px-6 py-4">
            @if (store.canManage() && t.status !== 'done') {
              <app-button variant="ghost" (pressed)="cancelTask(t)">Cancelar tarea</app-button>
            }
            @if (t.status === 'done' && store.canValidate()) {
              <app-button variant="tertiary" [disabled]="store.busy() === t.id" (pressed)="returnTask(t)"><app-icon name="undo" [size]="16" /> Devolver</app-button>
              <app-button variant="primary" [loading]="store.busy() === t.id" (pressed)="store.setStatus(t, 'validated')"><app-icon name="check-double" [size]="16" /> Validar</app-button>
            }
          </div>
        }
      }
    </app-drawer>

    <app-drawer [open]="creating()" (openChange)="!$event && set('nueva', null)" label="Nueva tarea" [width]="520">
      @if (creating()) {
        <app-task-form
          [properties]="store.properties()"
          [people]="store.people()"
          [tasks]="store.tasks()"
          [saving]="store.saving()"
          [serverError]="store.saveError()"
          [preset]="preset()"
          (submitted)="create($event)"
          (cancel)="set('nueva', null)"
        />
      }
    </app-drawer>
  `,
  styles: `
    .toolbar { background: var(--glass-bg); -webkit-backdrop-filter: var(--glass-filter); backdrop-filter: var(--glass-filter); }
    .nav-btn { display: flex; height: 30px; width: 30px; align-items: center; justify-content: center; border-radius: 6px; color: var(--color-primary); }
    .nav-btn:hover { background: var(--color-teal-washed); }
    .late-swatch { background: repeating-linear-gradient(135deg, var(--color-warning-soft) 0 3px, var(--color-warning) 3px 4px); }
    .tcard { transition: box-shadow var(--dur-fast), transform var(--spring-snappy-dur) var(--spring-snappy); }
    .tcard:hover { box-shadow: var(--shadow-e2); transform: translateY(-1px); }
    .tcard.is-late { border-color: color-mix(in srgb, var(--color-warning) 35%, white); }
  `,
})
export class ItineraryComponent {
  protected readonly store = inject(ItineraryStore);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly vista = input<string | undefined>();
  readonly por = input<string | undefined>();
  readonly semana = input<string | undefined>();
  readonly tarea = input<string | undefined>();
  readonly nueva = input<string | undefined>();
  readonly tipo = input<string | undefined>();
  readonly edificio = input<string | undefined>();

  protected readonly status = STATUS_META;
  protected readonly types = TYPE_META;
  protected readonly isLate = isLate;
  protected readonly progress = progress;
  protected readonly typeLabel = (t: Task) => TYPE_META[t.type].label;
  protected readonly legend = ['pending', 'in_progress', 'done', 'validated'] as const;
  protected readonly viewOptions = [
    { value: 'semana', label: 'Semana', icon: 'itinerary' as const },
    { value: 'hoy', label: 'Hoy', icon: 'grid' as const },
  ];
  protected readonly byOptions = [
    { value: 'person', label: 'Personas' },
    { value: 'property', label: 'Propiedades' },
  ];
  protected readonly typeOptions = [
    { value: 'all', label: 'Todos los tipos' },
    ...(Object.keys(TYPE_META) as TaskType[]).map((t) => ({ value: t, label: TYPE_META[t].label })),
  ];
  protected readonly dayColumns = [
    { key: 'pending', label: 'Pendientes', color: STATUS_META.pending.color, empty: 'Nada pendiente para hoy' },
    { key: 'in_progress', label: 'En progreso', color: STATUS_META.in_progress.color, empty: 'Nadie trabajando ahora' },
    { key: 'done', label: 'Por validar', color: STATUS_META.done.color, empty: 'Todo lo finalizado ya se validó' },
    { key: 'validated', label: 'Validadas', color: STATUS_META.validated.color, empty: 'Aún no hay validadas hoy' },
  ];
  protected readonly columnOf = (t: Task) => (t.status === 'returned' ? 'pending' : t.status);
  protected readonly keyOf = (t: Task) => t.id;
  protected readonly canValidateDrag = (t: Task) => t.status === 'done' && this.store.canValidate();

  protected readonly view = computed(() => (this.vista() === 'hoy' ? 'hoy' : 'semana'));
  protected readonly by = computed<'person' | 'property'>(() => (this.por() === 'propiedad' ? 'property' : 'person'));
  protected readonly monday = computed(() => {
    const raw = this.semana();
    const base = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date();
    return mondayOf(base);
  });
  protected readonly sunday = computed(() => addDays(this.monday(), 6));
  protected readonly isThisWeek = computed(() => toDayKey(this.monday()) === toDayKey(mondayOf(new Date())));
  protected readonly days = computed<WeekDay[]>(() => {
    const today = toDayKey(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(this.monday(), i);
      return { key: toDayKey(d), weekday: WEEKDAYS[i], day: d.getDate(), today: toDayKey(d) === today };
    });
  });

  private readonly filtered = computed(() => {
    const type = this.tipo();
    const b = this.edificio();
    return this.store.tasks().filter((t) => (!type || t.type === type) && (!b || t.building_id === b));
  });
  protected readonly weekTasks = computed(() => {
    const from = toDayKey(this.monday());
    const to = toDayKey(this.sunday());
    return this.filtered().filter((t) => t.date >= from && t.date <= to);
  });
  protected readonly todayTasks = computed(() => {
    const k = toDayKey(new Date());
    return this.filtered()
      .filter((t) => t.date === k && t.status !== 'cancelled')
      .sort((a, b) => Number(isLate(b)) - Number(isLate(a)) || a.start.localeCompare(b.start));
  });

  protected readonly rows = computed<WeekRow[]>(() => {
    const tasks = this.weekTasks();
    if (this.by() === 'property') {
      const ids = new Set(tasks.map((t) => t.property_id));
      return this.store
        .properties()
        .filter((p) => ids.has(p.id) || !this.edificio() || p.building_id === this.edificio())
        .filter((p) => !this.edificio() || p.building_id === this.edificio())
        .map((p) => ({ id: p.id, title: p.code, subtitle: p.name, kind: 'property' as const }));
    }
    const count = (id: string | null) => tasks.filter((t) => t.assignee_id === id && t.status !== 'cancelled').length;
    const unassigned = count(null);
    return [
      { id: null, title: 'Sin asignar', subtitle: unassigned ? `${unassigned} por asignar` : 'Todo asignado', kind: 'unassigned' as const },
      ...this.store.people().map((p) => ({ id: p.id, title: p.name, subtitle: `${count(p.id)} ${count(p.id) === 1 ? 'tarea' : 'tareas'} · ${p.role}`, initials: p.initials, kind: 'person' as const })),
    ];
  });

  protected readonly buildingOptions = computed(() => {
    const seen = new Map<string, string>();
    for (const p of this.store.properties()) if (p.building_id && p.building_name) seen.set(p.building_id, p.building_name);
    return [{ value: 'all', label: 'Todos los edificios' }, ...[...seen].map(([value, label]) => ({ value, label }))];
  });

  protected readonly selected = computed(() => {
    const id = this.tarea();
    return id ? (this.store.tasks().find((t) => t.id === id) ?? null) : null;
  });
  protected readonly creating = computed(() => this.nueva() !== undefined);
  protected readonly preset = computed<Partial<TaskDraft> | null>(() => {
    const n = this.nueva();
    if (!n || n === '1') return null;
    const p = this.store.properties().find((x) => x.code === n || x.id === n);
    return p ? { property_id: p.id } : null;
  });

  constructor() {
    let lastWeek = '';
    effect(() => {
      const key = toDayKey(this.monday());
      if (key === lastWeek) return;
      lastWeek = key;
      untracked(() => void this.store.load(this.monday()));
    });
  }

  protected set(key: string, value: string | null): void {
    void this.router.navigate([], { queryParams: { [key]: value }, queryParamsHandling: 'merge', replaceUrl: key !== 'tarea' && key !== 'nueva' });
  }

  protected shiftWeek(n: number): void {
    const next = addDays(this.monday(), n * 7);
    this.set('semana', toDayKey(next) === toDayKey(mondayOf(new Date())) ? null : toDayKey(next));
  }

  protected openTask(t: Task): void {
    this.set('tarea', t.id);
  }

  protected openCreate(): void {
    this.store.clearSaveError();
    this.set('nueva', '1');
  }

  protected async create(d: TaskDraft): Promise<void> {
    const t = await this.store.create(d);
    if (t) this.set('nueva', null);
  }

  protected async onDrop(d: WeekDrop): Promise<void> {
    const t = d.task;
    const person = d.rowId ? (this.store.people().find((p) => p.id === d.rowId)?.name ?? 'otra persona') : null;
    const changes: string[] = [];
    if (d.date !== t.date) changes.push(`pasa al ${d.date.split('-').reverse().slice(0, 2).join('/')}`);
    if (d.rowId !== t.assignee_id) changes.push(person ? `queda con ${person}` : 'queda sin asignar');
    const reason = await this.confirm.askReason({
      title: `Mover la tarea #${t.number}`,
      message: `${TYPE_META[t.type].label} en ${t.property_name} ${changes.join(' y ')}. La persona recibe el aviso en la app.`,
      confirmLabel: 'Mover tarea',
      reasons: MOVE_REASONS,
    });
    if (!reason) return;
    await this.store.move(t, { date: d.date !== t.date ? d.date : undefined, assignee_id: d.rowId !== t.assignee_id ? d.rowId : undefined, reason });
  }

  protected async moveFromDetail(t: Task, m: TaskMove): Promise<void> {
    const reason = await this.confirm.askReason({
      title: `Cambiar la tarea #${t.number}`,
      message: 'La persona asignada recibe el aviso en la app.',
      confirmLabel: 'Guardar cambio',
      reasons: MOVE_REASONS,
    });
    if (reason) await this.store.move(t, { ...m, reason });
  }

  protected async onBoardMove(m: BoardMove<Task>): Promise<void> {
    if (m.to === 'validated' && m.item.status === 'done') await this.store.setStatus(m.item, 'validated');
  }

  protected async returnTask(t: Task): Promise<void> {
    const reason = await this.confirm.askReason({
      title: `Devolver la tarea #${t.number}`,
      message: `${t.assignee_name ?? 'El colaborador'} la verá otra vez como pendiente, con tu motivo.`,
      confirmLabel: 'Devolver',
      reasons: ['Faltan fotos', 'Baño sin terminar', 'Falta reponer amenidades'],
    });
    if (reason) await this.store.setStatus(t, 'returned', reason);
  }

  protected async cancelTask(t: Task): Promise<void> {
    const reason = await this.confirm.askReason({
      title: `Cancelar la tarea #${t.number}`,
      message: 'Desaparece de la app del colaborador. No se puede deshacer.',
      confirmLabel: 'Cancelar tarea',
      tone: 'danger',
      reasons: ['Reserva cancelada', 'Duplicada', 'Ya no hace falta'],
    });
    if (reason && (await this.store.setStatus(t, 'cancelled', reason))) this.set('tarea', null);
  }
}
