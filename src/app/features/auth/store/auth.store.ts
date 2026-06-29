import { Injectable, computed, inject, signal } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { Credentials } from '../models/credentials.model';

/**
 * Tienda del dominio de autenticación. Orquesta el flujo unidireccional:
 * la pantalla llama a `signIn()`, la tienda actualiza el estado y promueve la
 * sesión al estado global. Expone su estado vía Signals de sólo lectura (§5).
 *
 * Mock: no hay llamada HTTP real todavía. Cuando exista, un `auth-api.service.ts`
 * puro hará la petición y esta tienda procesará la respuesta.
 */
@Injectable()
export class AuthStore {
  private readonly session = inject(SessionStore);

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly canSubmit = computed(() => !this._loading());

  /** Inicia sesión (mock). Devuelve true si la autenticación fue exitosa. */
  async signIn(credentials: Credentials): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);

    // Simulación de latencia de red.
    await new Promise((resolve) => setTimeout(resolve, 350));

    if (!credentials.email || !credentials.password) {
      this._error.set('Ingresa tu correo y contraseña.');
      this._loading.set(false);
      return false;
    }

    this.session.signIn('mock-jwt-token', {
      nombre: 'Carlos Ruiz',
      iniciales: 'CR',
      rol: 'Administrador',
      tenant: 'Costa Limpia S.A.',
    });

    this._loading.set(false);
    return true;
  }
}
