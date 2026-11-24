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
      /** true si también puede entrar a la administración de ARGOS. */
      readonly platform_admin?: boolean;
    }
  | {
      readonly status: 'select_tenant';
      readonly selection_token: string;
      readonly memberships: readonly Membership[];
      readonly platform_admin?: boolean;
    };

export type SelectTenantRequest =
  | { readonly tenant_id: string; readonly selection_token: string; readonly device: Device }
  | { readonly tenant_id: string; readonly refresh_token: string }
  /** Entrar a la administración de ARGOS (solo platform_admin). */
  | { readonly platform: true; readonly selection_token: string; readonly device: Device }
  | { readonly platform: true; readonly refresh_token: string };

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
  /** Fase 6: estado de la suscripción. Sin API de facturación llega vacío. */
  readonly billing_status?: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
  /** true: la empresa solo puede leer hasta ponerse al día (402 en escrituras). */
  readonly read_only?: boolean;
}

/** `tenant` y `role` son null en modo plataforma (administración de ARGOS). */
export interface MeResponse {
  readonly user: {
    readonly id: string;
    readonly email: string;
    readonly full_name: string;
    readonly phone?: string | null;
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

/** Sesión abierta en un dispositivo (GET /auth/sessions). */
export interface SessionInfo {
  readonly id: string;
  readonly device_name: string | null;
  readonly platform: 'android' | 'ios' | 'web';
  readonly ip: string | null;
  /** Empresa activa en esa sesión; null en la administración de ARGOS. */
  readonly tenant_name: string | null;
  readonly last_used_at: string | null;
  readonly created_at: string;
  readonly current: boolean;
}

/** POST /auth/totp/setup: clave y enlace para el QR. */
export interface TotpSetup {
  readonly secret: string;
  readonly otpauth_url: string;
}

/** GET /auth/invitations/{token}. */
export interface InvitationPreview {
  readonly tenant_name: string;
  readonly tenant_logo_url: string | null;
  readonly role_name: string;
  readonly email: string;
  readonly inviter_name: string | null;
  /** true: ya tiene cuenta y entra con su contraseña actual. */
  readonly user_exists: boolean;
  readonly expires_at: string;
}

export interface AcceptInvitationRequest {
  readonly token: string;
  readonly password: string;
  readonly full_name?: string;
  readonly totp_code?: string;
  readonly device: Device;
}

export interface ProfileUpdate {
  readonly full_name?: string;
  readonly phone?: string;
}
