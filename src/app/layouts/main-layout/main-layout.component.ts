import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../shared/organisms/sidebar/sidebar.component';
import { TopbarComponent } from '../../shared/organisms/topbar/topbar.component';
import { SessionStore } from '../../core/store/session.store';
import { ADMIN_NAV } from './navigation';

/**
 * Layout principal de la web administradora: sidebar + topbar + área de
 * contenido (router-outlet). Vive en `layouts/` (infraestructura visual),
 * desacoplado de los componentes compartidos y la lógica de negocio (§2).
 *
 * Consume sólo el estado de sesión global (usuario activo) — permitido en
 * un layout. La fecha del topbar es de presentación pura.
 */
@Component({
  selector: 'app-main-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-background font-sans">
      <app-sidebar [items]="nav" [user]="sidebarUser()" />

      <div class="flex min-w-0 flex-1 flex-col">
        <app-topbar
          title="Inicio"
          [subtitle]="today()"
          [userInitials]="user().iniciales"
          [hasAlerts]="true"
        />
        <main class="flex-1 overflow-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class MainLayoutComponent {
  private readonly session = inject(SessionStore);
  protected readonly nav = ADMIN_NAV;

  /** Usuario de sesión con respaldo mock para visualizar el layout sin login. */
  protected readonly user = computed(
    () =>
      this.session.user() ?? {
        nombre: 'Carlos Ruiz',
        iniciales: 'CR',
        rol: 'Administrador',
        tenant: 'Costa Limpia S.A.',
      },
  );

  protected readonly sidebarUser = computed(() => {
    const u = this.user();
    return { nombre: u.nombre, iniciales: u.iniciales, rol: u.rol };
  });

  protected readonly today = computed(() =>
    new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
      .format(new Date())
      .replace(/^\w/, (c) => c.toUpperCase()),
  );
}
