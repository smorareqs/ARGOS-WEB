import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { HttpMaintenanceApi, MaintenanceApi } from './services/maintenance-api.service';
import { MockMaintenanceApi } from './services/maintenance-api.mock';

/** Rutas de Mantenimiento (W-G1–W-G5: pestañas por query param). */
export const MAINTENANCE_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Mantenimiento' },
    providers: [{ provide: MaintenanceApi, useFactory: () => (inject(MOCK_MODULES).maintenance ? new MockMaintenanceApi() : new HttpMaintenanceApi()) }],
    loadComponent: () => import('./pages/maintenance/maintenance.component').then((m) => m.MaintenanceComponent),
  },
];
