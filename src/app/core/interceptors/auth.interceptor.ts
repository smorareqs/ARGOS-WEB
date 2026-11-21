import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { SessionStore } from '../store/session.store';
import { API_BASE_URL } from '../tokens/api.tokens';

/**
 * Interceptor funcional único (ARCHITECTURE.md §7, fase01.md §3.7.1):
 * - agrega `Authorization: Bearer` a las peticiones hacia la API;
 * - ante un 401 en un endpoint autenticado renueva el token UNA vez
 *   (vuelo único en SessionStore) y reintenta; si no se puede, cierra sesión.
 * Los endpoints `/auth/*` públicos no se reintentan.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const apiBase = inject(API_BASE_URL);

  if (!req.url.startsWith(apiBase)) return next(req);

  const withToken = (r: HttpRequest<unknown>, token: string | null) =>
    token ? r.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : r;

  const isPublicAuth = /\/auth\/(login|refresh|select-tenant|logout|password\/forgot)/.test(req.url);

  return next(withToken(req, session.token())).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || isPublicAuth) {
        return throwError(() => err);
      }
      return from(session.refreshAccess()).pipe(
        switchMap((token) => {
          if (!token) {
            void router.navigate(['/login'], { queryParams: { motivo: 'sesion' } });
            return throwError(() => err);
          }
          return next(withToken(req, token));
        }),
      );
    }),
  );
};
