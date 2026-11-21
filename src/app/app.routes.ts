import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/guards/auth.guards';
import { SOON_SECTIONS } from './features/coming-soon/coming-soon.sections';

/**
 * Fronteras de enrutamiento raíz (ARCHITECTURE.md §4).
 * Sólo despacha de alto nivel con `loadChildren` / lazy `loadComponent`.
 * Cada sección exige su permiso (fase01.md §5 `permissionGuard`).
 */
export const routes: Routes = [
  {
    // Sitio público: presenta la plataforma y lleva al login o a "Solicitar demo".
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('./features/landing/landing.routes').then((m) => m.LANDING_ROUTES),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
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
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'inicio',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'propiedades',
        canActivate: [permissionGuard('properties.read')],
        loadChildren: () =>
          import('./features/properties/properties.routes').then((m) => m.PROPERTIES_ROUTES),
      },
      {
        path: 'colaboradores',
        canActivate: [permissionGuard('users.read')],
        loadChildren: () => import('./features/team/team.routes').then((m) => m.TEAM_ROUTES),
      },
      ...SOON_SECTIONS.map((s) => ({
        path: s.path,
        data: { title: s.title, section: s },
        loadChildren: () =>
          import('./features/coming-soon/coming-soon.routes').then((m) => m.COMING_SOON_ROUTES),
      })),
    ],
  },
  { path: '**', redirectTo: '' },
];
