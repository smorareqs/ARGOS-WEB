import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Molécula · campo de formulario = etiqueta (microcopy en mayúsculas) +
 * acción opcional a la derecha + control (proyectado).
 * Ref: login — "Correo electrónico", "Contraseña / ¿Olvidaste…?".
 */
@Component({
  selector: 'app-form-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-2 flex items-center justify-between">
      <span class="text-[10.5px] uppercase tracking-[1px] text-text-muted">{{ label() }}</span>
      <ng-content select="[action]" />
    </div>
    <ng-content />
  `,
  styles: `:host { display: block; }`,
})
export class FormFieldComponent {
  readonly label = input.required<string>();
}
