import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionStore } from '../store/session.store';

/**
 * Interceptor funcional único (ARCHITECTURE.md §7).
 * Inyecta el token de autorización (JWT) en cada petición saliente.
 * Aquí también vivirían el refresco de sesión y el formateo base de errores.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionStore);
  const token = session.token();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
