import { Routes } from '@angular/router';

/** Rutas de Bitácora (W-N1). AuditApi se provee en app.config (API real o modo demo). */
export const AUDIT_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Bitácora' },
    loadComponent: () => import('./pages/audit/audit.component').then((m) => m.AuditComponent),
  },
];
