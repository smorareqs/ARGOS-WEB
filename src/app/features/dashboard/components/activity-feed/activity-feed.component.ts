import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { ActivityItem } from '../../models/dashboard.model';

/** Línea de tiempo "Hoy en tu operación" (W-B1). */
@Component({
  selector: 'app-activity-feed',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <ol class="relative flex flex-col">
      @for (a of items(); track a.time + a.title; let i = $index; let last = $last) {
        <li class="reveal relative flex gap-3.5 pb-4" [style.--i]="i">
          @if (!last) {
            <span class="absolute left-[15px] top-8 h-[calc(100%-28px)] w-px bg-divider"></span>
          }
          <span class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-pill" [class]="tone(a.tone)">
            <app-icon [name]="a.icon" [size]="15" />
          </span>
          <div class="min-w-0 flex-1 pt-0.5">
            <div class="flex items-baseline justify-between gap-3">
              <span class="truncate text-[13px] font-bold text-primary">{{ a.title }}</span>
              <span class="shrink-0 font-mono text-[11px] text-text-secondary">{{ a.time }}</span>
            </div>
            <div class="mt-0.5 truncate text-[12px] text-text-body">{{ a.meta }}</div>
          </div>
        </li>
      }
    </ol>
  `,
})
export class ActivityFeedComponent {
  readonly items = input.required<readonly ActivityItem[]>();

  protected tone(t: ActivityItem['tone']): string {
    return {
      primary: 'bg-info-soft text-primary',
      gold: 'bg-warning-soft text-secondary',
      success: 'bg-success-soft text-success',
      danger: 'bg-danger-soft text-danger',
    }[t];
  }
}
