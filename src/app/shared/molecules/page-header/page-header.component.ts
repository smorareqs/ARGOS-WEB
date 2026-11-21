import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Molécula · cabecera de página ("área de lectura" de One UI): título grande
 * grande con tracking negativo, contexto debajo y acciones a la derecha.
 * Al hacer scroll, el main-layout muestra el título compacto en la topbar.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reveal flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div class="min-w-0">
        @if (eyebrow()) {
          <div class="mb-2 text-[11px] uppercase tracking-[1.6px] text-secondary">{{ eyebrow() }}</div>
        }
        <h1
          class="font-display text-[34px] font-semibold leading-[1.05] tracking-display text-primary sm:text-[40px]"
        >
          {{ title() }}
        </h1>
        @if (subtitle()) {
          <p class="mt-2 max-w-[640px] text-[14px] leading-relaxed text-text-body">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2.5"><ng-content /></div>
    </div>
  `,
  styles: `:host { display: block; }`,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly eyebrow = input<string | null>(null);
}
