import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

/** Tonos semánticos (ux-ui.md §2.2 · semántica de estados). */
export type BadgeTone = 'neutral' | 'info' | 'success' | 'validated' | 'warning' | 'danger' | 'muted';

/**
 * Átomo · insignia de estado. Siempre color + icono (o punto) + texto:
 * nunca solo color (ux-ui.md §1.2, §3.8). El texto entra por <ng-content>.
 */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <span
      class="inline-flex items-center gap-[5px] whitespace-nowrap rounded-xs font-bold"
      [class]="classes()"
    >
      @if (icon(); as name) {
        <app-icon [name]="name" [size]="size() === 'sm' ? 12 : 13" />
      } @else {
        <span class="h-1.5 w-1.5 rounded-pill bg-current opacity-80"></span>
      }
      <ng-content />
    </span>
  `,
  styles: `:host { display: inline-flex; }`,
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');
  readonly icon = input<IconName | null>(null);
  readonly size = input<'sm' | 'md'>('md');

  private static readonly TONES: Record<BadgeTone, string> = {
    neutral: 'bg-neutral-soft text-text-body',
    info: 'bg-info-soft text-primary',
    success: 'bg-success-soft text-success',
    validated: 'bg-success-soft text-primary',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    muted: 'bg-neutral-soft text-text-muted',
  };

  protected readonly classes = computed(
    () =>
      `${BadgeComponent.TONES[this.tone()]} ${
        this.size() === 'sm' ? 'px-2 py-[3px] text-[10.5px]' : 'px-2.5 py-[5px] text-[11px]'
      }`,
  );
}
