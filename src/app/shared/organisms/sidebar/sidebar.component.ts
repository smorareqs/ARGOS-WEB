import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LogoComponent } from '../../atoms/logo/logo.component';
import { IconComponent, IconName } from '../../atoms/icon/icon.component';
import { AvatarComponent } from '../../atoms/avatar/avatar.component';

export interface SidebarItem {
  readonly label: string;
  readonly icon: IconName;
  readonly route: string;
  /** Contador opcional (ej. mantenimiento · 3). */
  readonly badge?: number;
}

export interface SidebarUser {
  readonly nombre: string;
  readonly iniciales: string;
  readonly rol: string;
}

/**
 * Organismo · navegación lateral ARGOS (236px, teal profundo).
 * Presentacional: recibe items y usuario por @Input(); no inyecta stores.
 * Ref: ArgosSidebar.dc.html.
 */
@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, LogoComponent, IconComponent, AvatarComponent],
  template: `
    <nav
      class="flex h-full w-[236px] shrink-0 flex-col bg-primary py-[22px] font-sans"
    >
      <div class="px-[22px] pb-6">
        <app-logo [size]="21" tone="light" />
      </div>

      <div class="flex flex-col gap-0.5 px-3.5">
        @for (item of items(); track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: item.route === '/inicio' }"
            class="nav-item group flex items-center gap-3 rounded-[11px] px-3.5 py-[11px]"
          >
            <app-icon
              [name]="item.icon"
              [size]="18"
              class="nav-icon text-white/55"
            />
            <span class="nav-label text-[13px] text-white/65">{{ item.label }}</span>
            @if (item.badge) {
              <span
                class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-pill bg-danger px-1.5 text-[11px] font-bold text-white"
                >{{ item.badge }}</span
              >
            }
          </a>
        }
      </div>

      <div
        class="mx-3.5 mt-auto flex items-center gap-[11px] border-t border-white/10 pt-4"
      >
        <app-avatar [initials]="user().iniciales" tone="secondary" [size]="36" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-[12.5px] font-bold text-white">{{ user().nombre }}</div>
          <div class="text-[10.5px] text-white/50">{{ user().rol }}</div>
        </div>
      </div>
    </nav>
  `,
  styles: `
    :host { display: flex; align-self: stretch; }
    .nav-item.is-active { background: rgba(197, 135, 60, 0.16); }
    .nav-item.is-active .nav-icon { color: var(--color-secondary); }
    .nav-item.is-active .nav-label { color: #fff; font-weight: 700; }
    .nav-item:not(.is-active):hover { background: rgba(255, 255, 255, 0.05); }
  `,
})
export class SidebarComponent {
  readonly items = input.required<readonly SidebarItem[]>();
  readonly user = input.required<SidebarUser>();
}
