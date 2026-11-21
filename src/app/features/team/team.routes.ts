import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { HttpTeamApi, TeamApi } from './services/team-api.service';
import { MockTeamApi } from './services/team-api.mock';

/** Rutas de Colaboradores (W-D1, W-O2; la ficha W-D2 se agrega como `:id`). */
export const TEAM_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Colaboradores' },
    providers: [
      {
        provide: TeamApi,
        useFactory: () => (inject(MOCK_MODULES).team ? new MockTeamApi() : new HttpTeamApi()),
      },
    ],
    loadComponent: () => import('./pages/team/team.component').then((m) => m.TeamComponent),
  },
];
