import { Injectable, computed, signal } from '@angular/core';

/** Usuario de la sesión activa. */
export interface SessionUser {
  readonly nombre: string;
  readonly iniciales: string;
  readonly rol: string;
  readonly tenant: string;
}

/**
 * Estado global mínimo (ARCHITECTURE.md §5): sólo sesión activa,
 * configuración de usuario y permisos. Nada de estado de feature aquí.
 *
 * Expone el estado vía Signals de sólo lectura; las mutaciones ocurren
 * únicamente a través de los métodos de la tienda (flujo unidireccional).
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<SessionUser | null>(null);

  /** JWT de la sesión activa (lo lee el interceptor). */
  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);

  /** Inicia una sesión mock. Reemplazar por la respuesta real del backend. */
  signIn(token: string, user: SessionUser): void {
    this._token.set(token);
    this._user.set(user);
  }

  signOut(): void {
    this._token.set(null);
    this._user.set(null);
  }
}
