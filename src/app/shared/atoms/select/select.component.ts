import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Átomo · selector nativo con la piel del design system. Nativo a propósito:
 * teclado, lectores de pantalla y móvil funcionan sin código extra.
 */
@Component({
  selector: 'app-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="relative">
      <select
        class="sel w-full appearance-none rounded-field border bg-surface pl-4 pr-10 text-primary outline-none"
        [class.h-[52px]]="!compact()"
        [class.text-[15px]]="!compact()"
        [class.h-11]="compact()"
        [class.text-[13.5px]]="compact()"
        [class.is-invalid]="invalid()"
        [attr.id]="selectId()"
        [attr.aria-label]="ariaLabel()"
        [disabled]="disabled()"
        [value]="value()"
        (change)="value.set($any($event.target).value); changed.emit($any($event.target).value)"
        (blur)="blurred.emit()"
      >
        @if (placeholder()) {
          <option value="" disabled [selected]="!value()">{{ placeholder() }}</option>
        }
        @for (opt of options(); track opt.value) {
          <option [value]="opt.value" [selected]="opt.value === value()">{{ opt.label }}</option>
        }
      </select>
      <app-icon
        name="chevron-down"
        [size]="16"
        class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted"
      />
    </div>
  `,
  styles: `
    :host { display: block; }
    .sel { border-color: var(--color-border-field); transition: border-color var(--dur-fast), box-shadow var(--dur-base); }
    .sel:hover { border-color: #d3cec1; }
    .sel:focus { border-color: var(--color-secondary); box-shadow: 0 0 0 4px rgba(197, 135, 60, 0.14); }
    .sel.is-invalid { border-color: var(--color-danger); }
  `,
})
export class SelectComponent {
  readonly value = model<string>('');
  readonly options = input.required<readonly SelectOption[]>();
  readonly placeholder = input<string | null>(null);
  readonly selectId = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly invalid = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly compact = input<boolean>(false);

  readonly changed = output<string>();
  readonly blurred = output<void>();
}
