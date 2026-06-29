import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';

/**
 * Molécula · barra de búsqueda (icono + input) sobre fondo arena.
 * Ref: topbar — "Buscar propiedad, empleado…".
 */
@Component({
  selector: 'app-search-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="flex h-10 items-center gap-2.5 rounded-[10px] bg-background px-3.5"
    >
      <app-icon name="search" [size]="16" class="text-disabled" />
      <input
        class="min-w-0 flex-1 bg-transparent text-[13px] text-primary outline-none placeholder:text-disabled"
        type="search"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="value.set($any($event.target).value)"
      />
    </div>
  `,
  styles: `:host { display: block; }`,
})
export class SearchBarComponent {
  readonly value = model<string>('');
  readonly placeholder = input<string>('Buscar…');
}
