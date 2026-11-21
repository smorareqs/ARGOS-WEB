import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Molécula · píldora "en vivo" = punto verde con halo + texto.
 * Ref: dashboard — "9 equipos en campo · en vivo".
 */
@Component({
  selector: 'app-live-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-2 rounded-field border border-border-card bg-surface px-3.5 py-2"
    >
      <span class="live-dot h-2 w-2 rounded-pill bg-success"></span>
      <span class="text-[12px] text-text-body">{{ label() }}</span>
    </span>
  `,
  styles: `
    :host { display: inline-flex; }
    .live-dot { box-shadow: 0 0 0 3px rgba(90, 138, 107, 0.18); }
  `,
})
export class LivePillComponent {
  readonly label = input.required<string>();
}
