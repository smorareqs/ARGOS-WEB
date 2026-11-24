import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../atoms/icon/icon.component';
import { LogoComponent } from '../../atoms/logo/logo.component';
import { AvatarComponent } from '../../atoms/avatar/avatar.component';
import { TenantMarkComponent } from '../../atoms/tenant-mark/tenant-mark.component';
import { SearchBarComponent } from '../../molecules/search-bar/search-bar.component';
import { MenuComponent } from '../../molecules/menu/menu.component';

/** Lo que emite switchTenant al elegir la administración de ARGOS. */
export const PLATFORM_KEY = '__platform__';

export interface TopbarTenant {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly logo: string | null;
}

export interface TopbarUser {
  readonly nombre: string;
  readonly email: string;
  readonly iniciales: string;
  readonly rol: string;
}

/**
 * Organismo · barra superior (64 px, ux-ui.md §4.2) a todo el ancho. Capa
 * funcional con material translúcido (ref. Apple): el contenido pasa por
 * debajo y se intuye. A la izquierda, el botón del menú flotante y el logo;
 * al hacer scroll aparece el título compacto de la página y un filete
 * inferior (cabecera extendida que se condensa, ref. One UI).
 */
@Component({
  selector: 'app-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, LogoComponent, AvatarComponent, TenantMarkComponent, SearchBarComponent, MenuComponent],
  template: `
    <header
      class="material-glass bar flex h-16 items-center gap-3 px-3 font-sans sm:px-5 lg:px-6"
      [class.is-scrolled]="scrolled()"
    >
      <button
        id="nav-toggle"
        type="button"
        class="nav-toggle press flex h-10 w-10 shrink-0 items-center justify-center rounded-field text-primary hover:bg-primary/[0.06]"
        [class.is-on]="menuOpen()"
        [attr.aria-label]="menuOpen() ? 'Cerrar menú' : 'Abrir menú'"
        [attr.aria-expanded]="menuOpen()"
        aria-controls="argos-nav"
        (click)="menu.emit($event)"
        (pointerenter)="menuHover.emit(true)"
        (pointerleave)="menuHover.emit(false)"
      >
        <app-icon [name]="menuOpen() ? 'x' : 'menu'" [size]="22" />
      </button>
      <a routerLink="/inicio" aria-label="ARGOS · Inicio" class="-ml-1 shrink-0 rounded-sm">
        <span class="hidden sm:block"><app-logo [size]="19" tone="dark" /></span>
        <span class="block sm:hidden"><app-logo [size]="19" tone="dark" [wordmark]="false" /></span>
      </a>

      <div class="compact-title flex min-w-0 items-center gap-3" [class.is-on]="scrolled()" [attr.aria-hidden]="!scrolled()">
        <span class="h-5 w-px shrink-0 bg-border-field"></span>
        <div class="truncate font-display text-[17px] font-semibold leading-tight text-primary">{{ title() }}</div>
      </div>

      <div class="ml-auto hidden w-full max-w-[360px] sm:block">
        <app-search-bar placeholder="Buscar propiedad, colaborador…" [shortcut]="true" />
      </div>

      <div class="ml-auto flex items-center gap-1.5 sm:ml-2">
        @if (tenants().length > 1 || platformAdmin()) {
          <app-menu [(open)]="tenantMenu">
            <button
              trigger
              type="button"
              class="press hidden h-10 items-center gap-2 rounded-field border border-border-field bg-surface/70 pl-1.5 pr-2.5 text-[12.5px] font-bold text-primary hover:bg-surface md:flex"
              aria-label="Cambiar de empresa"
            >
              <app-tenant-mark [name]="tenantName()" [logo]="currentLogo()" [size]="26" />
              <span class="max-w-[170px] truncate">{{ tenantName() }}</span>
              <app-icon name="chevron-up-down" [size]="16" class="text-text-muted" />
            </button>
            <div class="menu-label">Cambiar de empresa</div>
            @for (t of tenants(); track t.id) {
              <button type="button" class="menu-item" role="menuitem" (click)="switchTenant.emit(t.id)">
                <app-tenant-mark [name]="t.name" [logo]="t.logo" [size]="32" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-bold">{{ t.name }}</span>
                  <span class="block text-[11px] text-text-secondary">{{ t.role }}</span>
                </span>
                @if (!platformMode() && t.name === tenantName()) {
                  <app-icon name="check" [size]="16" class="text-secondary" />
                }
              </button>
            }
            @if (platformAdmin()) {
              <div class="menu-sep"></div>
              <button type="button" class="menu-item" role="menuitem" (click)="switchTenant.emit(platformKey)">
                <app-tenant-mark name="ARGOS" [logo]="argosMark" [size]="32" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-bold">Administración ARGOS</span>
                  <span class="block text-[11px] text-text-secondary">Empresas y bitácora de la plataforma</span>
                </span>
                @if (platformMode()) {
                  <app-icon name="check" [size]="16" class="text-secondary" />
                }
              </button>
            }
          </app-menu>
        }

        <button
          type="button"
          class="press relative flex h-10 w-10 items-center justify-center rounded-field text-text-body hover:bg-primary/[0.06] hover:text-primary"
          [attr.aria-label]="hasAlerts() ? 'Notificaciones, hay nuevas' : 'Notificaciones'"
          (click)="notifications.emit()"
        >
          <app-icon name="bell" [size]="21" />
          @if (hasAlerts()) {
            <span class="absolute right-[9px] top-[9px] flex h-2.5 w-2.5">
              <span class="pulse-ring h-2.5 w-2.5 rounded-pill text-danger"></span>
              <span class="absolute inset-0 rounded-pill border-2 border-surface bg-danger"></span>
            </span>
          }
        </button>

        <app-menu [(open)]="userMenu">
          <button trigger type="button" class="press ml-1 rounded-pill" aria-label="Menú de usuario">
            <app-avatar [initials]="user().iniciales" [name]="user().nombre" tone="primary" [size]="36" />
          </button>
          <div class="px-3 pb-2 pt-2.5">
            <div class="text-[13px] font-bold text-primary">{{ user().nombre }}</div>
            <div class="truncate text-[11.5px] text-text-secondary">{{ user().email }}</div>
            <div class="mt-1 text-[11px] text-secondary">{{ user().rol }} · {{ tenantName() }}</div>
          </div>
          <div class="menu-sep"></div>
          <button type="button" class="menu-item" role="menuitem" (click)="profile.emit()">
            <app-icon name="badge" [size]="17" class="text-text-secondary" /> Mi perfil
          </button>
          <button type="button" class="menu-item" role="menuitem" (click)="sessions.emit()">
            <app-icon name="shield" [size]="17" class="text-text-secondary" /> Sesiones activas
          </button>
          <div class="menu-sep"></div>
          <button type="button" class="menu-item is-danger" role="menuitem" (click)="signOut.emit()">
            <app-icon name="logout" [size]="17" /> Cerrar sesión
          </button>
        </app-menu>
      </div>
    </header>
  `,
  styles: `
    :host { display: block; position: sticky; top: 0; z-index: 30; }
    .bar { box-shadow: 0 1px 0 transparent; transition: box-shadow var(--dur-base) var(--ease-standard); }
    .bar.is-scrolled { box-shadow: 0 1px 0 rgba(0, 56, 65, 0.08); }
    .compact-title { opacity: 0; transform: translateY(6px); pointer-events: none;
      transition: opacity var(--dur-base) var(--ease-standard), transform var(--spring-standard-dur) var(--spring-standard); }
    .compact-title.is-on { opacity: 1; transform: none; }
    .nav-toggle.is-on { background: rgba(0, 56, 65, 0.08); }
  `,
})
export class TopbarComponent {
  readonly title = input<string>('');
  readonly scrolled = input<boolean>(false);
  readonly user = input.required<TopbarUser>();
  readonly tenantName = input<string>('');
  readonly tenants = input<readonly TopbarTenant[]>([]);
  readonly hasAlerts = input<boolean>(false);
  /** La persona puede entrar a la administración de ARGOS. */
  readonly platformAdmin = input<boolean>(false);
  /** La sesión está en la administración de ARGOS. */
  readonly platformMode = input<boolean>(false);
  /** Valor que emite switchTenant para entrar a la administración de ARGOS. */
  protected readonly platformKey = PLATFORM_KEY;
  protected readonly argosMark = '/brand/argos-mark.svg';
  protected readonly currentLogo = computed(() =>
    this.platformMode() ? this.argosMark : (this.tenants().find((t) => t.name === this.tenantName())?.logo ?? null),
  );

  /** El menú flotante está abierto (estado del botón). */
  readonly menuOpen = input<boolean>(false);

  /** Clic en el botón de menú; el evento dice si vino del teclado (detail 0). */
  readonly menu = output<MouseEvent>();
  /** El cursor entra o sale del botón de menú (vistazo en escritorio). */
  readonly menuHover = output<boolean>();
  readonly switchTenant = output<string>();
  readonly signOut = output<void>();
  readonly notifications = output<void>();
  readonly profile = output<void>();
  readonly sessions = output<void>();

  protected readonly tenantMenu = signal(false);
  protected readonly userMenu = signal(false);
}
