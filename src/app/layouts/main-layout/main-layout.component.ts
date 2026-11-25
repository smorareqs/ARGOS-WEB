import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from '../../shared/organisms/sidebar/sidebar.component';
import { PLATFORM_KEY, TopbarComponent } from '../../shared/organisms/topbar/topbar.component';
import { NotificationTrayComponent } from '../../shared/organisms/notification-tray/notification-tray.component';
import { NotificationsStore } from '../../core/store/notifications.store';
import { PLATFORM_NAME, SessionStore } from '../../core/store/session.store';
import { ToastService } from '../../core/services/toast.service';
import { buildNav } from './navigation';
import { BillingBannerComponent } from '../../shared/molecules/billing-banner/billing-banner.component';
import { NavBarComponent } from '../../shared/organisms/nav-bar/nav-bar.component';

/** closed · peek (abierto por pasar el cursor) · open (abierto con clic). */
type NavMode = 'closed' | 'peek' | 'open';

/**
 * Layout principal: topbar a todo el ancho + contenido al 100 % del ancho.
 * - La navegación (construida desde permisos y banderas, fase01.md §5) es un
 *   panel flotante que sale del botón de menú de la topbar. En escritorio se
 *   asoma al pasar el cursor por el botón y se queda abierto con un clic; se
 *   cierra al navegar, con Escape o al hacer clic fuera. En móvil, con velo.
 * - El documento hace scroll (no un contenedor interno) para que la topbar
 *   translúcida deje ver el contenido y el título se condense al bajar.
 * - Al cambiar de empresa se recrea la página activa: sus tiendas viven con
 *   el componente, así que recargan los datos del nuevo tenant.
 */
@Component({
  selector: 'app-main-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, NotificationTrayComponent, BillingBannerComponent, NavBarComponent],
  template: `
    <a href="#contenido" class="skip">Saltar al contenido</a>
    <div class="min-h-dvh bg-background font-sans">
      <app-topbar
        [title]="title()"
        [scrolled]="scrolled()"
        [user]="topbarUser()"
        [tenantName]="tenantName()"
        [tenants]="tenants()"
        [hasAlerts]="!platformMode() && notifications.hasUnread()"
        [platformAdmin]="platformAdmin()"
        [platformMode]="platformMode()"
        [menuOpen]="navOpen()"
        (menu)="toggleNav($event)"
        (menuHover)="hoverNav($event)"
        (switchTenant)="switchTenant($event)"
        (signOut)="signOut()"
        (notifications)="toggleTray()"
        (profile)="router.navigateByUrl('/perfil')"
        (sessions)="router.navigateByUrl('/perfil?tab=sesiones')"
      />
      <app-nav-bar [sections]="nav()" [compact]="scrolled()" />
      @if (navMode() === 'open') {
        <div class="scrim fixed inset-0 z-40 md:hidden" (click)="closeNav()" animate.enter="fade-in" animate.leave="fade-out"></div>
      }
      <app-sidebar
        [sections]="nav()"
        [user]="sidebarUser()"
        [tenant]="tenantName()"
        [open]="navOpen()"
        (hover)="hoverNav($event)"
        (navigate)="closeNav()"
      />
      <app-notification-tray [(open)]="trayOpen" />
      <main id="contenido" tabindex="-1" class="w-full px-4 pb-20 pt-6 outline-none sm:px-6 lg:px-8 lg:pt-8">
        <app-billing-banner />
        @for (view of [outletView()]; track view.key) {
          <router-outlet />
        }
      </main>
    </div>
  `,
  styles: `
    .skip { position: absolute; left: 12px; top: -48px; z-index: 80; padding: 10px 14px; border-radius: 10px;
      background: var(--color-primary); color: #fff; font-size: 13px; font-weight: 700; transition: top var(--dur-fast); }
    .skip:focus { top: 12px; }
    .scrim { background: var(--overlay); }
    .fade-in { animation: argos-fade var(--dur-base) both; }
    .fade-out { animation: argos-fade 180ms reverse both; }
  `,
  host: {
    '(window:scroll)': 'onScroll()',
    '(document:pointerdown)': 'outside($event)',
    '(document:keydown.escape)': 'escape()',
  },
})
export class MainLayoutComponent {
  private readonly session = inject(SessionStore);
  protected readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly notifications = inject(NotificationsStore);
  protected readonly trayOpen = signal(false);

  protected readonly navMode = signal<NavMode>('closed');
  protected readonly navOpen = computed(() => this.navMode() !== 'closed');
  protected readonly scrolled = signal(false);
  protected readonly title = signal('');
  /** Solo con ratón: en táctil el menú se abre únicamente con toque. */
  private readonly canHover = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly nav = computed(() => {
    this.session.permissions();
    return buildNav(
      (p) => this.session.can(p),
      (f) => this.session.hasFeature(f),
      this.session.isPlatform(),
    );
  });

  private readonly user = computed(() => this.session.user()!);
  protected readonly platformMode = this.session.isPlatform;
  protected readonly platformAdmin = this.session.isPlatformAdmin;
  protected readonly tenantName = computed(() => this.session.tenant()?.name ?? PLATFORM_NAME);
  /** Clave del outlet: al cambiar de empresa se recrea la página activa. */
  protected readonly outletView = computed(() => ({ key: this.session.tenant()?.id ?? 'platform' }));
  protected readonly sidebarUser = computed(() => {
    const u = this.user();
    return { nombre: u.nombre, iniciales: u.iniciales, rol: u.rol };
  });
  protected readonly topbarUser = computed(() => {
    const u = this.user();
    return { nombre: u.nombre, email: u.email, iniciales: u.iniciales, rol: u.rol };
  });
  protected readonly tenants = computed(() =>
    this.session.memberships().map((m) => ({ id: m.tenant_id, name: m.tenant_name, role: m.role_name, logo: m.tenant_logo_url })),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.hoverTimer));

    // Campana: sondeo de la bandeja mientras no haya WebSocket; al cambiar de
    // empresa se vuelve a leer.
    this.notifications.start(inject(DestroyRef));
    effect(() => {
      this.session.tenant();
      untracked(() => {
        this.trayOpen.set(false);
        void this.notifications.refresh();
      });
    });

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.updateTitle();
        this.closeNav();
      });
  }

  protected onScroll(): void {
    const s = window.scrollY > 64;
    if (s !== this.scrolled()) this.scrolled.set(s);
  }

  /** Clic en el botón: fija el panel abierto (o lo cierra si ya lo estaba). */
  protected toggleNav(ev: MouseEvent): void {
    clearTimeout(this.hoverTimer);
    if (this.navMode() === 'open') {
      this.closeNav();
      return;
    }
    this.navMode.set('open');
    // Abierto con teclado (Enter/Espacio): el foco pasa a la sección actual.
    if (ev.detail === 0) {
      setTimeout(() => document.querySelector<HTMLElement>('#argos-nav .nav-item.is-active, #argos-nav .nav-item')?.focus(), 60);
    }
  }

  /** Vistazo con el cursor (botón o panel): abre tras una pausa breve y cierra al salir. */
  protected hoverNav(inside: boolean): void {
    if (!this.canHover) return;
    clearTimeout(this.hoverTimer);
    if (inside && this.navMode() === 'closed') {
      this.hoverTimer = setTimeout(() => this.navMode.set('peek'), 140);
    } else if (!inside && this.navMode() === 'peek') {
      this.hoverTimer = setTimeout(() => this.navMode.set('closed'), 280);
    }
  }

  protected closeNav(): void {
    clearTimeout(this.hoverTimer);
    this.navMode.set('closed');
  }

  protected outside(ev: PointerEvent): void {
    if (this.navMode() !== 'open') return;
    const t = ev.target as Element | null;
    if (t?.closest('#argos-nav, #nav-toggle')) return;
    this.closeNav();
  }

  protected escape(): void {
    if (!this.navOpen()) return;
    const inside = document.activeElement?.closest('#argos-nav');
    this.closeNav();
    if (inside) document.getElementById('nav-toggle')?.focus();
  }

  protected async switchTenant(id: string): Promise<void> {
    const platform = id === PLATFORM_KEY;
    if (platform ? this.platformMode() : id === this.session.tenant()?.id) return;
    try {
      if (platform) await this.session.enterPlatform();
      else await this.session.switchTenant(id);
      this.toast.success(`Ahora estás en ${this.tenantName()}.`);
      await this.router.navigateByUrl(this.session.home());
    } catch {
      this.toast.error('No se pudo cambiar de empresa. Intenta de nuevo.');
    }
  }

  protected async signOut(): Promise<void> {
    await this.session.signOut();
    await this.router.navigateByUrl('/login');
    this.toast.show('Cerraste sesión en este equipo.');
  }

  protected toggleTray(): void {
    const next = !this.trayOpen();
    this.trayOpen.set(next);
    if (next) void this.notifications.refresh();
  }

  private updateTitle(): void {
    let r = this.router.routerState.snapshot.root;
    while (r.firstChild) r = r.firstChild;
    const t = (r.data?.['title'] as string | undefined) ?? '';
    this.title.set(t);
    document.title = t ? `${t} · ARGOS` : 'ARGOS';
  }
}
