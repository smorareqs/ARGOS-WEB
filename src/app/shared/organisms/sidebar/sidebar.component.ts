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
import { LogoComponent } from '../../atoms/logo/logo.component';
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
 * Organismo · navegación lateral (260 px, colapsable a 76 px, ux-ui.md §2.5).
 * Presentacional: recibe secciones ya filtradas por permisos.
 *
 * El indicador activo es una sola píldora que se desliza con resorte entre
 * elementos al navegar (en lugar de saltar), y el punto dorado del logo mira
 * hacia el cursor.
 */
@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, LogoComponent, IconComponent, AvatarComponent],
  host: {
    class: 'sidebar-host',
    '[class.is-collapsed]': 'collapsed()',
    '[class.is-mobile-open]': 'mobileOpen()',
  },
  template: `
    <nav
      class="side flex h-full flex-col bg-primary pb-4 pt-5 font-sans"
      aria-label="Navegación principal"
    >
      <div class="flex h-9 items-center justify-between px-[22px]" [class.!px-0]="collapsed()" [class.justify-center]="collapsed()">
        <a routerLink="/inicio" aria-label="ARGOS · Inicio" class="rounded-sm">
          <app-logo [size]="20" tone="light" [wordmark]="!collapsed()" />
        </a>
        @if (!collapsed()) {
          <button
            type="button"
            class="collapse-btn hidden h-8 w-8 items-center justify-center rounded-sm text-white/55 hover:bg-white/[0.06] hover:text-white lg:flex"
            aria-label="Contraer menú"
            title="Contraer menú"
            (click)="toggleCollapse.emit()"
          >
            <app-icon name="sidebar" [size]="18" />
          </button>
        }
      </div>

      <div #list class="list relative mt-6 flex-1 overflow-y-auto overflow-x-hidden px-3.5" [class.!px-3]="collapsed()">
        <span
          class="indicator pointer-events-none absolute left-3.5 right-3.5 rounded-[11px]"
          [class.!left-3]="collapsed()"
          [class.!right-3]="collapsed()"
          [class.is-ready]="indicatorReady()"
          [style.opacity]="indicator().visible ? 1 : 0"
          [style.height.px]="indicator().h"
          [style.transform]="'translateY(' + indicator().y + 'px)'"
          aria-hidden="true"
        ></span>

        @for (section of sections(); track $index; let firstSection = $first) {
          @if (section.label && !collapsed()) {
            <div class="px-3.5 pb-1.5 pt-5 text-[10px] uppercase tracking-[1.4px] text-white/40" [class.!pt-1]="firstSection">
              {{ section.label }}
            </div>
          } @else if (!firstSection) {
            <div class="mx-3 my-3 h-px bg-white/10"></div>
          }
          @for (item of section.items; track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="is-active"
              [routerLinkActiveOptions]="{ exact: false }"
              class="nav-item group relative z-[1] flex items-center gap-3 rounded-[11px] px-3.5 py-[10px]"
              [class.justify-center]="collapsed()"
              [class.!px-0]="collapsed()"
              [attr.title]="collapsed() ? item.label : null"
              (click)="navigate.emit()"
            >
              <app-icon [name]="item.icon" [size]="19" class="nav-icon text-white/55" />
              @if (!collapsed()) {
                <span class="nav-label truncate text-[13px] text-white/70">{{ item.label }}</span>
                @if (item.badge) {
                  <span class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-pill bg-danger px-1.5 text-[11px] font-bold text-white">{{ item.badge }}</span>
                } @else if (item.soon) {
                  <span class="ml-auto rounded-xs border border-white/15 px-2 py-px text-[9.5px] uppercase tracking-[0.8px] text-white/45">Pronto</span>
                }
              } @else if (item.badge) {
                <span class="absolute right-2.5 top-2 h-2 w-2 rounded-pill bg-danger ring-2 ring-primary"></span>
              }
            </a>
          }
        }
      </div>

      <div class="mx-3.5 mt-3 flex items-center gap-[11px] border-t border-white/10 pt-4" [class.justify-center]="collapsed()">
        <app-avatar [initials]="user().iniciales" [name]="user().nombre" tone="secondary" [size]="36" />
        @if (!collapsed()) {
          <div class="min-w-0 flex-1">
            <div class="truncate text-[12.5px] font-bold text-white">{{ user().nombre }}</div>
            <div class="truncate text-[10.5px] text-white/55">{{ user().rol }} · {{ tenant() }}</div>
          </div>
        }
      </div>
      @if (collapsed()) {
        <button
          type="button"
          class="mx-auto mt-3 hidden h-8 w-8 items-center justify-center rounded-sm text-white/55 hover:bg-white/[0.06] hover:text-white lg:flex"
          aria-label="Expandir menú"
          title="Expandir menú"
          (click)="toggleCollapse.emit()"
        >
          <app-icon name="chevron-right" [size]="18" />
        </button>
      }
    </nav>
  `,
  styles: `
    :host { display: block; }
    .list { scrollbar-width: none; }
    .indicator { top: 0; background: rgba(197, 135, 60, 0.17); box-shadow: inset 0 0 0 1px rgba(224, 169, 97, 0.12); }
    .indicator.is-ready { transition: transform var(--spring-standard-dur) var(--spring-standard),
      height var(--dur-base) var(--ease-standard), opacity var(--dur-fast); }
    .nav-item { transition: background-color var(--dur-fast) var(--ease-standard); }
    .nav-item .nav-icon, .nav-item .nav-label { transition: color var(--dur-fast) var(--ease-standard); }
    .nav-item.is-active .nav-icon { color: var(--color-secondary-light); }
    .nav-item.is-active .nav-label { color: #fff; font-weight: 700; }
    .nav-item:not(.is-active):hover { background: rgba(255, 255, 255, 0.05); }
    .nav-item:not(.is-active):hover .nav-icon, .nav-item:not(.is-active):hover .nav-label { color: rgba(255,255,255,.9); }
  `,
})
export class SidebarComponent {
  readonly sections = input.required<readonly SidebarSection[]>();
  readonly user = input.required<SidebarUser>();
  readonly tenant = input<string>('');
  readonly collapsed = input<boolean>(false);
  readonly mobileOpen = input<boolean>(false);

  readonly toggleCollapse = output<void>();
  readonly navigate = output<void>();

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
      this.collapsed();
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
