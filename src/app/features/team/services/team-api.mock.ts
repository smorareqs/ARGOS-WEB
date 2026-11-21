import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { ApiError } from '../../../core/http/api-error';
import { Page } from '../../../core/http/page';
import { ROLE_NAMES, RoleKey } from '../../../core/auth/permissions';
import { MockTable, isoFromToday, latency, uid } from '../../../core/mocks/mock-utils';
import { peopleOf } from '../../../core/mocks/demo-people';
import { DEMO_PROPERTY_ROWS, seededPropertyId } from '../../../core/mocks/demo-properties';
import { TeamApi } from './team-api.service';
import { Invitation, InviteDraft, Member, PropertyOption, Role } from '../models/team.model';

const ROLES: Role[] = [
  { key: 'admin', name: ROLE_NAMES.admin, description: 'Todo: configuración, usuarios, nómina y facturación.', is_system: true, scoped: false },
  { key: 'supervisor', name: ROLE_NAMES.supervisor, description: 'Opera el día: itinerario, validaciones e inventario.', is_system: true, scoped: false },
  { key: 'cleaner', name: ROLE_NAMES.cleaner, description: 'Ve y ejecuta sus limpiezas desde la app.', is_system: true, scoped: true },
  { key: 'maintenance', name: ROLE_NAMES.maintenance, description: 'Atiende incidencias y preventivos asignados.', is_system: true, scoped: true },
  { key: 'security', name: ROLE_NAMES.security, description: 'Llegadas, salidas, huéspedes activos y alarmas.', is_system: true, scoped: false },
  { key: 'owner', name: ROLE_NAMES.owner, description: 'Consulta sus propiedades, reservas y reportes.', is_system: true, scoped: true },
];

/** Mock de miembros e invitaciones por tenant, persistido en localStorage. */
@Injectable()
export class MockTeamApi extends TeamApi {
  private readonly session = inject(SessionStore);

  private get tenant(): string {
    return mockTenantKey(this.session.tenant());
  }

  private membersTable(): MockTable<Member> {
    const t = this.tenant;
    return new MockTable<Member>(`members_${t}`, () => seedMembers(t));
  }

  private invitesTable(): MockTable<Invitation> {
    const t = this.tenant;
    return new MockTable<Invitation>(`invitations_${t}`, () => seedInvitations(t));
  }

  async members(): Promise<Page<Member>> {
    await latency(560, 900);
    return { items: this.membersTable().all(), next_cursor: null };
  }

  async invitations(): Promise<Page<Invitation>> {
    await latency(300, 500);
    return { items: this.invitesTable().all(), next_cursor: null };
  }

  async roles(): Promise<Page<Role>> {
    await latency(150, 300);
    return { items: ROLES, next_cursor: null };
  }

  async propertyOptions(): Promise<Page<PropertyOption>> {
    await latency(150, 300);
    return { items: propertyOptions(this.tenant), next_cursor: null };
  }

  async changeRole(memberId: string, role: RoleKey): Promise<Member> {
    await latency(380, 620);
    const all = this.membersTable().all();
    const m = all.find((x) => x.id === memberId);
    if (!m) throw new ApiError(404, 'Ese colaborador ya no está en la empresa.');
    if (m.role_key === 'admin' && role !== 'admin' && activeAdmins(all) <= 1) {
      throw new ApiError(422, 'Debe quedar al menos un administrador activo.');
    }
    return this.patch(memberId, { role_key: role, role_name: ROLE_NAMES[role] });
  }

  async setSuspended(memberId: string, suspended: boolean): Promise<Member> {
    await latency(380, 620);
    const all = this.membersTable().all();
    const m = all.find((x) => x.id === memberId);
    if (!m) throw new ApiError(404, 'Ese colaborador ya no está en la empresa.');
    if (m.user_id === this.session.user()?.id) throw new ApiError(422, 'No puedes suspender tu propia cuenta.');
    if (suspended && m.role_key === 'admin' && activeAdmins(all) <= 1) {
      throw new ApiError(422, 'Debe quedar al menos un administrador activo.');
    }
    return this.patch(memberId, { status: suspended ? 'suspended' : 'active' });
  }

  async revokeSessions(): Promise<void> {
    await latency(300, 500);
  }

  async invite(draft: InviteDraft): Promise<Invitation> {
    await latency(650, 1000);
    const email = draft.email.trim().toLowerCase();
    if (this.membersTable().all().some((m) => m.email === email)) {
      throw new ApiError(422, 'Revisa el correo.', [{ location: 'body.email', message: 'Esa persona ya es parte de la empresa.' }]);
    }
    if (this.invitesTable().all().some((i) => i.email === email)) {
      throw new ApiError(422, 'Revisa el correo.', [
        { location: 'body.email', message: 'Ya tiene una invitación pendiente. Puedes reenviarla.' },
      ]);
    }
    const inv: Invitation = {
      id: uid('inv'),
      email,
      role_key: draft.role_key,
      role_name: ROLE_NAMES[draft.role_key],
      property_ids: draft.property_ids,
      invited_by: this.session.user()?.nombre ?? 'Administrador',
      created_at: new Date().toISOString(),
      expires_at: isoFromToday(7, 23, 59),
      message: draft.message,
    };
    this.invitesTable().update((rows) => [inv, ...rows]);
    return inv;
  }

  async resend(invitationId: string): Promise<Invitation> {
    await latency(400, 700);
    let updated: Invitation | undefined;
    this.invitesTable().update((rows) =>
      rows.map((r) => {
        if (r.id !== invitationId) return r;
        updated = { ...r, created_at: new Date().toISOString(), expires_at: isoFromToday(7, 23, 59) };
        return updated;
      }),
    );
    if (!updated) throw new ApiError(404, 'La invitación ya no existe.');
    return updated;
  }

  async revoke(invitationId: string): Promise<void> {
    await latency(300, 500);
    this.invitesTable().update((rows) => rows.filter((r) => r.id !== invitationId));
  }

  private patch(memberId: string, changes: Partial<Member>): Member {
    let out: Member | undefined;
    this.membersTable().update((rows) =>
      rows.map((r) => {
        if (r.id !== memberId) return r;
        out = { ...r, ...changes };
        return out;
      }),
    );
    return out!;
  }
}

function activeAdmins(all: readonly Member[]): number {
  return all.filter((m) => m.role_key === 'admin' && m.status === 'active').length;
}

function propertyOptions(tenantId: string): PropertyOption[] {
  // Si el mock de propiedades ya persistió su tabla (con altas nuevas), se usa esa.
  try {
    const raw = localStorage.getItem(`argos.mock.properties_${tenantId}`);
    if (raw) {
      return (JSON.parse(raw) as PropertyOption[]).map(({ id, code, name }) => ({ id, code, name }));
    }
  } catch {
    /* sin almacenamiento */
  }
  return (DEMO_PROPERTY_ROWS[tenantId] ?? []).map((r, i) => ({ id: seededPropertyId(tenantId, i), code: r.code, name: r.name }));
}

function seedMembers(tenantId: string): Member[] {
  const rows = DEMO_PROPERTY_ROWS[tenantId] ?? [];
  return peopleOf(tenantId).map((p, i) => ({
    id: `mb_${tenantId.slice(3)}_${i + 1}`,
    user_id: p.id,
    full_name: p.name,
    email: p.email,
    phone: p.phone,
    role_key: p.role,
    role_name: ROLE_NAMES[p.role],
    status: p.status,
    properties_count: rows.filter((r) => r.assigned.includes(p.id) || r.owners?.includes(p.id)).length,
    last_seen_at: p.lastSeenDays === null ? null : isoFromToday(-p.lastSeenDays, p.lastSeenHour, (i * 7) % 60),
    joined_at: isoFromToday(-300 + i * 17),
  }));
}

function seedInvitations(tenantId: string): Invitation[] {
  if (tenantId !== 'tn_garrent') return [];
  return [
    {
      id: 'inv_1',
      email: 'pedro.aju@garrent.gt',
      role_key: 'maintenance',
      role_name: ROLE_NAMES.maintenance,
      property_ids: [seededPropertyId(tenantId, 0), seededPropertyId(tenantId, 4)],
      invited_by: 'Ana López',
      created_at: isoFromToday(-2, 10, 15),
      expires_at: isoFromToday(5, 23, 59),
      message: null,
    },
    {
      id: 'inv_2',
      email: 'andrea.cifuentes@gmail.com',
      role_key: 'cleaner',
      role_name: ROLE_NAMES.cleaner,
      property_ids: [seededPropertyId(tenantId, 7), seededPropertyId(tenantId, 8)],
      invited_by: 'Jorge Peña',
      created_at: isoFromToday(-6, 16, 40),
      expires_at: isoFromToday(1, 23, 59),
      message: 'Te damos la bienvenida al equipo de Antigua.',
    },
  ];
}
