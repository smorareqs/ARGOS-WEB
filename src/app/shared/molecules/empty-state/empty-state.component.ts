import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DimIconComponent, DimIconName } from '../../atoms/dim-icon/dim-icon.component';

export type EmptyKind = 'properties' | 'search' | 'team' | 'error' | 'soon' | 'done';

const DIM: Record<EmptyKind, DimIconName> = {
  properties: 'house',
  search: 'search',
  team: 'team',
  error: 'warning',
  soon: 'calendar',
  done: 'done',
};

/**
 * Molécula · estado vacío (ux-ui.md §2.4 y §3.1): el objeto del caso con
 * volumen (app-dim-icon) sobre un halo suave, título, una frase y una acción
 * opcional.
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DimIconComponent],
  template: `
    <div class="reveal mx-auto flex max-w-[380px] flex-col items-center px-6 py-12 text-center">
      <div class="stage mb-4 grid h-[120px] w-[120px] place-items-center">
        <app-dim-icon [name]="dim()" [size]="96" />
      </div>
      <h3 class="font-display text-[22px] font-semibold leading-tight text-primary">{{ title() }}</h3>
      <p class="mt-2 text-[13.5px] leading-relaxed text-text-body">{{ message() }}</p>
      <div class="mt-5 flex flex-wrap justify-center gap-2.5"><ng-content /></div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .stage { border-radius: 50%; background: radial-gradient(closest-side, rgba(197,135,60,.14), rgba(197,135,60,.05) 62%, transparent); }
  `,
})
export class EmptyStateComponent {
  readonly kind = input<EmptyKind>('soon');
  readonly title = input.required<string>();
  readonly message = input.required<string>();

  protected readonly dim = computed(() => DIM[this.kind()]);
}
