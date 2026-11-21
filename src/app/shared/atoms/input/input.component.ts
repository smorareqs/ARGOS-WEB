import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

/**
 * Átomo · campo de texto (§03 Campos de formulario). Altura 52 px (o 44 en
 * `compact`), radio de campo, anillo dorado suave al enfocar.
 * `type="password"` muestra un "Ver / Ocultar" propio. `invalid` pinta el
 * borde de error; el mensaje lo muestra app-form-field debajo del campo.
 */
@Component({
  selector: 'app-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="field flex items-center gap-[11px] rounded-field border bg-surface px-4"
      [class.h-[52px]]="!compact()"
      [class.h-11]="compact()"
      [class.is-focus]="focused()"
      [class.is-invalid]="invalid()"
      [class.opacity-60]="disabled()"
    >
      @if (icon(); as iconName) {
        <app-icon [name]="iconName" [size]="18" class="text-disabled" />
      }
      <input
        class="argos-input min-w-0 flex-1 bg-transparent text-primary outline-none placeholder:text-text-muted"
        [class.text-[15px]]="!compact()"
        [class.text-[13.5px]]="compact()"
        [class.font-mono]="mono()"
        [class.uppercase]="uppercase()"
        [class.tracking-wide]="mono()"
        [type]="resolvedType()"
        [attr.id]="inputId()"
        [attr.name]="name()"
        [attr.inputmode]="inputmode()"
        [attr.maxlength]="maxlength()"
        [placeholder]="placeholder()"
        [attr.autocomplete]="autocomplete()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-invalid]="invalid() || null"
        [attr.aria-describedby]="describedBy()"
        [disabled]="disabled()"
        [value]="value()"
        (input)="onInput($event)"
        (focus)="focused.set(true)"
        (blur)="focused.set(false); blurred.emit()"
      />

      @if (type() === 'password') {
        <button
          type="button"
          class="flex shrink-0 items-center gap-1.5 rounded-xs text-[11px] uppercase tracking-[0.5px] text-text-muted transition-colors hover:text-text-body"
          [attr.aria-label]="revealed() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          (click)="revealed.set(!revealed())"
        >
          <app-icon [name]="revealed() ? 'eye-off' : 'eye'" [size]="16" />
          <span class="hidden sm:inline">{{ revealed() ? 'Ocultar' : 'Ver' }}</span>
        </button>
      }

      <ng-content select="[suffix]" />
    </div>
  `,
  styles: `
    :host { display: block; }
    .field {
      border-color: var(--color-border-field);
      transition: border-color var(--dur-fast) var(--ease-standard),
        box-shadow var(--dur-base) var(--ease-standard);
    }
    .field:hover { border-color: #d3cec1; }
    .field.is-focus { border-color: var(--color-secondary); box-shadow: 0 0 0 4px rgba(197, 135, 60, 0.14); }
    .field.is-invalid { border-color: var(--color-danger); }
    .field.is-invalid.is-focus { box-shadow: 0 0 0 4px rgba(137, 47, 38, 0.1); }
    .argos-input::-ms-reveal, .argos-input::-ms-clear { display: none; }
    .argos-input:focus-visible { outline: none; }
  `,
})
export class InputComponent {
  readonly value = model<string>('');
  readonly type = input<'text' | 'email' | 'password' | 'search' | 'tel' | 'number'>('text');
  readonly placeholder = input<string>('');
  readonly icon = input<IconName | null>(null);
  readonly autocomplete = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly inputId = input<string | null>(null);
  readonly name = input<string | null>(null);
  readonly inputmode = input<string | null>(null);
  readonly maxlength = input<number | null>(null);
  readonly describedBy = input<string | null>(null);
  readonly invalid = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly compact = input<boolean>(false);
  readonly mono = input<boolean>(false);
  readonly uppercase = input<boolean>(false);

  readonly blurred = output<void>();

  protected readonly focused = signal(false);
  protected readonly revealed = signal(false);

  protected readonly resolvedType = computed(() =>
    this.type() === 'password' && this.revealed() ? 'text' : this.type(),
  );

  protected onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.value.set(this.uppercase() ? raw.toUpperCase() : raw);
  }
}
