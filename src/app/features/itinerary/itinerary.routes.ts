import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { HttpItineraryApi, ItineraryApi } from './services/itinerary-api.service';
import { MockItineraryApi } from './services/itinerary-api.mock';

/** Rutas del Itinerario (W-E1–W-E4: una pantalla, vistas por query param). */
export const ITINERARY_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Itinerario' },
    providers: [
      { provide: ItineraryApi, useFactory: () => (inject(MOCK_MODULES).itinerary ? new MockItineraryApi() : new HttpItineraryApi()) },
    ],
    loadComponent: () => import('./pages/itinerary/itinerary.component').then((m) => m.ItineraryComponent),
  },
];
