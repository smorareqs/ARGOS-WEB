import {
  ApplicationConfig,
  LOCALE_ID,
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
import { registerLocaleData } from '@angular/common';
import localeEsGt from '@angular/common/locales/es-GT';

import { routes } from './app.routes';
import { API_BASE_URL, DEMO_TENANT_LOGOS, MOCK_MODULES } from './core/tokens/api.tokens';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthApi, HttpAuthApi } from './core/auth/auth-api.service';
import { MockAuthApi } from './core/mocks/mock-auth-api';
import { AuditApi, HttpAuditApi } from './core/http/audit-api';
import { MockAuditApi } from './core/mocks/mock-audit-api';
import { HttpNotificationsApi, MockNotificationsApi, NotificationsApi } from './core/http/notifications-api';
import { HttpPropertiesApi, PropertiesApi } from './features/properties/services/properties-api.service';
import { MockPropertiesApi } from './features/properties/services/properties-api.mock';
import { SessionStore } from './core/store/session.store';
import { environment } from '../environments/environment';

/**
 * Configuración centralizada de proveedores globales (ARCHITECTURE.md §3).
 * La URL de la API y la bandera de mocks se exponen vía InjectionToken —
 * nunca se importan en features.
 */
// Fechas y cifras de los pipes en español de Guatemala (ux-ui.md §3.7).
registerLocaleData(localeEsGt);

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
    { provide: LOCALE_ID, useValue: 'es-GT' },
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    { provide: MOCK_MODULES, useValue: environment.mocks },
    { provide: DEMO_TENANT_LOGOS, useValue: environment.demoTenantLogos },
    {
      provide: AuthApi,
      useFactory: () => (inject(MOCK_MODULES).auth ? new MockAuthApi() : new HttpAuthApi()),
    },
    // Servicios que usan varias features (propiedades en la ficha del
    // colaborador, bitácora en la ficha de propiedad): se eligen aquí, una vez.
    {
      provide: PropertiesApi,
      useFactory: () => (inject(MOCK_MODULES).properties ? new MockPropertiesApi() : new HttpPropertiesApi()),
    },
    { provide: AuditApi, useFactory: () => (inject(MOCK_MODULES).audit ? new MockAuditApi() : new HttpAuditApi()) },
    {
      provide: NotificationsApi,
      useFactory: () => (inject(MOCK_MODULES).notifications ? new MockNotificationsApi() : new HttpNotificationsApi()),
    },
    // Restaura la sesión (refresh + /auth/me) antes de la primera navegación.
    provideAppInitializer(() => inject(SessionStore).restore()),
  ],
};
