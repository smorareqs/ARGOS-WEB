import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';

/**
 * Organismo · panel lateral de detalle (detail-drawer, 480 px, ux-ui.md §3.6).
 * Mantiene la lista y los filtros detrás. Entra con resorte desde la derecha
 * y sale más rápido (salida ~30 % más corta, §2.4). Escape o clic en el
 * velo lo cierran; el foco entra al abrir y vuelve al disparador al cerrar.
 */
@Component({
  selector: 'app-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (open()) {
      <div class="drawer-root fixed inset-0 z-50" animate.enter="drawer-enter" animate.leave="drawer-leave">
        <div class="scrim absolute inset-0" (click)="open.set(false)"></div>
        <aside
          #panel
          class="panel absolute bottom-0 right-0 top-0 flex w-full flex-col overflow-hidden bg-surface-soft shadow-e3 outline-none sm:rounded-l-sheet"
          [style.max-width.px]="width()"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="label()"
          tabindex="-1"
        >
          <button
            type="button"
            class="press absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-field bg-surface/85 text-primary shadow-e1 backdrop-blur hover:bg-surface"
            aria-label="Cerrar panel"
            (click)="open.set(false)"
          >
            <app-icon name="x" [size]="18" />
          </button>
          <div class="flex-1 overflow-y-auto overscroll-contain"><ng-content /></div>
          <ng-content select="[drawer-footer]" />
        </aside>
      </div>
    }
  `,
  styles: `
    .scrim { background: var(--overlay); backdrop-filter: blur(2px); }
    .drawer-enter { animation: argos-hold var(--spring-standard-dur) linear; }
    .drawer-enter .scrim { animation: argos-fade var(--dur-base) var(--ease-standard) both; }
    .drawer-enter .panel { animation: drawer-in var(--spring-standard-dur) var(--spring-standard) both; }
    .drawer-leave { animation: argos-hold 220ms linear both; }
    .drawer-leave .scrim { animation: argos-fade 220ms var(--ease-exit) reverse both; }
    .drawer-leave .panel { animation: drawer-in 220ms var(--ease-exit) reverse both; }
    @keyframes drawer-in { from { transform: translateX(104%); } }
    @keyframes argos-hold { to { opacity: 1; } }
  `,
})
export class DrawerComponent {
  readonly open = model<boolean>(false);
  readonly label = input<string>('Detalle');
  readonly width = input<number>(480);

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private returnFocus: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.returnFocus = document.activeElement as HTMLElement | null;
        setTimeout(() => this.panel()?.nativeElement.focus(), 30);
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
        this.returnFocus?.focus?.();
        this.returnFocus = null;
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.open.set(false);
  }
}
