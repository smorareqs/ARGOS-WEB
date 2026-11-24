import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { addDays, toDayKey } from '../../../../shared/utils/time';
import { DEPOSIT_STATUS, Reservation, channelColor, guestLabel, isLive } from '../../models/reservation.model';
import { gtq } from '../../../../shared/utils/time';

export interface OccDay {
  readonly key: string;
  readonly weekday: string;
  readonly day: number;
  readonly today: boolean;
  readonly weekend: boolean;
  readonly monthLabel: string | null;
}

export interface OccRange {
  readonly property_id: string;
  readonly from: string;
  readonly to: string;
}

/** Ancho mínimo de un día; si sobra espacio, las columnas se estiran. */
const COL = 46;
/** Columna de propiedad: más angosta en teléfonos para que quepan más días. */
const FIRST = typeof window !== 'undefined' && window.innerWidth < 640 ? 112 : 180;

/**
 * Componente · calendario de ocupación (occupancy-calendar, W-H1): filas por
 * propiedad y columnas por día, como el multicalendario de Guesty o Hostaway.
 * Cada estancia es una barra que empieza y termina a media celda (entrada en la
 * tarde, salida en la mañana) con el color de su canal. Arrastrar sobre días
 * libres de una fila abre "Nueva reserva" con ese rango.
 */
@Component({
  selector: 'app-occupancy-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto rounded-card border border-border-card bg-surface shadow-e1" (pointerup)="endDrag()" (pointerleave)="cancelDrag()">
      <div [style.width.px]="first + days().length * col()">
        <div class="flex border-b border-divider">
          <div class="sticky left-0 z-[3] shrink-0 bg-surface px-3 py-2.5 text-[10.5px] uppercase tracking-[1px] text-text-secondary sm:px-4" [style.width.px]="first">Propiedad</div>
          @for (d of days(); track d.key) {
            <div class="relative shrink-0 border-l border-divider pb-1.5 pt-2.5 text-center" [style.width.px]="col()" [class.is-today]="d.today" [class.is-weekend]="d.weekend">
              @if (d.monthLabel) {
                <span class="absolute left-1 top-0.5 text-[9.5px] font-bold uppercase tracking-[0.8px] text-secondary">{{ d.monthLabel }}</span>
              }
              <div class="mt-1.5 text-[10px] uppercase text-text-secondary">{{ d.weekday }}</div>
              <div class="tabular text-[14px] font-semibold" [class]="d.today ? 'text-secondary' : 'text-primary'">{{ d.day }}</div>
            </div>
          }
        </div>
        @for (p of rows(); track p.id) {
          <div class="row relative flex h-[54px] border-b border-divider last:border-0">
            <div class="sticky left-0 z-[2] flex shrink-0 flex-col justify-center bg-surface px-3 sm:px-4" [style.width.px]="first">
              <span class="font-mono text-[11px] font-bold text-teal-muted">{{ p.code }}</span>
              <span class="truncate text-[12.5px] font-bold text-primary">{{ p.name }}</span>
            </div>
            @for (d of days(); track d.key; let i = $index) {
              <div
                class="cell shrink-0 border-l border-divider"
                [style.width.px]="col()"
                [class.is-today]="d.today"
                [class.is-weekend]="d.weekend"
                [class.is-sel]="isSelected(p.id, i)"
                (pointerdown)="startDrag($event, p.id, i)"
                (pointerenter)="moveDrag(p.id, i)"
              ></div>
            }
            @for (b of bars()[p.id] ?? []; track b.r.id) {
              <button
                type="button"
                class="bar absolute top-[9px] flex h-9 items-center gap-1.5 overflow-hidden rounded-[7px] px-2 text-left"
                [class.is-pending]="b.r.status === 'pending'"
                [class.is-house]="b.r.status === 'checked_in'"
                [class.is-past]="b.r.status === 'checked_out'"
                [class.clip-l]="b.clipL"
                [class.clip-r]="b.clipR"
                [style.left.px]="first + b.left"
                [style.width.px]="b.width"
                [style.--c]="colorOf(b.r)"
                [attr.aria-label]="label(b.r)"
                (pointerdown)="$event.stopPropagation()"
                (mouseenter)="hover.set(b.r.id)"
                (mouseleave)="hover.set(null)"
                (focus)="hover.set(b.r.id)"
                (blur)="hover.set(null)"
                (click)="open.emit(b.r)"
              >
                <span class="truncate text-[12px] font-bold text-primary">{{ name(b.r) }}</span>
                @if (b.width > 120) {
                  <span class="tabular shrink-0 text-[11px] text-text-secondary">{{ b.r.nights }} n</span>
                }
              </button>
              @if (hover() === b.r.id) {
                <div class="tip pointer-events-none absolute bottom-[50px] z-20 w-[230px] rounded-field bg-primary p-3 text-[12px] text-white shadow-e3" [style.left.px]="first + Math.max(0, b.left)">
                  <div class="flex items-center gap-1.5 font-bold"><span class="h-2 w-2 rounded-pill" [style.background]="colorOf(b.r)"></span>{{ b.r.channel_name }} · {{ b.r.code }}</div>
                  <div class="mt-1 text-[13px] font-bold">{{ name(b.r) }}</div>
                  <div class="mt-0.5 opacity-80">{{ b.r.check_in_date.slice(8) }}/{{ b.r.check_in_date.slice(5, 7) }} → {{ b.r.check_out_date.slice(8) }}/{{ b.r.check_out_date.slice(5, 7) }} · {{ b.r.nights }} noches · {{ b.r.adults + b.r.children }} huéspedes</div>
                  <div class="mt-0.5 opacity-80">Depósito: {{ depositLabel(b.r) }}</div>
                </div>
              }
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .is-weekend { background: color-mix(in srgb, var(--color-background) 60%, white); }
    .is-today { background: color-mix(in srgb, var(--color-teal-washed) 70%, white); }
    .cell { cursor: crosshair; }
    .cell.is-sel { background: rgba(197, 135, 60, 0.18); }
    .bar { background: color-mix(in srgb, var(--c) 14%, white); border: 1px solid color-mix(in srgb, var(--c) 35%, white); box-shadow: inset 4px 0 0 var(--c); transition: box-shadow var(--dur-fast), transform var(--spring-snappy-dur) var(--spring-snappy); }
    .bar:hover, .bar:focus-visible { transform: translateY(-1px); box-shadow: inset 4px 0 0 var(--c), var(--shadow-e2); }
    .bar.is-house { background: color-mix(in srgb, var(--c) 24%, white); }
    .bar.is-past { opacity: 0.55; }
    .bar.is-pending { background: repeating-linear-gradient(135deg, #fff 0 6px, color-mix(in srgb, var(--c) 10%, white) 6px 12px); border-style: dashed; border-color: var(--c); }
    .bar.clip-l { border-top-left-radius: 0; border-bottom-left-radius: 0; }
    .bar.clip-r { border-top-right-radius: 0; border-bottom-right-radius: 0; }
    @media (prefers-reduced-motion: reduce) { .bar { transition: none; } }
  `,
})
export class OccupancyCalendarComponent {
  readonly days = input.required<readonly OccDay[]>();
  readonly rows = input.required<readonly { id: string; code: string; name: string }[]>();
  readonly reservations = input.required<readonly Reservation[]>();
  readonly open = output<Reservation>();
  readonly create = output<OccRange>();

  private readonly width = signal(0);
  /** Ancho de cada día: llena el espacio disponible sin bajar de COL. */
  protected readonly col = computed(() => {
    const n = this.days().length;
    return n ? Math.max(COL, Math.floor(((this.width() - 2 - FIRST) / n) * 100) / 100) : COL;
  });
  protected readonly first = FIRST;
  protected readonly Math = Math;
  protected readonly hover = signal<string | null>(null);
  private readonly drag = signal<{ property: string; from: number; to: number } | null>(null);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const ro = new ResizeObserver(([e]) => this.width.set(Math.floor(e.contentRect.width)));
    ro.observe(host);
    inject(DestroyRef).onDestroy(() => ro.disconnect());
  }

  protected readonly bars = computed(() => {
    const days = this.days();
    if (!days.length) return {};
    const col = this.col();
    const first = days[0].key;
    const last = days[days.length - 1].key;
    const index = (k: string) => Math.round((new Date(`${k}T12:00:00`).getTime() - new Date(`${first}T12:00:00`).getTime()) / 86400000);
    const out: Partial<Record<string, { r: Reservation; left: number; width: number; clipL: boolean; clipR: boolean }[]>> = {};
    for (const r of this.reservations()) {
      if (!isLive(r) || r.check_out_date <= first || r.check_in_date > last) continue;
      const a = index(r.check_in_date) + 0.5;
      const b = index(r.check_out_date) + 0.5;
      const clipL = a < 0;
      const clipR = b > days.length;
      const left = Math.max(0, a) * col + (clipL ? 0 : 2);
      const right = Math.min(days.length, b) * col - (clipR ? 0 : 2);
      (out[r.property_id] ??= []).push({ r, left, width: Math.max(18, right - left), clipL, clipR });
    }
    return out;
  });

  protected readonly name = guestLabel;

  protected colorOf(r: Reservation): string {
    return channelColor(r.channel_kind);
  }
  protected depositLabel(r: Reservation): string {
    return r.deposit_amount ? `${gtq(r.deposit_amount, 0)} · ${DEPOSIT_STATUS[r.deposit_status].label.toLowerCase()}` : 'no aplica';
  }
  protected label(r: Reservation): string {
    return `${guestLabel(r)}, ${r.channel_name}, del ${r.check_in_date} al ${r.check_out_date}`;
  }

  protected isSelected(property: string, i: number): boolean {
    const d = this.drag();
    return !!d && d.property === property && i >= Math.min(d.from, d.to) && i <= Math.max(d.from, d.to);
  }

  protected startDrag(e: PointerEvent, property: string, i: number): void {
    if (e.button !== 0) return;
    e.preventDefault();
    this.drag.set({ property, from: i, to: i });
  }

  protected moveDrag(property: string, i: number): void {
    const d = this.drag();
    if (d && d.property === property) this.drag.set({ ...d, to: i });
  }

  protected endDrag(): void {
    const d = this.drag();
    this.drag.set(null);
    if (!d) return;
    const days = this.days();
    const a = Math.min(d.from, d.to);
    const b = Math.max(d.from, d.to) + 1;
    const to = b < days.length ? days[b].key : nextDay(days[days.length - 1].key);
    this.create.emit({ property_id: d.property, from: days[a].key, to });
  }

  protected cancelDrag(): void {
    this.drag.set(null);
  }
}

function nextDay(key: string): string {
  return toDayKey(addDays(new Date(`${key}T12:00:00`), 1));
}
