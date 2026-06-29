import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { API_BASE_URL } from './core/tokens/api.tokens';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { environment } from '../environments/environment';

/**
 * Configuración centralizada de proveedores globales (ARCHITECTURE.md §3).
 * La URL de la API se expone vía InjectionToken — nunca importada en features.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
  ],
};
