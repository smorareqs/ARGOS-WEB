import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { UpcomingMaintenance } from '../../models/dashboard.model';

/** Próximos mantenimientos con chip de fecha tipo calendario (W-B1). */
@Component({
  selector: 'app-upcoming-maintenance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  template: `
    <ul class="flex flex-col">
      @for (m of items(); track m.id; let i = $index; let last = $last) {
        <li class="reveal flex items-center gap-3.5 py-2.5" [class.border-b]="!last" [class.border-divider]="!last" [style.--i]="i">
          <span class="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-sm bg-background">
            <span class="font-display text-[18px] font-semibold leading-none text-primary">{{ day(m.date) }}</span>
            <span class="mt-0.5 text-[9.5px] uppercase tracking-[0.8px] text-text-secondary">{{ month(m.date) }}</span>
          </span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[13px] font-bold text-primary">{{ m.property }}</div>
            <div class="truncate text-[12px] text-text-body">{{ m.system }}</div>
          </div>
          <app-badge [tone]="m.tone" size="sm">{{ m.label }}</app-badge>
        </li>
      }
    </ul>
  `,
})
export class UpcomingMaintenanceComponent {
  readonly items = input.required<readonly UpcomingMaintenance[]>();

  protected day(iso: string): string {
    return String(Number(iso.slice(8, 10)));
  }

  protected month(iso: string): string {
    return new Intl.DateTimeFormat('es-GT', { month: 'short', timeZone: 'UTC' })
      .format(new Date(`${iso}T12:00:00Z`))
      .replace('.', '');
  }
}
