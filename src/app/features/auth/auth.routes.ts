import { Routes } from '@angular/router';

/**
 * Rutas internas del dominio de autenticación.
 * Cada pantalla se carga con `loadComponent` (tree-shaking por página, §4).
 */
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    title: 'Iniciar sesión · ARGOS',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
];
