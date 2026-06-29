import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardStore } from '../../store/dashboard.store';
import { InicioTemplateComponent } from '../../templates/inicio-template/inicio-template.component';

/**
 * Screen · Inicio (dashboard). Conecta el template con la tienda del dominio
 * y le pasa el estado real (Signals). Importa un Template y le inyecta datos.
 */
@Component({
  selector: 'app-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InicioTemplateComponent],
  template: `
    <app-inicio-template [data]="store.data()" [greeting]="store.greeting()" />
  `,
})
export class InicioComponent {
  protected readonly store = inject(DashboardStore);
}
