import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { DashboardApi, HttpDashboardApi } from './services/dashboard-api.service';
import { MockDashboardApi } from './services/dashboard-api.mock';

/**
 * Rutas del Inicio. El servicio API (sin estado) se provee a nivel de ruta
 * según MOCK_MODULES; la tienda vive en la pantalla.
 */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Inicio' },
    providers: [
      {
        provide: DashboardApi,
        useFactory: () => (inject(MOCK_MODULES).dashboard ? new MockDashboardApi() : new HttpDashboardApi()),
      },
    ],
    loadComponent: () => import('./pages/inicio/inicio.component').then((m) => m.InicioComponent),
  },
];
