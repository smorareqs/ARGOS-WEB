import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { API_BASE_URL, DEMO_TENANT_LOGOS, MOCK_MODULES } from './core/tokens/api.tokens';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthApi, HttpAuthApi } from './core/auth/auth-api.service';
import { MockAuthApi } from './core/mocks/mock-auth-api';
import { SessionStore } from './core/store/session.store';
import { environment } from '../environments/environment';

/**
 * Configuración centralizada de proveedores globales (ARCHITECTURE.md §3).
 * La URL de la API y la bandera de mocks se exponen vía InjectionToken —
 * nunca se importan en features.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions({ skipInitialTransition: true }),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    { provide: MOCK_MODULES, useValue: environment.mocks },
    { provide: DEMO_TENANT_LOGOS, useValue: environment.demoTenantLogos },
    {
      provide: AuthApi,
      useFactory: () => (inject(MOCK_MODULES).auth ? new MockAuthApi() : new HttpAuthApi()),
    },
    // Restaura la sesión (refresh + /auth/me) antes de la primera navegación.
    provideAppInitializer(() => inject(SessionStore).restore()),
  ],
};
