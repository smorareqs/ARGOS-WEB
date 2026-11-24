import { RoleKey } from '../../../core/auth/permissions';
import { IconName } from '../../../shared/atoms/icon/icon.component';

/**
 * Contrato de miembros, invitaciones y roles (fase01.md §3.7:
 * `/tenants/{id}/members`, `/invitations`, `/roles`).
 */

export type MemberStatus = 'active' | 'suspended';

export interface Member {
  /** Id de la membresía (no del usuario). */
  readonly id: string;
  readonly user_id: string;
  readonly full_name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly role_key: RoleKey;
  readonly role_name: string;
  readonly status: MemberStatus;
  readonly properties_count: number;
  readonly last_seen_at: string | null;
  readonly joined_at: string;
}

export interface Invitation {
  readonly id: string;
  readonly email: string;
  readonly role_key: RoleKey;
  readonly role_name: string;
  readonly property_ids: readonly string[];
  readonly invited_by: string;
  readonly created_at: string;
  readonly expires_at: string;
  readonly message: string | null;
}

export interface InviteDraft {
  readonly email: string;
  readonly role_key: RoleKey;
  readonly property_ids: readonly string[];
  readonly message: string | null;
}

export interface Role {
  readonly key: RoleKey;
  readonly name: string;
  readonly description: string;
  readonly is_system: boolean;
  /** El alcance se restringe a propiedades asignadas o propias (PRD §2.2). */
  readonly scoped: boolean;
}

export interface PropertyOption {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

export const ROLE_ICON: Record<RoleKey, IconName> = {
  admin: 'shield',
  supervisor: 'calendar-check',
  cleaner: 'broom',
  maintenance: 'maintenance',
  security: 'key',
  owner: 'home',
  guest: 'guests',
};

/** Ícono del rol; los roles personalizados usan uno genérico. */
export function roleIcon(key: string): IconName {
  return (ROLE_ICON as Record<string, IconName>)[key] ?? 'badge';
}
