import { Routes } from '@angular/router';
import { billingProviders } from '../billing/billing.providers';

/** Consola de la administración de ARGOS (fase01.md §5 · W-P1, W-P4; fase06.md · W-P2 planes, W-P3 suscripciones). */
export const PLATFORM_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'empresas' },
  {
    path: 'empresas',
    data: { title: 'Empresas' },
    loadComponent: () => import('./pages/tenants/platform-tenants.component').then((m) => m.PlatformTenantsComponent),
  },
  {
    path: 'planes',
    data: { title: 'Planes' },
    providers: billingProviders(),
    loadComponent: () => import('./pages/plans/platform-plans.component').then((m) => m.PlatformPlansComponent),
  },
  {
    path: 'suscripciones',
    data: { title: 'Suscripciones' },
    providers: billingProviders(),
    loadComponent: () => import('./pages/subscriptions/platform-subscriptions.component').then((m) => m.PlatformSubscriptionsComponent),
  },
  {
    path: 'bitacora',
    data: { title: 'Bitácora de plataforma' },
    loadComponent: () => import('./pages/audit/platform-audit.component').then((m) => m.PlatformAuditComponent),
  },
];
