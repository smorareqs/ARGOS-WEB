import { Routes } from '@angular/router';

export const COMING_SOON_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
  },
];
