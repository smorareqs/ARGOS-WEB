import { Injectable, inject, signal } from '@angular/core';
import { ApiClient } from '../http/http-api';
import { MOCK_MODULES } from '../tokens/api.tokens';

export interface MapsConfig {
  readonly provider: 'google' | 'none';
  readonly api_key?: string;
  readonly map_id?: string;
}

/** Lo mínimo de `google.maps` que usa la web (sin @types/google.maps). */
export interface GoogleMapsNs {
  importLibrary(name: string): Promise<Record<string, unknown>>;
}

declare global {
  interface Window {
    google?: { maps?: GoogleMapsNs };
    __argosMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

/**
 * Mapa real del Inicio. Pide `GET /client-config` una vez por sesión: si el
 * backend tiene clave de Google Maps (`ARGOS_GOOGLE_MAPS_KEY`), carga el
 * script de Google (mapa 3D fotorrealista) y lo deja listo; si no, el Inicio
 * dibuja el mapa ilustrado. En el build de demostración no hay mapa real.
 */
@Injectable({ providedIn: 'root' })
export class MapsService {
  private readonly http = inject(ApiClient);
  private readonly mocks = inject(MOCK_MODULES, { optional: true });

  readonly config = signal<MapsConfig | null>(null);
  /** Google rechazó la clave (dominio no autorizado, API apagada, sin facturación). */
  readonly authFailed = signal(false);
  private configLoad: Promise<MapsConfig> | null = null;
  private scriptLoad: Promise<GoogleMapsNs> | null = null;

  /** Configuración del mapa (se pide una sola vez). */
  load(): Promise<MapsConfig> {
    this.configLoad ??= (async () => {
      let cfg: MapsConfig = { provider: 'none' };
      if (!this.mocks?.dashboard) {
        try {
          cfg = (await this.http.get<{ maps: MapsConfig }>('/client-config')).maps;
        } catch {
          cfg = { provider: 'none' };
        }
      }
      this.config.set(cfg);
      return cfg;
    })();
    return this.configLoad;
  }

  /** Carga el script de Google Maps (una vez) y devuelve `google.maps`. */
  google(key: string): Promise<GoogleMapsNs> {
    this.scriptLoad ??= new Promise<GoogleMapsNs>((resolve, reject) => {
      if (window.google?.maps) {
        resolve(window.google.maps);
        return;
      }
      window.gm_authFailure = () => this.authFailed.set(true);
      window.__argosMapsReady = () => (window.google?.maps ? resolve(window.google.maps) : reject(new Error('maps')));
      const s = document.createElement('script');
      const q = new URLSearchParams({ key, v: 'beta', libraries: 'maps3d', language: 'es', region: 'GT', loading: 'async', callback: '__argosMapsReady' });
      s.src = `https://maps.googleapis.com/maps/api/js?${q}`;
      s.async = true;
      s.onerror = () => reject(new Error('No se pudo cargar Google Maps'));
      document.head.append(s);
    });
    return this.scriptLoad;
  }
}
