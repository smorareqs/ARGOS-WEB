import { Routes } from '@angular/router';
import {
  anyPermissionGuard,
  authGuard,
  guestGuard,
  permissionGuard,
  platformGuard,
  tenantGuard,
} from './core/guards/auth.guards';

const authLayout = () =>
  import('./layouts/auth-layout/auth-layout.component').then((m) => m.AuthLayoutComponent);

/**
 * Fronteras de enrutamiento raíz (ARCHITECTURE.md §4).
 * Sólo despacha de alto nivel con `loadChildren` / lazy `loadComponent`.
 * Cada sección exige su permiso (fase01.md §5 `permissionGuard`); las de una
 * empresa no existen en modo plataforma y la consola de ARGOS solo existe en él.
 */
export const routes: Routes = [
  {
    // Sitio público: presenta la plataforma y lleva al login o a "Solicitar demo".
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('./features/landing/landing.routes').then((m) => m.LANDING_ROUTES),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: authLayout,
    children: [{ path: '', loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES) }],
  },
  {
    // Enlaces de los correos: funcionan con o sin sesión abierta (W-A4, W-A5).
    path: '',
    loadComponent: authLayout,
    children: [
      {
        path: 'restablecer',
        title: 'Crea una contraseña nueva · ARGOS',
        loadComponent: () =>
          import('./features/auth/pages/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
      },
      {
        path: 'invitacion',
        title: 'Acepta tu invitación · ARGOS',
        loadComponent: () =>
          import('./features/auth/pages/accept-invitation/accept-invitation.component').then(
            (m) => m.AcceptInvitationComponent,
          ),
      },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'perfil',
        loadChildren: () => import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
      },
      {
        path: 'plataforma',
        canActivate: [platformGuard],
        loadChildren: () => import('./features/platform/platform.routes').then((m) => m.PLATFORM_ROUTES),
      },
      {
        path: '',
        canActivateChild: [tenantGuard],
        children: [
          {
            path: 'inicio',
            loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
          },
          {
            path: 'propiedades',
            canActivate: [permissionGuard('properties.read')],
            loadChildren: () => import('./features/properties/properties.routes').then((m) => m.PROPERTIES_ROUTES),
          },
          {
            path: 'colaboradores',
            canActivate: [permissionGuard('users.read')],
            loadChildren: () => import('./features/team/team.routes').then((m) => m.TEAM_ROUTES),
          },
          {
            path: 'itinerario',
            canActivate: [permissionGuard('tasks.read')],
            loadChildren: () => import('./features/itinerary/itinerary.routes').then((m) => m.ITINERARY_ROUTES),
          },
          {
            path: 'inventario',
            canActivate: [permissionGuard('inventory.read')],
            loadChildren: () => import('./features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES),
          },
          {
            path: 'mantenimiento',
            canActivate: [permissionGuard('maintenance.read')],
            loadChildren: () =>
              import('./features/maintenance/maintenance.routes').then((m) => m.MAINTENANCE_ROUTES),
          },
          {
            path: 'reservas',
            canActivate: [permissionGuard('reservations.read')],
            loadChildren: () =>
              import('./features/reservations/reservations.routes').then((m) => m.RESERVATIONS_ROUTES),
          },
          {
            path: 'areas-comunes',
            canActivate: [permissionGuard('shared_areas.read')],
            loadChildren: () =>
              import('./features/shared-areas/shared-areas.routes').then((m) => m.SHARED_AREAS_ROUTES),
          },
          {
            path: 'parqueos',
            canActivate: [permissionGuard('parking.read')],
            loadChildren: () => import('./features/parking/parking.routes').then((m) => m.PARKING_ROUTES),
          },
          {
            path: 'chat',
            canActivate: [anyPermissionGuard('chat.internal', 'chat.guest')],
            loadChildren: () => import('./features/chat/chat.routes').then((m) => m.CHAT_ROUTES),
          },
          {
            path: 'rrhh',
            canActivate: [anyPermissionGuard('hr.attendance.manage', 'hr.payroll.manage', 'hr.disciplinary.manage')],
            loadChildren: () => import('./features/hr/hr.routes').then((m) => m.HR_ROUTES),
          },
          {
            path: 'metricas',
            canActivate: [anyPermissionGuard('metrics.team', 'metrics.all')],
            loadChildren: () => import('./features/metrics/metrics.routes').then((m) => m.METRICS_ROUTES),
          },
          {
            path: 'alertas',
            canActivate: [permissionGuard('alerts.read')],
            loadChildren: () => import('./features/alerts/alerts.routes').then((m) => m.ALERTS_ROUTES),
          },
          {
            path: 'bitacora',
            canActivate: [permissionGuard('audit.read')],
            loadChildren: () => import('./features/audit/audit.routes').then((m) => m.AUDIT_ROUTES),
          },
          {
            path: 'configuracion',
            canActivate: [anyPermissionGuard('tenant.settings', 'tenant.billing')],
            loadChildren: () => import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
