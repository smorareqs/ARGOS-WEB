import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { HttpSharedAreasApi, SharedAreasApi } from './services/shared-areas-api.service';
import { MockSharedAreasApi } from './services/shared-areas-api.mock';

/** Rutas de Áreas comunes (W-I2). */
export const SHARED_AREAS_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Áreas comunes' },
    providers: [{ provide: SharedAreasApi, useFactory: () => (inject(MOCK_MODULES).sharedAreas ? new MockSharedAreasApi() : new HttpSharedAreasApi()) }],
    loadComponent: () => import('./pages/shared-areas/shared-areas.component').then((m) => m.SharedAreasComponent),
  },
];
