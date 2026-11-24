import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { SpotIconComponent } from '../../../../shared/atoms/spot-icon/spot-icon.component';
import { PhotoComponent } from '../../../../shared/atoms/photo/photo.component';
import { SelectComponent, SelectOption } from '../../../../shared/atoms/select/select.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { TabsComponent } from '../../../../shared/molecules/tabs/tabs.component';
import { PHOTOS, Photo } from '../../../../shared/media/photos';
import { STATUS_META, TYPE_META, Task, TaskMove, isLate, progress } from '../../models/task.model';
import { Assignable } from '../../services/itinerary-api.service';

const EVIDENCE: readonly Photo[] = [PHOTOS.brightRoom, PHOTOS.cleaning, PHOTOS.lakeRoom, PHOTOS.beachPool];

/**
 * Componente · ficha de tarea en el drawer (W-E3): estado, propiedad,
 * asignado y ventana arriba; pestañas de resumen (checklist por sección),
 * evidencias, consumos y línea de tiempo.
 */
@Component({
  selector: 'app-task-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, BadgeComponent, IconComponent, SpotIconComponent, PhotoComponent, SelectComponent, ButtonComponent, TabsComponent, DatePipe],
  template: `
    @let t = task();
    @let late = isLate(t);
    <header class="border-b border-divider bg-surface px-6 pb-5 pt-6">
      <div class="flex items-start gap-4 pr-10">
        <app-spot-icon [name]="types[t.type].spot" [size]="56" />
        <div class="min-w-0">
          <div class="font-mono text-[11.5px] text-text-secondary">#{{ t.number }} · {{ t.property_code }}</div>
          <h2 class="mt-0.5 font-display text-[22px] font-semibold leading-tight text-primary">{{ types[t.type].label }}</h2>
          <p class="mt-1 text-[13px] text-text-body">{{ t.property_name }}</p>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <app-badge [tone]="status[t.status].tone">{{ status[t.status].label }}</app-badge>
        @if (late) {
          <app-badge tone="warning" icon="clock">Retrasada</app-badge>
        }
        @if (t.priority === 'high') {
          <app-badge tone="danger">Prioridad alta</app-badge>
        }
        @if (t.reservation_code) {
          <app-badge tone="neutral" icon="calendar-check">Reserva {{ t.reservation_code }}</app-badge>
        }
      </div>
      <dl class="mt-5 grid grid-cols-2 gap-4 text-[12.5px]">
        <div>
          <dt class="text-[10.5px] uppercase tracking-[1px] text-text-secondary">Asignado</dt>
          <dd class="mt-1.5 flex items-center gap-2 font-bold text-primary">
            @if (t.assignee_name) {
              <app-avatar [initials]="initialsOf(t.assignee_name)" [name]="t.assignee_name" [size]="26" /> {{ t.assignee_name }}
            } @else {
              <span class="text-warning">Sin asignar</span>
            }
          </dd>
        </div>
        <div>
          <dt class="text-[10.5px] uppercase tracking-[1px] text-text-secondary">Ventana</dt>
          <dd class="mt-1.5 font-bold text-primary"><span class="capitalize">{{ dateOf(t.date) | date: 'EEE d MMM' }}</span> · <span class="tabular">{{ t.start }}–{{ t.end }}</span></dd>
        </div>
      </dl>
    </header>

    <div class="px-6">
      <app-tabs class="mt-2" [options]="tabs()" [(value)]="tab" ariaLabel="Secciones de la tarea" />
    </div>

    <div class="px-6 py-5">
      @switch (tab()) {
        @case ('resumen') {
          <div class="rounded-card border border-border-card bg-surface p-4">
            <div class="flex items-baseline justify-between">
              <span class="text-[12.5px] font-bold text-primary">Checklist</span>
              <span class="tabular font-display text-[22px] font-semibold text-primary">{{ pct() }}%</span>
            </div>
            <div class="mt-2 h-[6px] overflow-hidden rounded-pill bg-track"><div class="h-full rounded-pill bg-primary" [style.width.%]="pct()"></div></div>
            <ul class="mt-4 space-y-2.5">
              @for (s of t.checklist; track s.name) {
                <li class="flex items-center gap-3 text-[12.5px]">
                  <span class="w-[110px] shrink-0 text-text-body">{{ s.name }}</span>
                  <span class="h-[5px] flex-1 overflow-hidden rounded-pill bg-track"><span class="block h-full rounded-pill" [class]="s.done === s.total ? 'bg-success' : 'bg-secondary'" [style.width.%]="(s.done / s.total) * 100"></span></span>
                  <span class="tabular w-10 text-right text-text-secondary">{{ s.done }}/{{ s.total }}</span>
                </li>
              }
            </ul>
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-3 text-[12.5px]">
            <div class="rounded-field bg-surface px-3.5 py-3"><dt class="text-text-secondary">Inicio real</dt><dd class="tabular mt-0.5 font-bold text-primary">{{ t.started_at ? (t.started_at | date: 'HH:mm') : '—' }}</dd></div>
            <div class="rounded-field bg-surface px-3.5 py-3"><dt class="text-text-secondary">Fin real</dt><dd class="tabular mt-0.5 font-bold text-primary">{{ t.finished_at ? (t.finished_at | date: 'HH:mm') : '—' }}</dd></div>
          </dl>
          @if (t.notes) {
            <p class="mt-4 rounded-field border border-border-card bg-surface px-4 py-3 text-[13px] leading-relaxed text-text-body">{{ t.notes }}</p>
          }
          @if (canAssign() && (t.status === 'pending' || t.status === 'returned')) {
            <div class="mt-5 rounded-card border border-border-card bg-surface p-4">
              <h3 class="text-[12.5px] font-bold text-primary">Reasignar o reprogramar</h3>
              <div class="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <app-select [compact]="true" [options]="peopleOptions()" [(value)]="who" ariaLabel="Asignado" />
                <input type="date" class="date-in h-10 rounded-field border border-border-field bg-surface px-3 text-[13px] text-primary" [value]="when()" (input)="when.set($any($event.target).value)" aria-label="Fecha" />
              </div>
              <div class="mt-3 flex justify-end">
                <app-button variant="secondary" size="sm" [disabled]="!changed()" [loading]="busy()" (pressed)="applyMove()">Guardar cambio</app-button>
              </div>
            </div>
          }
        }
        @case ('evidencias') {
          @if (t.photos === 0) {
            <p class="rounded-card border border-dashed border-border-field px-4 py-10 text-center text-[13px] text-text-secondary">Las fotos aparecen aquí cuando el colaborador las toma en la app.</p>
          } @else {
            @for (s of evidenceSections(); track s.name) {
              <h3 class="mb-2 mt-1 text-[12px] font-bold uppercase tracking-[0.8px] text-text-secondary">{{ s.name }}</h3>
              <div class="mb-5 grid grid-cols-2 gap-2.5">
                @for (p of s.photos; track $index; let i = $index) {
                  <figure class="relative overflow-hidden rounded-tile" style="aspect-ratio: 4 / 3">
                    <app-photo [photo]="p" sizes="220px" />
                    <figcaption class="absolute left-2 top-2 rounded-xs bg-surface/90 px-1.5 py-px text-[10.5px] font-bold text-primary">{{ i % 2 === 0 ? 'Antes' : 'Después' }}</figcaption>
                  </figure>
                }
              </div>
            }
          }
        }
        @case ('consumos') {
          @if (t.discrepancy) {
            <div class="mb-4 flex items-start gap-3 rounded-field border border-warning/30 bg-warning-soft px-4 py-3 text-[13px] text-warning">
              <app-icon name="alert-triangle" [size]="17" class="mt-px" />
              <div><b>Discrepancia de custodia.</b> {{ t.discrepancy }}. Se revisa en Inventario → Discrepancias.</div>
            </div>
          }
          @if (t.consumption.length) {
            <ul class="divide-y divide-divider rounded-card border border-border-card bg-surface">
              @for (c of t.consumption; track c.item) {
                <li class="flex items-center justify-between px-4 py-3 text-[13px]"><span class="text-text-body">{{ c.item }}</span><span class="tabular font-bold text-primary">{{ c.qty }} {{ c.unit }}</span></li>
              }
            </ul>
          } @else {
            <p class="rounded-card border border-dashed border-border-field px-4 py-10 text-center text-[13px] text-text-secondary">Los consumos se registran al cerrar la tarea.</p>
          }
        }
        @default {
          <ol class="timeline relative ml-2 border-l border-border-card pl-5">
            @for (e of timelineDesc(); track $index) {
              <li class="relative pb-5 last:pb-0">
                <span class="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-pill border-2 border-surface" [class]="$first ? 'bg-secondary' : 'bg-teal-muted'"></span>
                <div class="text-[13px] font-bold text-primary">{{ e.text }}</div>
                <div class="mt-0.5 text-[12px] text-text-secondary">{{ e.actor }} · <span class="tabular">{{ e.at | date: 'd MMM, HH:mm' }}</span></div>
              </li>
            }
          </ol>
        }
      }
    </div>
  `,
  styles: `:host { display: block; } .date-in:focus { outline: 2px solid var(--color-secondary); outline-offset: 1px; }`,
})
export class TaskDetailComponent {
  readonly task = input.required<Task>();
  readonly people = input<readonly Assignable[]>([]);
  readonly canAssign = input<boolean>(false);
  readonly busy = input<boolean>(false);
  readonly move = output<TaskMove>();

  protected readonly types = TYPE_META;
  protected readonly status = STATUS_META;
  protected readonly isLate = isLate;
  protected readonly tab = signal('resumen');
  protected readonly who = signal('');
  protected readonly when = signal('');

  protected readonly pct = computed(() => progress(this.task()));
  protected readonly tabs = computed(() => [
    { value: 'resumen', label: 'Resumen' },
    { value: 'evidencias', label: 'Evidencias', count: this.task().photos },
    { value: 'consumos', label: 'Consumos', count: this.task().discrepancy ? 1 : null, attention: true },
    { value: 'linea', label: 'Línea de tiempo' },
  ]);
  protected readonly peopleOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Sin asignar' },
    ...this.people().map((p) => ({ value: p.id, label: `${p.name} · ${p.role}` })),
  ]);
  protected readonly changed = computed(() => this.who() !== (this.task().assignee_id ?? '') || this.when() !== this.task().date);
  protected readonly timelineDesc = computed(() => [...this.task().timeline].reverse());
  protected readonly evidenceSections = computed(() => {
    const t = this.task();
    const names = t.checklist.map((s) => s.name).slice(0, Math.max(1, Math.ceil(t.photos / 4)));
    let k = t.number;
    return names.map((name) => ({ name, photos: [0, 1].map(() => EVIDENCE[k++ % EVIDENCE.length]) }));
  });

  constructor() {
    effect(() => {
      const t = this.task();
      untracked(() => {
        this.who.set(t.assignee_id ?? '');
        this.when.set(t.date);
      });
    });
    // Al cambiar de tarea se vuelve al resumen.
    let last = '';
    effect(() => {
      const id = this.task().id;
      if (id !== last) untracked(() => this.tab.set('resumen'));
      last = id;
    });
  }

  protected dateOf(key: string): Date {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  protected initialsOf(name: string): string {
    return name.split(' ').slice(0, 2).map((w) => w[0]).join('');
  }

  protected applyMove(): void {
    const t = this.task();
    this.move.emit({
      assignee_id: this.who() === (t.assignee_id ?? '') ? undefined : this.who() || null,
      date: this.when() !== t.date ? this.when() : undefined,
      reason: 'Cambio desde la ficha',
    });
  }
}
