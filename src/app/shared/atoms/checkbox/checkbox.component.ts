import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Átomo · casilla con trazo animado (la marca se "dibuja" con un resorte).
 * El texto entra por <ng-content> y forma parte de la etiqueta clicable.
 */
@Component({
  selector: 'app-checkbox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="group inline-flex cursor-pointer select-none items-center gap-2.5">
      <input
        type="checkbox"
        class="peer sr-only"
        [checked]="checked()"
        [disabled]="disabled()"
        (change)="checked.set($any($event.target).checked)"
      />
      <span
        class="box flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px]"
        [class.is-on]="checked()"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <span class="text-[12.5px] text-text-body"><ng-content /></span>
    </label>
  `,
  styles: `
    :host { display: inline-flex; }
    .box {
      border-color: var(--color-border-field); background: var(--color-surface);
      transition: background-color var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard),
        transform var(--spring-bounce-dur) var(--spring-bounce);
    }
    .group:hover .box { border-color: var(--color-disabled); }
    .box path { stroke-dasharray: 22; stroke-dashoffset: 22; transition: stroke-dashoffset var(--dur-base) var(--ease-enter); }
    .box.is-on { background: var(--color-primary); border-color: var(--color-primary); }
    .box.is-on path { stroke-dashoffset: 0; }
    .group:active .box { transform: scale(0.9); }
    input:focus-visible + .box { outline: 2px solid var(--color-secondary); outline-offset: 2px; }
  `,
})
export class CheckboxComponent {
  readonly checked = model<boolean>(false);
  readonly disabled = input<boolean>(false);
}
