import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { HttpReservationsApi, ReservationsApi } from './services/reservations-api.service';
import { MockReservationsApi } from './services/reservations-api.mock';

/** Rutas de Reservas (W-H1–W-H6: pestañas por query param). */
export const RESERVATIONS_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Reservas' },
    providers: [{ provide: ReservationsApi, useFactory: () => (inject(MOCK_MODULES).reservations ? new MockReservationsApi() : new HttpReservationsApi()) }],
    loadComponent: () => import('./pages/reservations/reservations.component').then((m) => m.ReservationsComponent),
  },
];
