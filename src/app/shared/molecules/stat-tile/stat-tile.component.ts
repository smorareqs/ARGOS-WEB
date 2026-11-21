import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent, IconName } from '../../atoms/icon/icon.component';
import { CountUpComponent } from '../../atoms/count-up/count-up.component';

export type StatTone = 'primary' | 'gold' | 'warning' | 'danger' | 'success';

/**
 * Molécula · indicador (stat-tile, ux-ui.md §2.6). Número protagonista en
 * grande que cuenta al aparecer, total opcional, barra de progreso y nota.
 */
@Component({
  selector: 'app-stat-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CountUpComponent],
  template: `
    <div class="flex items-start justify-between gap-3">
      <span class="text-[10.5px] uppercase tracking-[1px] text-text-secondary">{{ label() }}</span>
      <span class="flex h-8 w-8 items-center justify-center rounded-sm" [class]="iconWrap()">
        <app-icon [name]="icon()" [size]="16" />
      </span>
    </div>
    <div class="mt-1 flex items-baseline gap-1">
      <span class="font-display text-[38px] font-semibold leading-none tracking-display text-primary">
        <app-count-up [value]="value()" />
      </span>
      @if (total() !== null) {
        <span class="font-display text-[18px] text-disabled">/{{ total() }}</span>
      }
    </div>
    @if (total() !== null) {
      <div class="mt-3 h-[5px] overflow-hidden rounded-pill bg-track">
        <div class="bar h-full rounded-pill" [class]="barClass()" [style.--w]="percent() + '%'"></div>
      </div>
    }
    @if (note()) {
      <p class="mt-2.5 text-[12px] leading-snug text-text-body">{{ note() }}</p>
    }
  `,
  host: {
    class: 'block rounded-card border border-border-card bg-surface p-[18px] shadow-e1',
  },
  styles: `
    .bar { width: var(--w); animation: grow 900ms var(--ease-enter) both 150ms; transform-origin: left; }
    @keyframes grow { from { transform: scaleX(0); } }
  `,
})
export class StatTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly total = input<number | null>(null);
  readonly icon = input<IconName>('metrics');
  readonly tone = input<StatTone>('primary');
  readonly note = input<string | null>(null);

  protected readonly percent = computed(() => {
    const t = this.total();
    return t ? Math.round((this.value() / t) * 100) : 0;
  });

  protected readonly iconWrap = computed(
    () =>
      ({
        primary: 'bg-info-soft text-primary',
        gold: 'bg-warning-soft text-secondary',
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-danger-soft text-danger',
        success: 'bg-success-soft text-success',
      })[this.tone()],
  );

  protected readonly barClass = computed(() =>
    this.tone() === 'gold' ? 'bg-secondary' : this.tone() === 'success' ? 'bg-success' : 'bg-primary',
  );
}
