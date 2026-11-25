import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CATEGORY_LABEL, Item, ItemCategory } from '../../models/inventory.model';
import { DimIconComponent, DimIconName } from '../../../../shared/atoms/dim-icon/dim-icon.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';

/** Color y objeto de cada categoría (también los usan los filtros de la página). */
export const CATEGORY_META: Record<ItemCategory, { dim: DimIconName; bg: string; ink: string; dot: string }> = {
  linens: { dim: 'linens', bg: '#e2edef', ink: '#2c5c64', dot: '#3a6168' },
  amenities: { dim: 'amenities', bg: '#fbecd9', ink: '#93561a', dot: '#c5873c' },
  cleaning: { dim: 'cleaning', bg: '#e0eee5', ink: '#2e6748', dot: '#5a8a6b' },
  kitchen: { dim: 'kitchen', bg: '#f8e2d6', ink: '#93421f', dot: '#b5582a' },
  keys: { dim: 'key', bg: '#f4ead0', ink: '#74560f', dot: '#9a6722' },
};

type Level = 'out' | 'low' | 'ok' | 'free';
export type ItemSort = 'urgency' | 'name' | 'stock';
const LEVEL: Record<Level, { label: string; rank: number }> = {
  out: { label: 'Agotado', rank: 0 },
  low: { label: 'Bajo mínimo', rank: 1 },
  ok: { label: 'En orden', rank: 2 },
  free: { label: 'Sin mínimo', rank: 3 },
};

/**
 * Inventario · lista visual de artículos (W-F1). Cada fila muestra el objeto
 * de su categoría, un medidor de nivel con la marca del mínimo y el estado en
 * palabras: lo agotado y lo bajo mínimo suben primero (ref. Sortly y la vista
 * de inventario de Shopify, que muestran la existencia como nivel y no como
 * tres columnas de números). Tocar una fila abre el ajuste de existencias.
 */
@Component({
  selector: 'app-item-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DimIconComponent, IconComponent],
  template: `
    <div class="box overflow-hidden rounded-card border border-border-card bg-surface shadow-e1">
      <div class="head flex items-center gap-4 border-b border-divider px-5 py-2.5 text-[10.5px] uppercase tracking-[1px] text-text-secondary">
        <span class="flex-1">Artículo</span>
        <span class="hidden w-[150px] lg:block">Categoría</span>
        <span class="hidden w-[260px] md:block">Nivel</span>
        <span class="w-[92px] text-right">Existencia</span>
        <span class="hidden w-4 sm:block"></span>
      </div>
      @if (loading()) {
        @for (i of [0, 1, 2, 3, 4]; track i) {
          <div class="flex items-center gap-4 border-b border-divider px-5 py-3.5 last:border-0">
            <span class="skeleton h-11 w-11 !rounded-[12px]"></span><span class="skeleton h-3 w-40"></span>
          </div>
        }
      } @else {
        <ul>
          @for (r of rows(); track r.item.id; let i = $index) {
            <li class="reveal-soft" [style.--i]="i">
              <button type="button" class="row group" [class]="'lv-' + r.level" [disabled]="!clickable()" (click)="picked.emit(r.item)">
                <span class="tile" [style.background]="r.meta.bg"><app-dim-icon [name]="r.meta.dim" [size]="34" /></span>
                <span class="min-w-0 flex-1">
                  <span class="line-clamp-2 text-[14px] font-bold leading-snug text-primary">{{ r.item.name }}</span>
                  <span class="mt-0.5 flex items-center gap-2 text-[11.5px] text-text-secondary">
                    <span class="whitespace-nowrap font-mono">{{ r.item.sku }}</span>
                    <span class="state md:hidden"><span class="dot"></span>{{ r.short }}</span>
                    <span class="hidden md:inline lg:hidden"><span class="cat" [style.background]="r.meta.bg" [style.color]="r.meta.ink">{{ r.cat }}</span></span>
                  </span>
                </span>
                <span class="hidden w-[150px] lg:block"><span class="cat" [style.background]="r.meta.bg" [style.color]="r.meta.ink">{{ r.cat }}</span></span>
                <span class="hidden w-[260px] md:block">
                  <span class="gauge"><span class="fill" [style.width.%]="r.fill"></span>
                    @if (r.item.min > 0) { <span class="tick" [style.left.%]="r.tick"></span> }
                  </span>
                  <span class="mt-1.5 flex items-center justify-between text-[11px]">
                    <span class="state"><span class="dot"></span>{{ r.label }}</span>
                    <span class="text-text-secondary">{{ r.note }}</span>
                  </span>
                </span>
                <span class="w-[92px] text-right">
                  <span class="qty tabular block">{{ r.item.total }}</span>
                  <span class="block text-[11px] text-text-secondary">{{ r.item.unit }}</span>
                </span>
                <app-icon name="chevron-right" [size]="16" class="chev hidden text-text-muted sm:block" />
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .row { display: flex; width: 100%; align-items: center; gap: 12px; padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--color-divider);
      position: relative; transition: background-color var(--dur-fast); }
    @media (min-width: 640px) { .row { gap: 16px; padding: 12px 20px; } }
    li:last-child .row { border-bottom: 0; }
    .row:not(:disabled):hover { background: var(--color-surface-soft); }
    .row::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; border-radius: 0 3px 3px 0; background: var(--lv); opacity: 0; }
    .lv-out, .lv-low { &::before { opacity: 1; } }
    .tile { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0;
      box-shadow: inset 0 -2px 0 rgba(0,0,0,.05); transition: transform var(--spring-snappy-dur) var(--spring-snappy); }
    .row:hover .tile { transform: translateY(-2px) rotate(-3deg); }
    .cat { display: inline-flex; height: 22px; align-items: center; padding: 0 9px; border-radius: var(--radius-pill); font-size: 11.5px; font-weight: 700; white-space: nowrap; }
    .gauge { position: relative; display: block; height: 8px; border-radius: 99px; background: var(--color-track); }
    .fill { display: block; height: 100%; border-radius: inherit; background: var(--lv); transform-origin: left; animation: grow 700ms var(--ease-enter) both; }
    .tick { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; border-radius: 2px; background: var(--color-primary); opacity: .55; }
    .state { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: var(--lv-ink); }
    .dot { width: 7px; height: 7px; border-radius: 99px; background: var(--lv); }
    .lv-out .dot { animation: beat 1.6s ease-in-out infinite; }
    .qty { font-size: 22px; font-weight: 700; line-height: 1.1; color: var(--lv-qty, var(--color-primary)); }
    .lv-out { --lv: #b8432f; --lv-ink: #9b3423; --lv-qty: #9b3423; }
    .lv-low { --lv: #d08a2e; --lv-ink: #8f5a12; --lv-qty: #8f5a12; }
    .lv-ok { --lv: #5a8a6b; --lv-ink: #2e6748; }
    .lv-free { --lv: #a9b8b6; --lv-ink: var(--color-text-secondary); }
    .chev { transition: transform var(--dur-fast); }
    .row:hover .chev { transform: translateX(3px); color: var(--color-primary); }
    @keyframes grow { from { transform: scaleX(0); } }
    @keyframes beat { 50% { transform: scale(1.5); opacity: .6; } }
    @media (prefers-reduced-motion: reduce) { .fill, .dot { animation: none !important; } }
  `,
})
export class ItemTableComponent {
  readonly items = input.required<readonly Item[]>();
  readonly loading = input(false);
  readonly clickable = input(true);
  readonly sort = input<ItemSort>('urgency');
  readonly picked = output<Item>();

  protected readonly rows = computed(() => {
    const rows = this.items().map((item) => {
      const level: Level = item.min <= 0 ? 'free' : item.total <= 0 ? 'out' : item.total < item.min ? 'low' : 'ok';
      const max = Math.max(item.min * 2, item.total, 1);
      return {
        item,
        level,
        label: LEVEL[level].label,
        note: item.min > 0 ? (item.total < item.min ? `faltan ${item.min - item.total} · mín ${item.min}` : `mín ${item.min}`) : '',
        fill: (item.total / max) * 100,
        tick: (item.min / max) * 100,
        meta: CATEGORY_META[item.category],
        cat: CATEGORY_LABEL[item.category],
        short: level === 'low' ? `faltan ${item.min - item.total}` : LEVEL[level].label,
      };
    });
    const s = this.sort();
    return rows.sort((a, b) =>
      s === 'name' ? a.item.name.localeCompare(b.item.name, 'es')
        : s === 'stock' ? a.item.total - b.item.total
          : LEVEL[a.level].rank - LEVEL[b.level].rank || a.item.total / Math.max(1, a.item.min) - b.item.total / Math.max(1, b.item.min),
    );
  });
}
