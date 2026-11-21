import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Átomo · spinner para botones e indicadores en línea (nunca central). */
@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style="animation: argos-spin 0.8s linear infinite"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.25" stroke-width="2.6" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
    </svg>
  `,
  styles: `:host { display: inline-flex; line-height: 0; }`,
})
export class SpinnerComponent {
  readonly size = input<number>(16);
}
