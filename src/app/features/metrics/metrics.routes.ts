import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { HttpMetricsApi, MetricsApi } from './services/metrics-api.service';
import { MockMetricsApi } from './services/metrics-api.mock';

/** Rutas de Métricas (W-K1, W-K2). */
export const METRICS_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Métricas' },
    providers: [{ provide: MetricsApi, useFactory: () => (inject(MOCK_MODULES).metrics ? new MockMetricsApi() : new HttpMetricsApi()) }],
    loadComponent: () => import('./pages/metrics/metrics.component').then((m) => m.MetricsComponent),
  },
];
