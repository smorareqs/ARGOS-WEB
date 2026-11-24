import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../../../shared/atoms/logo/logo.component';
import { BrandPanelComponent } from '../brand-panel/brand-panel.component';

/**
 * Componente · marco de las pantallas de acceso que llegan por enlace de correo
 * (restablecer contraseña, aceptar invitación): el mismo panel partido del
 * login, formulario a la izquierda y fotos de propiedades a la derecha.
 */
@Component({
  selector: 'app-auth-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LogoComponent, BrandPanelComponent],
  template: `
    <div class="flex min-h-dvh w-full bg-surface">
      <div class="relative flex min-w-0 flex-1 flex-col px-6 py-6 sm:px-10">
        <div class="flex items-center justify-between gap-4 text-[12.5px]">
          <a routerLink="/" class="rounded-sm text-primary" aria-label="ARGOS · volver al sitio">
            <app-logo [size]="18" />
          </a>
          <a routerLink="/login" class="font-bold text-primary underline decoration-border-field underline-offset-4 hover:decoration-primary">
            Iniciar sesión
          </a>
        </div>
        <div class="flex flex-1 items-center justify-center py-10">
          <div class="w-full max-w-[400px]"><ng-content /></div>
        </div>
      </div>
      <app-brand-panel class="hidden p-3 md:sticky md:top-0 md:block md:h-dvh md:w-[52%] md:shrink-0 lg:w-[56%]" />
    </div>
  `,
  styles: `:host { display: contents; }`,
})
export class AuthShellComponent {}
