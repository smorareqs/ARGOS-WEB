import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { HttpTeamApi, TeamApi } from './services/team-api.service';
import { MockTeamApi } from './services/team-api.mock';
import { EmployeesApi, HttpEmployeesApi, MockEmployeesApi } from './services/employees-api.service';
import { hrProviders } from '../hr/hr.providers';

/** Rutas de Colaboradores: la lista (W-D1, W-O2) y la ficha (W-D2) en `:id`. */
export const TEAM_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: TeamApi, useFactory: () => (inject(MOCK_MODULES).team ? new MockTeamApi() : new HttpTeamApi()) },
      { provide: EmployeesApi, useFactory: () => (inject(MOCK_MODULES).team ? new MockEmployeesApi() : new HttpEmployeesApi()) },
      ...hrProviders(),
    ],
    children: [
      {
        path: '',
        data: { title: 'Colaboradores' },
        loadComponent: () => import('./pages/team/team.component').then((m) => m.TeamComponent),
      },
      {
        path: ':id',
        data: { title: 'Ficha de colaborador' },
        loadComponent: () => import('./pages/member-page/member-page.component').then((m) => m.MemberPageComponent),
      },
    ],
  },
];
