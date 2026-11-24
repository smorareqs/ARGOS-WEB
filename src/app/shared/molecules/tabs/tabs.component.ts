import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface TabOption {
  readonly value: string;
  readonly label: string;
  /** Contador opcional (pendientes, abiertas…). */
  readonly count?: number | null;
  /** Resalta el contador en ámbar cuando pide atención. */
  readonly attention?: boolean;
}

/**
 * Molécula · pestañas de sección con subrayado (como las de Airbnb, Stripe y
 * Linear). Organizan las subpantallas de un módulo (Inventario → Artículos,
 * Existencias…). En móvil se desplazan en horizontal. Para alternar vistas de
 * un mismo dato se usa `app-segmented`.
 */
@Component({
  selector: 'app-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scroller -mx-1 flex gap-1 overflow-x-auto border-b border-border-card px-1" role="tablist" [attr.aria-label]="ariaLabel()">
      @for (t of options(); track t.value) {
        <button
          type="button"
          role="tab"
          class="tab relative flex h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-[13.5px] font-medium"
          [class.is-on]="t.value === value()"
          [attr.aria-selected]="t.value === value()"
          (click)="value.set(t.value)"
        >
          {{ t.label }}
          @if (t.count !== undefined && t.count !== null) {
            <span class="count tabular rounded-xs px-1.5 py-px text-[11px] font-bold" [class.is-attn]="t.attention && t.count > 0">{{ t.count }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .scroller { scrollbar-width: none; }
    .scroller::-webkit-scrollbar { display: none; }
    .tab { color: var(--color-text-secondary); transition: color var(--dur-fast); }
    .tab:hover { color: var(--color-primary); }
    .tab::after { content: ''; position: absolute; left: 10px; right: 10px; bottom: -1px; height: 2px; border-radius: 2px; background: var(--color-primary); transform: scaleX(0); transition: transform var(--spring-snappy-dur) var(--spring-snappy); }
    .tab.is-on { color: var(--color-primary); font-weight: 700; }
    .tab.is-on::after { transform: scaleX(1); }
    .count { background: var(--color-teal-washed); color: var(--color-teal-muted); }
    .count.is-attn { background: var(--color-warning-soft); color: var(--color-warning); }
    @media (prefers-reduced-motion: reduce) { .tab::after { transition: none; } }
  `,
})
export class TabsComponent {
  readonly options = input.required<readonly TabOption[]>();
  readonly value = model.required<string>();
  readonly ariaLabel = input<string | null>(null);
}
