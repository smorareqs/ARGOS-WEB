import { Routes } from '@angular/router';
import { DashboardStore } from './store/dashboard.store';

/**
 * Rutas internas del dominio de dashboard. La tienda se provee aquí para
 * compartir el ciclo de vida de la sección: se destruye al salir (§4).
 */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    providers: [DashboardStore],
    loadComponent: () =>
      import('./pages/inicio/inicio.component').then((m) => m.InicioComponent),
  },
];
