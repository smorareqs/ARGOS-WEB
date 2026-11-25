import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, computed, input, signal, viewChild } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DimIconComponent } from '../../atoms/dim-icon/dim-icon.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import { SidebarSection } from '../sidebar/sidebar.component';

/**
 * Organismo · barra de secciones bajo la topbar (ref. la barra de categorías
 * de Airbnb: un ícono con volumen sobre el nombre, el activo subrayado). Está
 * siempre a la vista para moverse entre módulos sin abrir el menú. Cada
 * sección tiene su color: un halo que aparece detrás del ícono al pasar el
 * cursor y queda en la activa. Al bajar en la página se compacta. Con más
 * secciones que ancho, se desplaza con flechas (escritorio) o con el dedo.
 */
@Component({
  selector: 'app-nav-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, DimIconComponent, IconComponent],
  host: { '[class.compact]': 'compact()' },
  template: `
    <div class="wrap relative">
      @if (canLeft()) {
        <button type="button" class="arrow left-1" aria-label="Ver secciones anteriores" (click)="scroll(-1)"><app-icon name="chevron-left" [size]="16" /></button>
      }
      <nav #track class="track flex items-end gap-1 overflow-x-auto px-3 sm:px-6 lg:px-8" aria-label="Secciones" (scroll)="edges()">
        @for (item of items(); track item.route; let i = $index) {
          @if (item.divider) {
            <span class="divider" aria-hidden="true"></span>
          }
          <a
            [routerLink]="item.route"
            routerLinkActive="on"
            [routerLinkActiveOptions]="{ exact: false }"
            class="item group"
            [style.--tint]="item.tint"
            [style.--i]="i"
          >
            <span class="halo" aria-hidden="true"></span>
            @if (item.dim) {
              <app-dim-icon [name]="item.dim" [size]="34" class="ico" />
            }
            <span class="label">{{ item.label }}</span>
          </a>
        }
      </nav>
      @if (canRight()) {
        <button type="button" class="arrow right-1" aria-label="Ver más secciones" (click)="scroll(1)"><app-icon name="chevron-right" [size]="16" /></button>
      }
    </div>
  `,
  styles: `
    :host { display: block; position: sticky; top: var(--topbar-h); z-index: 29; background: rgba(250, 248, 243, .94);
      backdrop-filter: blur(10px); box-shadow: 0 1px 0 rgba(0, 56, 65, .08); }
    .track { scrollbar-width: none; scroll-snap-type: x proximity; }
    .item { position: relative; flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 3px;
      min-width: 74px; padding: 10px 8px 9px; scroll-snap-align: start; animation: item-in 420ms var(--spring-standard) backwards;
      animation-delay: calc(min(var(--i), 14) * 28ms); }
    @keyframes item-in { from { opacity: 0; transform: translateY(6px); } }
    .item::after { content: ''; position: absolute; left: 14px; right: 14px; bottom: 0; height: 3px; border-radius: 3px 3px 0 0;
      background: var(--color-primary); transform: scaleX(0); transition: transform var(--spring-snappy-dur) var(--spring-snappy); }
    .item.on::after { transform: scaleX(1); }
    .halo { position: absolute; top: 6px; left: 50%; width: 46px; height: 46px; margin-left: -23px; border-radius: 50%;
      background: var(--tint); transform: scale(.4); opacity: 0; transition: transform var(--spring-bounce-dur) var(--spring-bounce), opacity var(--dur-fast); }
    .item:hover .halo, .item.on .halo { transform: scale(1); opacity: 1; }
    .ico { position: relative; transition: transform var(--spring-snappy-dur) var(--spring-snappy), width var(--dur-base), height var(--dur-base); }
    .item:hover .ico { transform: translateY(-2px) scale(1.06); }
    .label { position: relative; font-size: 12px; font-weight: 600; color: var(--color-text-secondary); white-space: nowrap; transition: color var(--dur-fast); }
    .item:hover .label { color: var(--color-primary); }
    .item.on .label { color: var(--color-primary); font-weight: 700; }
    .divider { flex: 0 0 auto; align-self: center; width: 1px; height: 34px; margin: 0 6px; background: rgba(0, 56, 65, .1); }
    :host(.compact) .item { padding-top: 6px; padding-bottom: 7px; }
    :host(.compact) .ico { width: 24px !important; height: 24px !important; }
    :host(.compact) .halo { top: 2px; width: 34px; height: 34px; margin-left: -17px; }
    .arrow { position: absolute; top: 50%; z-index: 2; display: none; place-items: center; width: 30px; height: 30px; margin-top: -15px;
      border-radius: 50%; background: #fff; color: var(--color-primary); box-shadow: 0 2px 8px rgba(0, 56, 65, .2); }
    @media (hover: hover) { .arrow { display: grid; } }
    @media (prefers-reduced-motion: reduce) { .item { animation: none; } .halo, .ico, .item::after { transition: none; } }
  `,
})
export class NavBarComponent {
  readonly sections = input.required<readonly SidebarSection[]>();
  readonly compact = input<boolean>(false);

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  protected readonly canLeft = signal(false);
  protected readonly canRight = signal(false);

  protected readonly items = computed(() =>
    this.sections().flatMap((s, si) => s.items.map((item, ii) => ({ ...item, divider: si > 0 && ii === 0 }))),
  );

  constructor() {
    afterNextRender(() => {
      this.edges();
      const ro = new ResizeObserver(() => this.edges());
      ro.observe(this.track().nativeElement);
    });
  }

  protected edges(): void {
    const el = this.track().nativeElement;
    this.canLeft.set(el.scrollLeft > 4);
    this.canRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  protected scroll(dir: 1 | -1): void {
    const el = this.track().nativeElement;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' });
  }
}
