import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';

/**
 * Molécula · campo de formulario (ux-ui.md §3.3): etiqueta siempre visible
 * encima, acción opcional a la derecha, control proyectado y, debajo, el error
 * con causa y salida (o una pista). El error entra con un fundido corto.
 */
@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="mb-2 flex items-center justify-between gap-3">
      <label [attr.for]="for()" class="text-[10.5px] uppercase tracking-[1px] text-text-secondary">
        {{ label() }}
        @if (required()) {
          <span class="text-secondary" aria-hidden="true">*</span>
        }
        @if (optional()) {
          <span class="normal-case tracking-normal text-text-muted">(opcional)</span>
        }
      </label>
      <ng-content select="[action]" />
    </div>
    <ng-content />
    @if (error()) {
      <p
        [attr.id]="errorId()"
        class="reveal-soft mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-danger"
        role="alert"
      >
        <app-icon name="info" [size]="14" class="mt-px" />
        {{ error() }}
      </p>
    } @else if (hint()) {
      <p class="mt-1.5 text-[11.5px] leading-snug text-text-secondary">{{ hint() }}</p>
    }
  `,
  styles: `:host { display: block; }`,
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly for = input<string | null>(null);
  readonly required = input<boolean>(false);
  readonly optional = input<boolean>(false);
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly errorId = input<string | null>(null);
}
