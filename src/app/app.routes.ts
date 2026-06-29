import { Routes } from '@angular/router';

/**
 * Fronteras de enrutamiento raíz (ARCHITECTURE.md §4).
 * Sólo despacha de alto nivel con `loadChildren` / lazy `loadComponent`:
 * ningún componente de feature se carga directamente aquí. Los layouts
 * envuelven a sus features mediante rutas hijas, también diferidas.
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      {
        path: '',
        loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
      },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'inicio',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
