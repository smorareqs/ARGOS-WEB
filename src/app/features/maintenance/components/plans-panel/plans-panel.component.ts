import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MaintenanceStore } from '../../store/maintenance.store';
import { CATEGORY_META, DUE_META, Plan, frequencyLabel, placeOf } from '../../models/maintenance.model';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { DimIconComponent } from '../../../../shared/atoms/dim-icon/dim-icon.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { addDays, dayKey, toDayKey } from '../../../../shared/utils/time';

const WEEKDAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

/**
 * W-G3 · Preventivos: calendario mensual de vencimientos y la lista de los
 * que tocan. Un plan dentro de su anticipación ya tiene su incidencia (la
 * crea el job maintenance_due cada hora); el vencido además levanta alerta.
 */
@Component({
  selector: 'app-plans-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ButtonComponent, IconComponent, DimIconComponent, BadgeComponent, EmptyStateComponent],
  template: `
    @if (!store.loading() && !store.plans().length) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="done" title="Sin preventivos" message="Crea un plan desde la ficha de un activo: cada cuánto se revisa, quién lo hace y con cuánta anticipación avisar." />
      </div>
    } @else {
      <div class="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <section class="rounded-card border border-border-card bg-surface p-5 shadow-e1">
          <header class="mb-4 flex items-center justify-between">
            <h2 class="font-display text-[20px] font-semibold capitalize text-primary">{{ monthStart() | date: 'MMMM y' }}</h2>
            <div class="flex gap-1">
              <app-button variant="icon" size="sm" ariaLabel="Mes anterior" (pressed)="shift.set(shift() - 1)"><app-icon name="chevron-left" [size]="17" /></app-button>
              <app-button variant="tertiary" size="sm" (pressed)="shift.set(0)">Hoy</app-button>
              <app-button variant="icon" size="sm" ariaLabel="Mes siguiente" (pressed)="shift.set(shift() + 1)"><app-icon name="chevron-right" [size]="17" /></app-button>
            </div>
          </header>
          <div class="grid grid-cols-7 gap-1 text-center text-[10.5px] uppercase tracking-[1px] text-text-secondary">
            @for (w of weekdays; track w) { <div class="pb-1.5">{{ w }}</div> }
          </div>
          <div class="grid grid-cols-7 gap-1">
            @for (c of cells(); track c.key) {
              <div class="mcell min-h-[78px] rounded-sm p-1.5" [class.is-out]="!c.inMonth" [class.is-today]="c.key === today">
                <div class="tabular text-[11.5px]" [class]="c.key === today ? 'font-bold text-secondary' : 'text-text-secondary'">{{ c.day }}</div>
                @for (p of c.plans.slice(0, 2); track p.id) {
                  <button type="button" class="chip mt-1 flex w-full items-center gap-1 rounded-[5px] py-0.5 pl-0.5 pr-1.5 text-left text-[10.5px] font-bold" [class]="chipClass(p)" [title]="p.name + ' · ' + p.asset_name + ' · ' + where(p)" (click)="opened.emit(p)">
                    <app-dim-icon class="hidden sm:inline-block" [name]="cat[p.asset_category].dim" [size]="18" [animate]="false" /><span class="truncate">{{ p.asset_name }}</span>
                  </button>
                }
                @if (c.plans.length > 2) { <div class="mt-0.5 text-[10px] font-bold text-text-secondary">+{{ c.plans.length - 2 }} más</div> }
              </div>
            }
          </div>
        </section>

        <section class="rounded-card border border-border-card bg-surface shadow-e1">
          <h2 class="border-b border-divider px-5 py-4 text-[13px] font-bold text-primary">Lo que toca</h2>
          <ul class="divide-y divide-divider">
            @for (p of upcoming(); track p.id) {
              <li>
                <button type="button" class="row flex w-full items-start gap-3.5 px-5 py-3.5 text-left" (click)="opened.emit(p)">
                  <span class="tile h-11 w-11 rounded-[13px]" [style.background]="cat[p.asset_category].bg"><app-dim-icon [name]="cat[p.asset_category].dim" [size]="32" /></span>
                  <span class="min-w-0 flex-1">
                    <span class="flex items-center justify-between gap-2">
                      <span class="truncate text-[13px] font-bold text-primary">{{ p.name }}</span>
                      <app-badge [tone]="due[p.due_state].tone" size="sm">{{ p.due_state === 'ok' ? (asDate(p.next_due_at) | date: 'd MMM') : due[p.due_state].label }}</app-badge>
                    </span>
                    <span class="mt-0.5 block truncate text-[12px] text-text-secondary">{{ p.asset_name }} · {{ where(p) }} · {{ freq(p.frequency_days) }}</span>
                    @if (p.open_ticket_number) {
                      <span class="mt-1 inline-flex items-center gap-1 text-[11.5px] font-bold text-teal-muted"><app-icon name="maintenance" [size]="12" /> Incidencia #{{ p.open_ticket_number }} creada</span>
                    }
                  </span>
                </button>
              </li>
            } @empty {
              <li class="px-5 py-6 text-[12.5px] text-text-secondary">Nada en los próximos 45 días.</li>
            }
          </ul>
        </section>
      </div>
    }
  `,
  styles: `
    .mcell { background: var(--color-surface-soft); }
    .mcell.is-out { opacity: 0.4; }
    .mcell.is-today { box-shadow: inset 0 0 0 1.5px var(--color-secondary); }
    .chip { transition: filter var(--dur-fast); }
    .chip:hover { filter: brightness(0.96); }
    .tile { display: grid; place-items: center; flex-shrink: 0; box-shadow: inset 0 -2px 0 rgba(0,0,0,.05);
      transition: transform var(--spring-snappy-dur) var(--spring-snappy); }
    .row:hover .tile { transform: translateY(-2px) rotate(-3deg); }
    .row { transition: background var(--dur-fast); }
    .row:hover { background: var(--color-surface-soft); }
  `,
})
export class PlansPanelComponent {
  protected readonly store = inject(MaintenanceStore);
  readonly opened = output<Plan>();

  protected readonly shift = signal(0);
  protected readonly today = dayKey();
  protected readonly weekdays = WEEKDAYS;
  protected readonly cat = CATEGORY_META;
  protected readonly due = DUE_META;
  protected readonly where = placeOf;
  protected readonly freq = frequencyLabel;
  protected readonly asDate = (d: string) => new Date(`${d}T12:00:00`);

  protected readonly monthStart = computed(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + this.shift(), 1, 12);
  });

  protected readonly cells = computed(() => {
    const first = this.monthStart();
    const offset = (first.getDay() + 6) % 7;
    const start = addDays(first, -offset);
    const active = this.store.plans().filter((p) => p.is_active);
    return Array.from({ length: 42 }, (_, i) => {
      const d = addDays(start, i);
      const key = toDayKey(d);
      return { key, day: d.getDate(), inMonth: d.getMonth() === first.getMonth(), plans: active.filter((p) => p.next_due_at === key) };
    });
  });

  /** Vencidos, los que ya tocan y los de los próximos 45 días. */
  protected readonly upcoming = computed(() => {
    const limit = dayKey(45);
    return this.store.plans().filter((p) => p.is_active && (p.due_state === 'overdue' || p.due_state === 'upcoming' || p.next_due_at <= limit));
  });

  protected chipClass(p: Plan): string {
    return p.due_state === 'overdue' ? 'bg-danger-soft text-danger' : p.due_state === 'upcoming' ? 'bg-warning-soft text-warning' : 'bg-teal-washed text-primary';
  }
}
