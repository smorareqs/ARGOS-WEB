import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { HttpSettingsApi, SettingsApi } from './services/settings-api.service';
import { MockSettingsApi } from './services/settings-api.mock';
import { billingProviders } from '../billing/billing.providers';

/** Rutas de Configuración (W-O1, W-O3, W-O4; W-O2 vive en Colaboradores). */
export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Configuración' },
    providers: [
      { provide: SettingsApi, useFactory: () => (inject(MOCK_MODULES).settings ? new MockSettingsApi() : new HttpSettingsApi()) },
      ...billingProviders(),
    ],
    loadComponent: () => import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
  },
];
