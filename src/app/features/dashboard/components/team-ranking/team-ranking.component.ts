import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { RankingRow } from '../../models/dashboard.model';

/** Ranking corto del equipo (W-B1). Las barras crecen en cascada. */
@Component({
  selector: 'app-team-ranking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, IconComponent],
  template: `
    <ol class="flex flex-col gap-3.5">
      @for (row of rows(); track row.name; let i = $index; let first = $first) {
        <li class="reveal flex items-center gap-3" [style.--i]="i">
          <span class="w-5 text-center font-display text-[19px] font-semibold" [class.text-secondary]="first" [class.text-text-secondary]="!first">
            {{ i + 1 }}
          </span>
          <app-avatar [initials]="row.initials" [name]="row.name" [tone]="first ? 'secondary' : 'auto'" [size]="34" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 text-[13px] font-bold text-primary">
              <span class="truncate">{{ row.name }}</span>
              @if (first) {
                <app-icon name="star" [size]="14" class="text-secondary" label="Líder de la semana" />
              }
            </div>
            <div class="mt-1.5 h-[5px] overflow-hidden rounded-pill bg-track">
              <div
                class="bar h-full rounded-pill"
                [class.bg-secondary]="first"
                [class.bg-primary]="!first"
                [style.width.%]="row.progress"
                [style.animation-delay.ms]="200 + i * 90"
              ></div>
            </div>
          </div>
          <span class="tabular w-8 text-right text-[13px] font-bold text-primary">{{ row.score }}</span>
        </li>
      }
    </ol>
  `,
  styles: `
    .bar { transform-origin: left; animation: grow 900ms var(--ease-enter) both; }
    @keyframes grow { from { transform: scaleX(0); } }
  `,
})
export class TeamRankingComponent {
  readonly rows = input.required<readonly RankingRow[]>();
}
