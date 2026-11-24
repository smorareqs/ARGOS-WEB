import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { HttpParkingApi, ParkingApi } from './services/parking-api.service';
import { MockParkingApi } from './services/parking-api.mock';

/** Rutas de Parqueos (W-I1). */
export const PARKING_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Parqueos' },
    providers: [{ provide: ParkingApi, useFactory: () => (inject(MOCK_MODULES).parking ? new MockParkingApi() : new HttpParkingApi()) }],
    loadComponent: () => import('./pages/parking/parking.component').then((m) => m.ParkingComponent),
  },
];
