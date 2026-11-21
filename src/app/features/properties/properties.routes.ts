import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { HttpPropertiesApi, PropertiesApi } from './services/properties-api.service';
import { MockPropertiesApi } from './services/properties-api.mock';

/** Rutas de Propiedades (W-C1; la ficha W-C2 se agrega aquí como `:code`). */
export const PROPERTIES_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Propiedades' },
    providers: [
      {
        provide: PropertiesApi,
        useFactory: () => (inject(MOCK_MODULES).properties ? new MockPropertiesApi() : new HttpPropertiesApi()),
      },
    ],
    loadComponent: () =>
      import('./pages/properties-list/properties-list.component').then((m) => m.PropertiesListComponent),
  },
];
