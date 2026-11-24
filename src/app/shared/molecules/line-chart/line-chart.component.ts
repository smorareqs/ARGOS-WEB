import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ChartDatum } from '../bar-chart/bar-chart.component';

/**
 * Molécula · línea de una sola serie para cambios en el tiempo (guía dataviz):
 * trazo de 2 px, área tenue, marcador solo en el último punto y en el que
 * está bajo el cursor (línea guía + tooltip). Una sola escala; tabla oculta
 * para lectores de pantalla.
 */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="relative m-0">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + height()" class="block h-auto w-full overflow-visible" role="img" [attr.aria-label]="ariaLabel()" (mouseleave)="hover.set(null)">
        @for (g of grid(); track g.v) {
          <line [attr.x1]="padL" [attr.x2]="W" [attr.y1]="g.y" [attr.y2]="g.y" class="grid" />
          <text [attr.x]="padL - 8" [attr.y]="g.y + 3.5" text-anchor="end" class="tick">{{ g.label }}</text>
        }
        <path [attr.d]="area()" class="area" />
        <path [attr.d]="line()" class="line" />
        @for (p of points(); track p.label; let i = $index; let last = $last) {
          <text [attr.x]="p.x" [attr.y]="height() - 4" text-anchor="middle" class="tick" [class.is-on]="hover() === i">{{ p.label }}</text>
          <rect [attr.x]="p.x - step() / 2" y="0" [attr.width]="step()" [attr.height]="height() - 18" fill="transparent" (mouseenter)="hover.set(i)" />
          @if (hover() === i) {
            <line [attr.x1]="p.x" [attr.x2]="p.x" y1="6" [attr.y2]="height() - 22" class="cross" />
          }
          @if (hover() === i || (last && hover() === null)) {
            <circle [attr.cx]="p.x" [attr.cy]="p.y" r="5" class="dot" />
          }
        }
      </svg>
      @if (hover() !== null) {
        @let p = points()[hover()!];
        <div class="tabular pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xs bg-primary px-2 py-1 text-[11px] font-bold text-white shadow-e2" [style.left.%]="(p.x / W) * 100" [style.top.%]="(p.y / height()) * 100 - 4">
          {{ p.label }} · {{ format()(p.value) }}
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
    .grid { stroke: var(--color-divider); stroke-width: 1; }
    .tick { fill: var(--color-text-muted); font-size: 10.5px; font-variant-numeric: tabular-nums; }
    .tick.is-on { fill: var(--color-primary); font-weight: 700; }
    .line { fill: none; stroke: var(--color-primary); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .area { fill: var(--color-teal-washed); opacity: 0.8; }
    .cross { stroke: var(--color-text-muted); stroke-width: 1; stroke-dasharray: 3 3; }
    .dot { fill: var(--color-secondary); stroke: var(--color-surface); stroke-width: 2; }
  `,
})
export class LineChartComponent {
  readonly data = input.required<readonly ChartDatum[]>();
  readonly ariaLabel = input.required<string>();
  readonly height = input<number>(200);
  readonly format = input<(v: number) => string>((v) => v.toLocaleString('es-GT'));

  protected readonly W = 560;
  protected readonly padL = 36;
  protected readonly hover = signal<number | null>(null);

  private readonly max = computed(() => {
    const m = Math.max(1, ...this.data().map((d) => d.value));
    const p = 10 ** Math.floor(Math.log10(m));
    return Math.ceil(m / (p / 2)) * (p / 2);
  });
  protected readonly step = computed(() => (this.W - this.padL - 12) / Math.max(1, this.data().length - 1));
  protected readonly points = computed(() => {
    const h = this.height() - 26;
    return this.data().map((d, i) => ({ ...d, x: this.padL + 6 + i * this.step(), y: 8 + h - (d.value / this.max()) * (h - 8) }));
  });
  protected readonly grid = computed(() => {
    const h = this.height() - 26;
    return [1, 0.5, 0].map((f) => ({ v: f, y: 8 + h - f * (h - 8), label: this.format()(Math.round(this.max() * f)) }));
  });
  protected readonly line = computed(() => this.points().map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '));
  protected readonly area = computed(() => {
    const pts = this.points();
    if (!pts.length) return '';
    const base = this.height() - 18;
    return `${this.line()} L${pts[pts.length - 1].x},${base} L${pts[0].x},${base} Z`;
  });
}
