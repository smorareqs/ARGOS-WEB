import { Routes } from '@angular/router';

/**
 * Rutas de Propiedades: la lista con sus subpantallas por `?seccion=`
 * (W-C1 propiedades, W-C3 edificios, W-C4 checklists) y la ficha (W-C2) en
 * `/propiedades/CODIGO`.
 */
export const PROPERTIES_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Propiedades' },
    loadComponent: () =>
      import('./pages/properties-list/properties-list.component').then((m) => m.PropertiesListComponent),
  },
  {
    path: ':code',
    data: { title: 'Ficha de propiedad' },
    loadComponent: () => import('./pages/property-page/property-page.component').then((m) => m.PropertyPageComponent),
  },
];
