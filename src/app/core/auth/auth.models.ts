import { FeatureFlag, Permission, RoleKey } from './permissions';

/**
 * Contrato JSON de autenticación (APP/docs/plans/fase01.md §3.7.1).
 * snake_case tal como lo envía el backend; las tiendas lo traducen.
 */

export interface Device {
  readonly id: string;
  readonly name: string;
  readonly platform: 'android' | 'ios' | 'web';
}

export interface Membership {
  readonly tenant_id: string;
  readonly tenant_name: string;
  readonly tenant_logo_url: string | null;
  readonly role_key: RoleKey;
  readonly role_name: string;
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
  readonly totp_code?: string;
  readonly device: Device;
}

/** Respuesta de sesión: login, select-tenant y aceptar invitación. */
export type SessionResponse =
  | {
      readonly status: 'authenticated';
      readonly access_token: string;
      readonly refresh_token: string;
      readonly expires_in: number;
      readonly memberships: readonly Membership[];
    }
  | {
      readonly status: 'select_tenant';
      readonly selection_token: string;
      readonly memberships: readonly Membership[];
    };

export type SelectTenantRequest =
  | { readonly tenant_id: string; readonly selection_token: string; readonly device: Device }
  | { readonly tenant_id: string; readonly refresh_token: string };

export interface RefreshResponse {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_in: number;
}

export interface MeTenant {
  readonly id: string;
  readonly name: string;
  readonly logo_url: string | null;
  readonly timezone: string;
  readonly currency: string;
  readonly features: Readonly<Record<FeatureFlag, boolean>>;
}

/** `tenant` y `role` son null en modo plataforma (administración de ARGOS). */
export interface MeResponse {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly full_name: string;
    readonly totp_enabled: boolean;
    readonly is_platform_admin?: boolean;
  };
  readonly tenant: MeTenant | null;
  readonly role: { readonly key: RoleKey; readonly name: string } | null;
  readonly permissions: readonly Permission[];
  readonly memberships: readonly Membership[];
}

/** Sesión dentro de una empresa: lo único que el portal sabe mostrar hoy. */
export type TenantMe = MeResponse & {
  readonly tenant: MeTenant;
  readonly role: { readonly key: RoleKey; readonly name: string };
};
