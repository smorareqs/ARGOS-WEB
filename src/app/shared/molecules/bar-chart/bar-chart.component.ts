import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface ChartDatum {
  readonly label: string;
  readonly value: number;
  /** Marca resaltada (p. ej. el día de hoy o un valor fuera de meta). */
  readonly highlight?: boolean;
}

/**
 * Molécula · gráfico de barras de una sola serie (guía dataviz): barras
 * delgadas en teal con el extremo de datos redondeado a 4 px y ancladas a la
 * base, rejilla tenue, valor solo en la barra resaltada y tooltip al pasar el
 * cursor o con foco. `horizontal` para categorías con nombres largos. Incluye
 * una tabla oculta para lectores de pantalla.
 */
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="m-0">
      @if (horizontal()) {
        <div class="space-y-2.5" role="img" [attr.aria-label]="ariaLabel()">
          @for (d of data(); track d.label; let i = $index) {
            <div class="hrow grid items-center gap-3" [style.grid-template-columns]="'minmax(90px, 34%) 1fr auto'" (mouseenter)="hover.set(i)" (mouseleave)="hover.set(null)">
              <span class="truncate text-[12.5px] text-text-body" [title]="d.label">{{ d.label }}</span>
              <span class="relative h-3 rounded-r-[4px] bg-transparent">
                <span class="hbar absolute inset-y-0 left-0 rounded-r-[4px]" [class.is-hi]="d.highlight" [class.is-dim]="hover() !== null && hover() !== i" [style.width.%]="pct(d.value)" [style.--i]="i"></span>
              </span>
              <span class="tabular w-[72px] text-right text-[12.5px] font-bold text-primary">{{ format()(d.value) }}</span>
            </div>
          }
        </div>
      } @else {
        <div class="relative" [style.height.px]="height()" role="img" [attr.aria-label]="ariaLabel()">
          <div class="absolute inset-0 flex flex-col justify-between pb-6" aria-hidden="true">
            @for (g of grid(); track g) {
              <div class="flex items-center gap-2">
                <span class="tabular w-8 shrink-0 text-right text-[10.5px] text-text-muted">{{ g }}</span>
                <span class="h-px flex-1 bg-divider"></span>
              </div>
            }
          </div>
          <div class="absolute inset-y-0 left-10 right-0 flex items-end gap-[6px] pb-6">
            @for (d of data(); track d.label; let i = $index) {
              <button
                type="button"
                class="col relative flex h-full flex-1 flex-col justify-end outline-none"
                [attr.aria-label]="d.label + ': ' + format()(d.value)"
                (mouseenter)="hover.set(i)"
                (mouseleave)="hover.set(null)"
                (focus)="hover.set(i)"
                (blur)="hover.set(null)"
              >
                <span class="vbar mx-auto block w-full max-w-[34px] rounded-t-[4px]" [class.is-hi]="d.highlight" [class.is-dim]="hover() !== null && hover() !== i" [style.height.%]="pct(d.value)" [style.--i]="i"></span>
                <span class="absolute -bottom-6 left-1/2 w-max -translate-x-1/2 text-[10.5px]" [class]="d.highlight ? 'font-bold text-primary' : 'text-text-secondary'">{{ d.label }}</span>
                @if (hover() === i || (hover() === null && d.highlight && showHighlightValue())) {
                  <span class="tip tabular absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xs bg-primary px-2 py-1 text-[11px] font-bold text-white shadow-e2" [style.bottom]="'calc(' + pct(d.value) + '% + 8px)'">{{ format()(d.value) }}</span>
                }
              </button>
            }
          </div>
        </div>
      }
      <table class="sr-only">
        <caption>{{ ariaLabel() }}</caption>
        <tbody>
          @for (d of data(); track d.label) {
            <tr><th scope="row">{{ d.label }}</th><td>{{ format()(d.value) }}</td></tr>
          }
        </tbody>
      </table>
    </figure>
  `,
  styles: `
    :host { display: block; }
    .vbar, .hbar { background: var(--color-teal-muted); transition: opacity var(--dur-fast), background-color var(--dur-fast); }
    .vbar.is-hi, .hbar.is-hi { background: var(--color-secondary); }
    .is-dim { opacity: 0.45; }
    .vbar { transform-origin: bottom; animation: grow-y 700ms var(--ease-enter) both; animation-delay: calc(var(--i) * 30ms); }
    .hbar { transform-origin: left; animation: grow-x 700ms var(--ease-enter) both; animation-delay: calc(var(--i) * 30ms); }
    .col:focus-visible .vbar { outline: 2px solid var(--color-secondary); outline-offset: 2px; }
    @keyframes grow-y { from { transform: scaleY(0); } }
    @keyframes grow-x { from { transform: scaleX(0); } }
    @media (prefers-reduced-motion: reduce) { .vbar, .hbar { animation: none; } }
  `,
})
export class BarChartComponent {
  readonly data = input.required<readonly ChartDatum[]>();
  readonly ariaLabel = input.required<string>();
  readonly horizontal = input<boolean>(false);
  readonly height = input<number>(200);
  readonly showHighlightValue = input<boolean>(true);
  readonly format = input<(v: number) => string>((v) => v.toLocaleString('es-GT'));

  protected readonly hover = signal<number | null>(null);
  private readonly max = computed(() => {
    const m = Math.max(1, ...this.data().map((d) => d.value));
    const step = niceStep(m / 4);
    return Math.ceil(m / step) * step;
  });
  protected readonly grid = computed(() => {
    const m = this.max();
    return [m, (m * 3) / 4, m / 2, m / 4, 0].map((v) => (Number.isInteger(v) ? v : Math.round(v * 10) / 10));
  });

  protected pct(v: number): number {
    return Math.max(v > 0 ? 1.5 : 0, (v / this.max()) * 100);
  }
}

function niceStep(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(Math.max(raw, 0.0001)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
