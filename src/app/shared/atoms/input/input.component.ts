import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

/**
 * Átomo · campo de texto con icono opcional (§03 Campos de formulario).
 * Altura 52px, radio de campo (12px), borde de campo.
 *
 * Si `type="password"` muestra un toggle "Ver / Ocultar" propio del design
 * system (no el control nativo del navegador, que se oculta vía CSS).
 * Usa `model()` para enlace bidireccional sencillo desde las páginas.
 */
@Component({
  selector: 'app-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="flex h-[52px] items-center gap-[11px] rounded-field border bg-surface px-4 transition-colors"
      [class.border-border-field]="!focused()"
      [class.border-secondary]="focused()"
    >
      @if (icon(); as iconName) {
        <app-icon [name]="iconName" [size]="18" class="text-disabled" />
      }
      <input
        class="argos-input min-w-0 flex-1 bg-transparent text-[15px] text-primary outline-none placeholder:text-text-muted"
        [type]="resolvedType()"
        [placeholder]="placeholder()"
        [attr.autocomplete]="autocomplete()"
        [attr.aria-label]="ariaLabel()"
        [value]="value()"
        (input)="value.set($any($event.target).value)"
        (focus)="focused.set(true)"
        (blur)="focused.set(false)"
      />

      @if (type() === 'password') {
        <button
          type="button"
          class="flex shrink-0 items-center gap-1.5 text-[11px] uppercase tracking-[0.5px] text-disabled transition-colors hover:text-text-secondary"
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
    /* Ocultar el control nativo de revelar contraseña (Edge/Chrome). */
    .argos-input::-ms-reveal,
    .argos-input::-ms-clear { display: none; }
  `,
})
export class InputComponent {
  readonly value = model<string>('');
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly placeholder = input<string>('');
  readonly icon = input<IconName | null>(null);
  readonly autocomplete = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);

  protected readonly focused = signal(false);
  protected readonly revealed = signal(false);

  /** Cuando es password y está revelado, mostramos texto plano. */
  protected readonly resolvedType = computed(() =>
    this.type() === 'password' && this.revealed() ? 'text' : this.type(),
  );
}
