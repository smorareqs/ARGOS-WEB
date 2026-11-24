import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent, IconName } from '../../../../shared/atoms/icon/icon.component';
import { CountUpComponent } from '../../../../shared/atoms/count-up/count-up.component';
import { AlertKind, DashboardAlert } from '../../models/dashboard.model';

const KIND_ICON: Record<AlertKind, IconName> = {
  incident: 'alert-chat',
  late: 'clock',
  maintenance: 'maintenance',
  inventory: 'inventory',
};

/**
 * Hero "Requiere tu atención" (W-B1): contador de alertas altas y las tres
 * más urgentes con su acción. Al fondo, un radar barre lentamente: Argos
 * vigilando. Reconocer una alerta la retira con un colapso suave.
 */
@Component({
  selector: 'app-priority-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CountUpComponent],
  template: `
    <section class="hero relative overflow-hidden rounded-hero bg-primary px-6 py-6 text-white sm:px-8 sm:py-7" aria-label="Requiere tu atención">
      <div class="radar pointer-events-none absolute -right-16 top-1/2 hidden h-[340px] w-[340px] -translate-y-1/2 xl:block" aria-hidden="true">
        <span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>
        <span class="sweep"></span>
        <span class="blip b1"></span><span class="blip b2"></span>
      </div>

      <div class="relative z-[2] flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-9">
        <div class="flex shrink-0 flex-col justify-center lg:w-[210px] lg:border-r lg:border-white/12 lg:pr-8">
          <div class="text-[11px] uppercase tracking-[1.6px] text-white/60">Requiere tu atención</div>
          <!-- Sin altas, el número grande pasa a ser el total: un "0" bajo "Requiere tu atención" se contradice. -->
          @let urgent = high() ?? alerts().length;
          <div class="mt-2 flex items-baseline gap-3">
            <span class="font-display text-[64px] font-semibold leading-none text-secondary-light">
              <app-count-up [value]="urgent || total()" />
            </span>
            @if (urgent || !total()) {
              <span class="text-[13px] leading-snug text-white/75">de prioridad<br />alta</span>
            } @else {
              <span class="text-[13px] leading-snug text-white/75">{{ total() === 1 ? 'alerta' : 'alertas' }}<br />{{ total() === 1 ? 'activa' : 'activas' }}</span>
            }
          </div>
          <div class="mt-2.5 text-[12px] text-white/60">{{ urgent || !total() ? total() + ' alertas activas en total' : 'Ninguna de prioridad alta' }}</div>
        </div>

        <div class="flex min-w-0 flex-1 flex-col justify-center gap-2.5 xl:max-w-[600px]">
          @for (a of alerts(); track a.id; let i = $index) {
            <div
              class="alert reveal flex flex-wrap items-center gap-x-3 gap-y-2 rounded-tile border border-white/[0.08] bg-white/[0.07] py-3 pl-3.5 pr-2.5 backdrop-blur-sm sm:flex-nowrap"
              [style.--i]="i + 2"
              animate.leave="alert-out"
            >
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-danger/40 text-white">
                <app-icon [name]="icon(a.kind)" [size]="17" />
              </span>
              <div class="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-auto">
                <div class="text-[13px] font-bold leading-snug text-white sm:truncate">{{ a.title }}</div>
                <div class="mt-px text-[11.5px] text-white/60 sm:truncate">{{ a.meta }}</div>
              </div>
              <div class="ml-12 flex items-center gap-1 sm:ml-0">
              <button
                type="button"
                class="press shrink-0 rounded-sm bg-secondary px-3.5 py-[7px] text-[11.5px] font-bold text-primary shadow-[var(--shadow-edge)] hover:brightness-105"
                (click)="act.emit(a)"
              >
                {{ a.action }}
              </button>
              @if (canManage()) {
                <button
                  type="button"
                  class="press flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-white/55 hover:bg-white/10 hover:text-white"
                  aria-label="Reconocer alerta"
                  title="Reconocer"
                  (click)="ack.emit(a)"
                >
                  <app-icon name="check" [size]="17" />
                </button>
              }
              </div>
            </div>
          } @empty {
            <div class="reveal flex items-center gap-3 rounded-tile border border-white/[0.08] bg-white/[0.05] px-4 py-4">
              <span class="flex h-9 w-9 items-center justify-center rounded-pill bg-success/40"><app-icon name="check" [size]="18" /></span>
              <div>
                <div class="text-[13.5px] font-bold">Todo al día</div>
                <div class="text-[12px] text-white/60">No hay alertas de prioridad alta en este momento.</div>
              </div>
            </div>
          }
          @if (total() > alerts().length) {
            <button type="button" class="mt-0.5 w-fit rounded-xs pl-1 text-[12.5px] text-white/70 hover:text-white" (click)="viewAll.emit()">
              Ver las {{ total() }} alertas en el panel →
            </button>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .hero { background: radial-gradient(110% 140% at 100% 50%, #0a4954 0%, #003841 55%, #003038 100%); }
    .ring { position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(255,255,255,.07); }
    .r2 { inset: 56px; } .r3 { inset: 112px; border-color: rgba(224,169,97,.16); }
    .sweep { position: absolute; inset: 0; border-radius: 50%;
      background: conic-gradient(from 0deg, transparent 0deg, rgba(224,169,97,.16) 52deg, transparent 56deg);
      animation: argos-spin 9s linear infinite; }
    .blip { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: var(--color-secondary-light);
      animation: blip 9s ease-out infinite; }
    .b1 { top: 30%; left: 38%; animation-delay: 1.3s; } .b2 { top: 62%; left: 26%; animation-delay: 5.4s; }
    @keyframes blip { 0%, 100% { opacity: 0; transform: scale(.6); } 4% { opacity: 1; transform: scale(1); } 30% { opacity: 0; } }
    .alert-out { animation: alert-out 260ms var(--ease-exit) both; }
    @keyframes alert-out { to { opacity: 0; transform: translateX(32px); height: 0; padding-top: 0; padding-bottom: 0; margin: -5px 0; } }
  `,
})
export class PriorityHeroComponent {
  readonly alerts = input.required<readonly DashboardAlert[]>();
  readonly total = input.required<number>();
  /** Abiertas de severidad alta (API real); sin dato, las que se muestran. */
  readonly high = input<number | null>(null);
  readonly canManage = input<boolean>(false);

  readonly act = output<DashboardAlert>();
  readonly ack = output<DashboardAlert>();
  readonly viewAll = output<void>();

  protected icon(kind: AlertKind): IconName {
    return KIND_ICON[kind];
  }
}
