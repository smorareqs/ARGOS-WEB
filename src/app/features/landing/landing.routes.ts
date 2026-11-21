import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { DemoApi, HttpDemoApi } from './services/demo-api.service';
import { MockDemoApi } from './services/demo-api.mock';

/** Sitio público (antes del login). */
export const LANDING_ROUTES: Routes = [
  {
    path: '',
    title: 'ARGOS · Operación de alquileres de corto plazo',
    providers: [
      { provide: DemoApi, useFactory: () => (inject(MOCK_MODULES).demoRequests ? new MockDemoApi() : new HttpDemoApi()) },
    ],
    loadComponent: () => import('./pages/landing/landing.component').then((m) => m.LandingComponent),
  },
];
