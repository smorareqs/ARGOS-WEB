import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from '../../shared/organisms/sidebar/sidebar.component';
import { TopbarComponent } from '../../shared/organisms/topbar/topbar.component';
import { SessionStore } from '../../core/store/session.store';
import { ToastService } from '../../core/services/toast.service';
import { buildNav } from './navigation';

const COLLAPSE_KEY = 'argos.sidebar_collapsed';

/**
 * Layout principal: sidebar + topbar + contenido (máx. 1280 px centrado).
 * - Sidebar construido desde permisos y banderas (fase01.md §5).
 * - < 768 px: sidebar como panel deslizable con menú hamburguesa.
 *   768–1023 px: contraído a iconos. ≥ 1024 px: lo elige el usuario.
 * - El documento hace scroll (no un contenedor interno) para que la topbar
 *   translúcida deje ver el contenido y el título se condense al bajar.
 * - Al cambiar de empresa se recrea la página activa: sus tiendas viven con
 *   el componente, así que recargan los datos del nuevo tenant.
 */
@Component({
  selector: 'app-main-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <a href="#contenido" class="skip">Saltar al contenido</a>
    <div class="min-h-dvh bg-background font-sans md:flex">
      <app-sidebar
        class="side-slot"
        [class.is-collapsed]="collapsed()"
        [class.is-open]="mobileOpen()"
        [sections]="nav()"
        [user]="sidebarUser()"
        [tenant]="tenantName()"
        [collapsed]="collapsed()"
        (toggleCollapse)="toggleCollapse()"
        (navigate)="mobileOpen.set(false)"
      />
      @if (mobileOpen()) {
        <div class="scrim fixed inset-0 z-40 md:hidden" (click)="mobileOpen.set(false)" animate.enter="fade-in" animate.leave="fade-out"></div>
      }

      <div class="min-w-0 flex-1">
        <app-topbar
          [title]="title()"
          [scrolled]="scrolled()"
          [user]="topbarUser()"
          [tenantName]="tenantName()"
          [tenants]="tenants()"
          [hasAlerts]="true"
          (menu)="mobileOpen.set(true)"
          (switchTenant)="switchTenant($event)"
          (signOut)="signOut()"
          (notifications)="soon('Las notificaciones llegan en la fase 3.')"
          (profile)="soon('El perfil y las sesiones se completan con el backend de fase 1.')"
          (sessions)="soon('El perfil y las sesiones se completan con el backend de fase 1.')"
        />
        <main id="contenido" tabindex="-1" class="mx-auto w-full max-w-[1280px] px-4 pb-20 pt-6 outline-none sm:px-6 lg:px-8 lg:pt-8">
          @for (view of [outletView()]; track view.key) {
            <router-outlet />
          }
        </main>
      </div>
    </div>
  `,
  styles: `
    .skip { position: absolute; left: 12px; top: -48px; z-index: 80; padding: 10px 14px; border-radius: 10px;
      background: var(--color-primary); color: #fff; font-size: 13px; font-weight: 700; transition: top var(--dur-fast); }
    .skip:focus { top: 12px; }
    .scrim { background: var(--overlay); }
    .fade-in { animation: argos-fade var(--dur-base) both; }
    .fade-out { animation: argos-fade 180ms reverse both; }
    .side-slot { position: fixed; inset: 0 auto 0 0; z-index: 50; width: 280px; transform: translateX(-102%);
      transition: transform var(--spring-standard-dur) var(--spring-standard); }
    .side-slot.is-open { transform: none; box-shadow: var(--shadow-e3); }
    @media (min-width: 768px) {
      .side-slot { position: sticky; top: 0; height: 100dvh; flex-shrink: 0; transform: none; box-shadow: none;
        width: var(--sidebar-w-collapsed); transition: width var(--spring-standard-dur) var(--spring-standard); }
    }
    @media (min-width: 1024px) {
      .side-slot { width: var(--sidebar-w); }
      .side-slot.is-collapsed { width: var(--sidebar-w-collapsed); }
    }
  `,
  host: { '(window:scroll)': 'onScroll()' },
})
export class MainLayoutComponent {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly mobileOpen = signal(false);
  protected readonly scrolled = signal(false);
  protected readonly title = signal('');
  private readonly userCollapsed = signal(readCollapsed());
  private readonly bp = signal<'mobile' | 'mid' | 'desktop'>(breakpoint());

  /** Entre 768 y 1023 px va contraído; en móvil, siempre expandido. */
  protected readonly collapsed = computed(
    () => this.bp() === 'mid' || (this.bp() === 'desktop' && this.userCollapsed()),
  );

  protected readonly nav = computed(() => {
    this.session.permissions();
    return buildNav(
      (p) => this.session.can(p),
      (f) => this.session.hasFeature(f),
    );
  });

  private readonly user = computed(() => this.session.user()!);
  protected readonly tenantName = computed(() => this.session.tenant()?.name ?? '');
  /** Clave del outlet: al cambiar de empresa se recrea la página activa. */
  protected readonly outletView = computed(() => ({ key: this.session.tenant()?.id ?? 'none' }));
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
    const onResize = () => this.bp.set(breakpoint());
    window.addEventListener('resize', onResize, { passive: true });
    inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', onResize));

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.updateTitle();
        this.mobileOpen.set(false);
      });
  }

  protected onScroll(): void {
    const s = window.scrollY > 64;
    if (s !== this.scrolled()) this.scrolled.set(s);
  }

  protected toggleCollapse(): void {
    const next = !this.userCollapsed();
    this.userCollapsed.set(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
    } catch {
      /* preferencia solo de esta sesión */
    }
  }

  protected async switchTenant(id: string): Promise<void> {
    if (id === this.session.tenant()?.id) return;
    try {
      await this.session.switchTenant(id);
      this.toast.success(`Ahora estás en ${this.tenantName()}.`);
      await this.router.navigateByUrl('/inicio');
    } catch {
      this.toast.error('No se pudo cambiar de empresa. Intenta de nuevo.');
    }
  }

  protected async signOut(): Promise<void> {
    await this.session.signOut();
    await this.router.navigateByUrl('/login');
    this.toast.show('Cerraste sesión en este equipo.');
  }

  protected soon(message: string): void {
    this.toast.show(message);
  }

  private updateTitle(): void {
    let r = this.router.routerState.snapshot.root;
    while (r.firstChild) r = r.firstChild;
    const t = (r.data?.['title'] as string | undefined) ?? '';
    this.title.set(t);
    document.title = t ? `${t} · ARGOS` : 'ARGOS';
  }
}

function breakpoint(): 'mobile' | 'mid' | 'desktop' {
  const w = window.innerWidth;
  return w < 768 ? 'mobile' : w < 1024 ? 'mid' : 'desktop';
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}
