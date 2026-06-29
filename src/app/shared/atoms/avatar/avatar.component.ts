import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AvatarTone = 'primary' | 'secondary' | 'teal-muted';

/**
 * Átomo · avatar de iniciales (círculo con monograma en EB Garamond).
 * Ref: sidebar (CR), topbar (CR), ranking del equipo (MR/JP/AS/LT).
 */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="flex shrink-0 items-center justify-center rounded-pill font-display font-semibold text-white"
      [class]="toneClass()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.font-size.px]="fontSize()"
    >
      {{ initials() }}
    </span>
  `,
  styles: `:host { display: inline-flex; }`,
})
export class AvatarComponent {
  readonly initials = input.required<string>();
  readonly size = input<number>(36);
  readonly tone = input<AvatarTone>('primary');

  protected readonly fontSize = computed(() => Math.round(this.size() * 0.42));
  protected readonly toneClass = computed(
    () =>
      ({
        primary: 'bg-primary',
        secondary: 'bg-secondary',
        'teal-muted': 'bg-teal-muted',
      })[this.tone()],
  );
}
