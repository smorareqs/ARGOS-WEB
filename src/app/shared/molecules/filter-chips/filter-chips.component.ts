import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface ChipOption {
  readonly value: string;
  readonly label: string;
  readonly count?: number;
  /** Color del punto de estado (token CSS), opcional. */
  readonly dot?: string;
}

/**
 * Molécula · chips de filtro de selección única. Desplazables en horizontal
 * en pantallas angostas (barra de categorías de Airbnb), con contador.
 */
@Component({
  selector: 'app-filter-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chips flex gap-2 overflow-x-auto pb-1" role="radiogroup" [attr.aria-label]="ariaLabel()">
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          role="radio"
          class="chip press flex h-9 shrink-0 items-center gap-2 rounded-field border px-3.5 text-[12.5px]"
          [class.is-on]="opt.value === value()"
          [attr.aria-checked]="opt.value === value()"
          (click)="value.set(opt.value)"
        >
          @if (opt.dot) {
            <span class="h-2 w-2 rounded-pill" [style.background]="opt.dot"></span>
          }
          <span class="font-bold">{{ opt.label }}</span>
          @if (opt.count !== undefined) {
            <span class="count tabular rounded-xs px-1.5 text-[11px]">{{ opt.count }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .chips { scrollbar-width: none; }
    .chips::-webkit-scrollbar { display: none; }
    .chip {
      border-color: var(--color-border-field); background: var(--color-surface); color: var(--color-text-body);
      transition: background-color var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard),
        border-color var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard);
    }
    .chip:hover { border-color: var(--color-disabled); color: var(--color-primary); }
    .count { background: var(--color-neutral-soft); color: var(--color-text-secondary); }
    .chip.is-on { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .chip.is-on .count { background: rgba(255, 255, 255, 0.16); color: #fff; }
  `,
})
export class FilterChipsComponent {
  readonly options = input.required<readonly ChipOption[]>();
  readonly value = model.required<string>();
  readonly ariaLabel = input<string | null>(null);
}
