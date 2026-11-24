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

/** Pantallas de acceso: con sesión abierta se salta a su inicio. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  return session.isAuthenticated() ? inject(Router).createUrlTree([session.home()]) : true;
};

/** Secciones de una empresa: en modo plataforma se va a la consola de ARGOS. */
export const tenantGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  return session.isPlatform() ? inject(Router).createUrlTree(['/plataforma']) : true;
};

/** Consola de ARGOS: solo en modo plataforma (fase01.md §5 `platformAdminGuard`). */
export const platformGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  if (session.isPlatform()) return true;
  if (session.isPlatformAdmin()) {
    inject(ToastService).show('Entra a la administración de ARGOS desde el selector de empresa.');
  }
  return inject(Router).createUrlTree(['/inicio']);
};

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

/** Basta con uno de los permisos (secciones con varias subpantallas, como RRHH). */
export function anyPermissionGuard(...perms: Permission[]): CanActivateFn {
  return () => {
    if (inject(SessionStore).canAny(perms)) return true;
    inject(ToastService).show('No tienes acceso a esa sección.');
    return inject(Router).createUrlTree(['/inicio']);
  };
}
