import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  model,
} from '@angular/core';

/**
 * Molécula · menú desplegable. El disparador va en `[trigger]` y las opciones
 * (botones con clase `menu-item`) en el contenido. Cierra al hacer clic fuera,
 * con Escape o al elegir una opción. Aparece con un resorte desde su esquina.
 */
@Component({
  selector: 'app-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <div (click)="open.set(!open())"><ng-content select="[trigger]" /></div>
      @if (open()) {
        <div
          class="menu-panel absolute z-40 mt-2 min-w-[220px] rounded-tile border border-border-card bg-surface p-1.5 shadow-e3"
          [class.right-0]="align() === 'end'"
          [class.left-0]="align() === 'start'"
          [class.origin-top-right]="align() === 'end'"
          [class.origin-top-left]="align() === 'start'"
          role="menu"
          (click)="onPanelClick($event)"
        >
          <ng-content />
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: inline-block; }
    .menu-panel { animation: argos-pop var(--spring-snappy-dur) var(--spring-snappy) both; }
    :host ::ng-deep .menu-item {
      display: flex; width: 100%; align-items: center; gap: 10px; border-radius: 9px;
      padding: 9px 11px; font-size: 13px; color: var(--color-text-primary); text-align: left;
      transition: background-color var(--dur-fast) var(--ease-standard);
    }
    :host ::ng-deep .menu-item:hover, :host ::ng-deep .menu-item:focus-visible { background: var(--color-background); }
    :host ::ng-deep .menu-item.is-danger { color: var(--color-danger); }
    :host ::ng-deep .menu-sep { height: 1px; margin: 6px 4px; background: var(--color-divider); }
    :host ::ng-deep .menu-label { padding: 8px 11px 4px; font-size: 10.5px; letter-spacing: 1px;
      text-transform: uppercase; color: var(--color-text-secondary); }
  `,
})
export class MenuComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly open = model<boolean>(false);
  readonly align = input<'start' | 'end'>('end');

  @HostListener('document:click', ['$event'])
  protected onDocClick(e: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }

  protected onPanelClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.menu-item')) this.open.set(false);
  }
}
