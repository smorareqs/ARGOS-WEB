import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent, IconName } from '../../atoms/icon/icon.component';
import { AvatarComponent } from '../../atoms/avatar/avatar.component';

export interface SidebarItem {
  readonly label: string;
  readonly icon: IconName;
  readonly route: string;
  /** Contador opcional (ej. mantenimiento · 3). */
  readonly badge?: number;
  /** Sección planificada pero aún no construida (muestra "Pronto"). */
  readonly soon?: boolean;
}

export interface SidebarSection {
  readonly label: string | null;
  readonly items: readonly SidebarItem[];
}

export interface SidebarUser {
  readonly nombre: string;
  readonly iniciales: string;
  readonly rol: string;
}

/**
 * Organismo · navegación principal como panel flotante que sale del botón de
 * menú de la topbar (como la bandeja de notificaciones, pero a la izquierda).
 * No ocupa columna: el contenido usa siempre el 100 % del ancho. Lo abre y
 * cierra el layout (clic, o al pasar el cursor sobre el botón en escritorio).
 * Presentacional: recibe secciones ya filtradas por permisos.
 *
 * El indicador activo es una sola píldora que se desliza con resorte entre
 * elementos al navegar.
 */
@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent, AvatarComponent],
  host: {
    class: 'sidebar-host',
    '[class.is-open]': 'open()',
    '(pointerenter)': 'hover.emit(true)',
    '(pointerleave)': 'hover.emit(false)',
  },
  template: `
    <nav id="argos-nav" class="side flex max-h-full flex-col rounded-sheet bg-primary pb-3 pt-2.5 font-sans" aria-label="Navegación principal">
      <div #list class="list relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5">
        <span
          class="indicator pointer-events-none absolute left-2.5 right-2.5 rounded-[10px]"
          [class.is-ready]="indicatorReady()"
          [style.opacity]="indicator().visible ? 1 : 0"
          [style.height.px]="indicator().h"
          [style.transform]="'translateY(' + indicator().y + 'px)'"
          aria-hidden="true"
        ></span>

        @for (section of sections(); track $index; let firstSection = $first) {
          @if (section.label) {
            <div class="px-3 pb-1 pt-4 text-[10px] uppercase tracking-[1.4px] text-white/40" [class.!pt-1.5]="firstSection">
              {{ section.label }}
            </div>
          } @else if (!firstSection) {
            <div class="mx-3 my-2.5 h-px bg-white/10"></div>
          }
          @for (item of section.items; track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="is-active"
              [routerLinkActiveOptions]="{ exact: false }"
              class="nav-item relative z-[1] flex items-center gap-3 rounded-[10px] px-3 py-[9px]"
              (click)="navigate.emit()"
            >
              <app-icon [name]="item.icon" [size]="19" class="nav-icon text-white/55" />
              <span class="nav-label truncate text-[13px] text-white/70">{{ item.label }}</span>
              @if (item.badge) {
                <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-pill bg-danger px-1.5 text-[11px] font-bold text-white">{{ item.badge }}</span>
              } @else if (item.soon) {
                <span class="ml-auto rounded-xs border border-white/15 px-2 py-px text-[9.5px] uppercase tracking-[0.8px] text-white/45">Pronto</span>
              }
            </a>
          }
        }
      </div>

      <div class="mx-2.5 mt-2 flex items-center gap-[11px] border-t border-white/10 px-1 pt-3">
        <app-avatar [initials]="user().iniciales" [name]="user().nombre" tone="secondary" [size]="32" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-[12.5px] font-bold text-white">{{ user().nombre }}</div>
          <div class="truncate text-[10.5px] text-white/55">{{ user().rol }} · {{ tenant() }}</div>
        </div>
      </div>
    </nav>
  `,
  styles: `
    :host { position: fixed; z-index: 50; top: calc(var(--topbar-h) - 2px); left: 12px; width: 272px;
      max-height: calc(100dvh - var(--topbar-h) - 8px); display: flex; flex-direction: column;
      visibility: hidden; opacity: 0; transform: translateY(-6px) scale(0.98); transform-origin: 20px 0;
      transition: opacity 140ms var(--ease-exit), transform 180ms var(--ease-exit), visibility 0s linear 180ms; }
    :host(.is-open) { visibility: visible; opacity: 1; transform: none;
      transition: opacity var(--dur-fast) var(--ease-standard), transform var(--spring-snappy-dur) var(--spring-snappy), visibility 0s; }
    @media (max-width: 639px) { :host { left: 8px; width: min(300px, calc(100vw - 16px)); } }
    @media (prefers-reduced-motion: reduce) { :host, :host(.is-open) { transform: none; } }
    .side { box-shadow: var(--shadow-e3), 0 0 0 1px rgba(255, 255, 255, 0.04) inset; }
    .list { scrollbar-width: none; }
    .indicator { top: 0; background: rgba(197, 135, 60, 0.17); box-shadow: inset 0 0 0 1px rgba(224, 169, 97, 0.12); }
    .indicator.is-ready { transition: transform var(--spring-standard-dur) var(--spring-standard),
      height var(--dur-base) var(--ease-standard), opacity var(--dur-fast); }
    .nav-item { transition: background-color var(--dur-fast) var(--ease-standard); }
    .nav-item .nav-icon, .nav-item .nav-label { transition: color var(--dur-fast) var(--ease-standard); }
    .nav-item.is-active .nav-icon { color: var(--color-secondary-light); }
    .nav-item.is-active .nav-label { color: #fff; font-weight: 700; }
    .nav-item:not(.is-active):hover, .nav-item:focus-visible { background: rgba(255, 255, 255, 0.06); }
    .nav-item:not(.is-active):hover .nav-icon, .nav-item:not(.is-active):hover .nav-label { color: rgba(255,255,255,.9); }
  `,
})
export class SidebarComponent {
  readonly sections = input.required<readonly SidebarSection[]>();
  readonly user = input.required<SidebarUser>();
  readonly tenant = input<string>('');
  readonly open = input<boolean>(false);

  readonly navigate = output<void>();
  /** El cursor entra (true) o sale (false) del panel: el layout cierra el vistazo. */
  readonly hover = output<boolean>();

  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  protected readonly indicator = signal({ y: 0, h: 0, visible: false });
  protected readonly indicatorReady = signal(false);

  constructor() {
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.measure());
    afterNextRender(() => {
      this.measure();
      setTimeout(() => this.indicatorReady.set(true), 60);
    });
    effect(() => {
      this.open();
      this.sections();
      setTimeout(() => this.measure(), 0);
    });
  }

  private measure(): void {
    requestAnimationFrame(() => {
      const active = this.list().nativeElement.querySelector<HTMLElement>('.nav-item.is-active');
      this.indicator.set(
        active ? { y: active.offsetTop, h: active.offsetHeight, visible: true } : { ...this.indicator(), visible: false },
      );
    });
  }
}
