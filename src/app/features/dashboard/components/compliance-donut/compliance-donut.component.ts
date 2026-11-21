import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CountUpComponent } from '../../../../shared/atoms/count-up/count-up.component';
import { Compliance } from '../../models/dashboard.model';

interface Segment {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly color: string;
  readonly dash: string;
  readonly offset: number;
  readonly delay: number;
}

const R = 54;
const C = 2 * Math.PI * R;

/**
 * Donut de cumplimiento del día por segmentos (hechas, en progreso,
 * retrasadas). Cada segmento se dibuja en secuencia al aparecer.
 */
@Component({
  selector: 'app-compliance-donut',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CountUpComponent],
  template: `
    <div class="flex items-center gap-6">
      <div class="relative h-[140px] w-[140px] shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140" class="-rotate-90" role="img" [attr.aria-label]="percent() + '% completado'">
          <circle cx="70" cy="70" [attr.r]="r" fill="none" stroke="var(--color-track)" stroke-width="15" />
          @for (s of segments(); track s.key) {
            <circle
              class="seg"
              cx="70"
              cy="70"
              [attr.r]="r"
              fill="none"
              [attr.stroke]="s.color"
              stroke-width="15"
              [attr.stroke-dasharray]="s.dash"
              [attr.stroke-dashoffset]="-s.offset"
              [style.--len]="c"
              [style.animation-delay.ms]="s.delay"
            />
          }
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <div class="font-display text-[34px] font-semibold leading-none tracking-display text-primary">
            <app-count-up [value]="percent()" />%
          </div>
          <div class="mt-1 text-[9.5px] uppercase tracking-[0.6px] text-text-secondary">completado</div>
        </div>
      </div>
      <ul class="flex flex-1 flex-col gap-2.5">
        @for (s of legend(); track s.key) {
          <li class="flex items-center gap-2.5">
            <span class="h-2.5 w-2.5 shrink-0 rounded-pill" [style.background]="s.color"></span>
            <span class="flex-1 text-[12.5px] text-text-body">{{ s.label }}</span>
            <span class="tabular text-[13px] font-bold text-primary">{{ s.value }}</span>
          </li>
        }
      </ul>
    </div>
  `,
  styles: `
    .seg { animation: draw 900ms var(--ease-enter) both; }
    @keyframes draw { from { stroke-dasharray: 0 var(--len); } }
  `,
})
export class ComplianceDonutComponent {
  readonly data = input.required<Compliance>();
  protected readonly r = R;
  protected readonly c = C;

  private readonly total = computed(() => {
    const d = this.data();
    return d.done + d.inProgress + d.late + d.pending || 1;
  });

  protected readonly percent = computed(() => Math.round((this.data().done / this.total()) * 100));

  protected readonly segments = computed<Segment[]>(() => {
    const d = this.data();
    const parts = [
      { key: 'done', label: 'Finalizadas', value: d.done, color: 'var(--color-primary)' },
      { key: 'progress', label: 'En progreso', value: d.inProgress, color: 'var(--color-secondary)' },
      { key: 'late', label: 'Retrasadas', value: d.late, color: 'var(--color-danger)' },
    ];
    let acc = 0;
    return parts.map((p, i) => {
      const len = (p.value / this.total()) * C;
      const gap = len > 4 ? 2.5 : 0;
      const seg: Segment = { ...p, dash: `${Math.max(0, len - gap)} ${C}`, offset: acc, delay: 150 + i * 220 };
      acc += len;
      return seg;
    });
  });

  protected readonly legend = computed(() => [
    ...this.segments(),
    { key: 'pending', label: 'Pendientes', value: this.data().pending, color: 'var(--color-track)' },
  ]);
}
