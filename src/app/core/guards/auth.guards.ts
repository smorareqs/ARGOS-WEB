import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Permission } from '../auth/permissions';
import { SessionStore } from '../store/session.store';
import { ToastService } from '../services/toast.service';

/** Exige sesión; si no, va a /login conservando el destino. */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  if (session.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/login'], {
    queryParams: state.url && state.url !== '/' ? { volver: state.url } : {},
  });
};

/** Pantallas de acceso: con sesión abierta se salta a Inicio. */
export const guestGuard: CanActivateFn = () =>
  inject(SessionStore).isAuthenticated() ? inject(Router).createUrlTree(['/inicio']) : true;

/**
 * Exige permisos (fase01.md §5 `permissionGuard`). Sin permiso: redirección a
 * Inicio con toast (ux-ui.md §3.1 "Sin permiso").
 */
export function permissionGuard(...perms: Permission[]): CanActivateFn {
  return () => {
    if (inject(SessionStore).can(perms)) return true;
    inject(ToastService).show('No tienes acceso a esa sección.');
    return inject(Router).createUrlTree(['/inicio']);
  };
}
