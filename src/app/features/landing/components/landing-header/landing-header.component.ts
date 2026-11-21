import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../../../shared/atoms/logo/logo.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';

/**
 * Cabecera de la landing: barra blanca y fija con filete inferior, que se
 * separa del fondo crema (como Airbnb o Guesty). Al bajar se vuelve
 * translúcida y gana sombra (solo la capa funcional lleva material, ref.
 * Apple). En móvil las secciones van en un menú desplegable.
 */
@Component({
  selector: 'app-landing-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LogoComponent, IconComponent],
  host: { '(window:scroll)': 'onScroll()' },
  template: `
    <header class="bar fixed inset-x-0 top-0 z-40" [class.is-scrolled]="scrolled()">
      <div class="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-5 sm:px-8">
        <a routerLink="/" class="rounded-sm text-primary" aria-label="ARGOS · inicio">
          <app-logo [size]="18" [intro]="true" />
        </a>
        <nav class="ml-4 hidden items-center gap-1 lg:flex" aria-label="Secciones">
          @for (l of links; track l.id) {
            <a [routerLink]="[]" [fragment]="l.id" class="link rounded-sm px-3.5 py-2 text-[14px] font-medium">{{ l.label }}</a>
          }
        </nav>
        <div class="ml-auto flex items-center gap-2">
          @if (signedIn()) {
            <a routerLink="/inicio" class="btn-dark press flex h-10 items-center gap-2 rounded-field px-4 text-[14px] font-bold">
              Ir a mi panel <app-icon name="arrow-right" [size]="15" />
            </a>
          } @else {
            <a routerLink="/login" class="link hidden h-10 items-center rounded-field px-3.5 text-[14px] font-bold sm:flex">Iniciar sesión</a>
            <button type="button" class="btn-dark press flex h-10 items-center rounded-field px-4 text-[14px] font-bold" (click)="demo.emit()">
              Solicitar demo
            </button>
          }
          <button
            type="button"
            class="link flex h-10 w-10 items-center justify-center rounded-field lg:hidden"
            [attr.aria-expanded]="menuOpen()"
            aria-label="Secciones"
            (click)="menuOpen.set(!menuOpen())"
          >
            <app-icon [name]="menuOpen() ? 'x' : 'menu'" [size]="20" />
          </button>
        </div>
      </div>
      @if (menuOpen()) {
        <nav class="sheet border-t border-divider bg-surface px-5 pb-5 pt-2 lg:hidden" aria-label="Secciones" animate.enter="sheet-in">
          @for (l of links; track l.id) {
            <a [routerLink]="[]" [fragment]="l.id" class="flex items-center justify-between border-b border-divider py-3.5 text-[15px] text-primary" (click)="menuOpen.set(false)">
              {{ l.label }} <app-icon name="chevron-right" [size]="16" class="text-text-muted" />
            </a>
          }
          @if (!signedIn()) {
            <a routerLink="/login" class="mt-4 flex h-11 items-center justify-center rounded-field border border-border-field text-[14px] font-bold text-primary">Iniciar sesión</a>
          }
        </nav>
      }
    </header>
  `,
  styles: `
    .bar { background: #fff; color: var(--color-primary); box-shadow: 0 1px 0 rgba(0, 56, 65, 0.1);
      transition: box-shadow var(--dur-base) var(--ease-standard), background-color var(--dur-base); }
    .bar.is-scrolled { background: rgba(255, 255, 255, 0.92); -webkit-backdrop-filter: var(--glass-filter); backdrop-filter: var(--glass-filter);
      box-shadow: 0 1px 0 rgba(0, 56, 65, 0.1), 0 10px 24px -16px rgba(0, 56, 65, 0.4); }
    .link { color: #1f444b; transition: color var(--dur-fast), background-color var(--dur-fast); }
    .link:hover { color: var(--color-primary); background: rgba(0, 56, 65, 0.06); }
    .btn-dark { background: var(--color-primary); color: #fff; transition: background-color var(--dur-fast); }
    .btn-dark:hover { background: #0b4a55; }
    .sheet-in { animation: sheet-in 220ms var(--ease-enter) both; }
    @keyframes sheet-in { from { opacity: 0; transform: translateY(-6px); } }
  `,
})
export class LandingHeaderComponent {
  readonly signedIn = input<boolean>(false);
  readonly demo = output<void>();

  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly links = [
    { id: 'operacion', label: 'Operación' },
    { id: 'panel', label: 'Panel' },
    { id: 'empresas', label: 'Multiempresa' },
    { id: 'seguridad', label: 'Seguridad' },
    { id: 'nombre', label: 'Por qué ARGOS' },
  ];

  protected onScroll(): void {
    const s = window.scrollY > 8;
    if (s !== this.scrolled()) this.scrolled.set(s);
  }
}
