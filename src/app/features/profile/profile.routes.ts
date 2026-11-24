import { Routes } from '@angular/router';

/** Mi perfil (fase01.md §5: perfil y sesiones). Existe en ambos modos de sesión. */
export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Mi perfil' },
    loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
  },
];
