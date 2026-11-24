import { Routes } from '@angular/router';
import { hrProviders } from './hr.providers';

/** Rutas de RRHH (W-J1–W-J5: pestañas por query param). */
export const HR_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'RRHH' },
    providers: hrProviders(),
    loadComponent: () => import('./pages/hr/hr.component').then((m) => m.HrComponent),
  },
];
