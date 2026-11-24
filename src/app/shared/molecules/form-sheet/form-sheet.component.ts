import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent } from '../../atoms/button/button.component';
import { SpotIconComponent, SpotIconName } from '../../atoms/spot-icon/spot-icon.component';

/**
 * Molécula · formulario dentro de un drawer (ux-ui.md §3.3): cabecera con
 * ilustración, campos proyectados y pie fijo con Cancelar y la acción. Lo usan
 * las altas de todos los módulos (entrada de inventario, incidencia, reserva…).
 * Los campos van como `app-form-field`; el error general va en `error`.
 */
@Component({
  selector: 'app-form-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, SpotIconComponent],
  template: `
    <form novalidate class="flex min-h-full flex-col" (submit)="onSubmit($event)">
      <div class="flex items-start gap-4 px-6 pb-2 pt-7 pr-14">
        @if (spot()) {
          <app-spot-icon [name]="spot()!" [size]="56" />
        }
        <div>
          <div class="text-[11px] uppercase tracking-[1.6px] text-secondary">{{ eyebrow() }}</div>
          <h2 class="mt-1 font-display text-[28px] font-semibold leading-tight tracking-display text-primary">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="mt-1 text-[13px] leading-relaxed text-text-body">{{ subtitle() }}</p>
          }
        </div>
      </div>
      <div class="flex flex-1 flex-col gap-5 px-6 py-6">
        <ng-content />
        @if (error()) {
          <p class="rounded-field bg-danger-soft px-4 py-3 text-[13px] text-danger" role="alert">{{ error() }}</p>
        }
      </div>
      <div class="material-glass sticky bottom-0 flex justify-end gap-2.5 border-t border-divider px-6 py-4">
        <app-button variant="tertiary" (pressed)="cancel.emit()">Cancelar</app-button>
        <app-button variant="primary" type="submit" [loading]="saving()">{{ submitLabel() }}</app-button>
      </div>
    </form>
  `,
  styles: `:host { display: block; min-height: 100%; }`,
})
export class FormSheetComponent {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly spot = input<SpotIconName | null>(null);
  readonly submitLabel = input<string>('Guardar');
  readonly saving = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly submitted = output<void>();
  readonly cancel = output<void>();

  protected onSubmit(e: Event): void {
    e.preventDefault();
    this.submitted.emit();
  }
}
