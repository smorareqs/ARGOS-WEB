import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Layout de autenticación: lienzo limpio a pantalla completa para login /
 * registro. La pantalla hija aporta el panel partido (marca + formulario).
 */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <!-- A sangre completa (full-bleed) en todos los tamaños. -->
    <div class="flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden bg-canvas font-sans">
      <router-outlet />
    </div>
  `,
})
export class AuthLayoutComponent {}
