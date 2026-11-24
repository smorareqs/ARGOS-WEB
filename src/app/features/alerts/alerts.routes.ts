import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { AlertsApi, HttpAlertsApi } from './services/alerts-api.service';
import { MockAlertsApi } from './services/alerts-api.mock';

/** Rutas de Alertas (W-L1). */
export const ALERTS_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Alertas' },
    providers: [{ provide: AlertsApi, useFactory: () => (inject(MOCK_MODULES).alerts ? new MockAlertsApi() : new HttpAlertsApi()) }],
    loadComponent: () => import('./pages/alerts/alerts.component').then((m) => m.AlertsComponent),
  },
];
