import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { DEMO_TENANTS, ROLE_PERMISSIONS, mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, latency, uid } from '../../../core/mocks/mock-utils';
import { opsPeople } from '../../../core/mocks/demo-ops';
import { ApiError } from '../../../core/http/api-error';
import { ROLE_NAMES, RoleKey } from '../../../core/auth/permissions';
import { CompanyChanges, CompanySettings, RoleDef, RoleDraft, SettingsApi } from './settings-api.service';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Mock de configuración por empresa (localStorage) con las reglas del backend. */
@Injectable()
export class MockSettingsApi extends SettingsApi {
  private readonly session = inject(SessionStore);

  private get tenant(): string {
    return mockTenantKey(this.session.tenant());
  }
  private companyTable(): MockTable<CompanySettings> {
    const t = this.tenant;
    return new MockTable<CompanySettings>(`settings_v2_${t}`, () => [
      seedCompany(t, this.session.tenant()?.name ?? 'Garrent', this.session.tenant()?.features),
    ]);
  }
  private roleTable(): MockTable<RoleDef> {
    const t = this.tenant;
    return new MockTable<RoleDef>(`roles_v2_${t}`, () => seedRoles(t));
  }

  async company(): Promise<CompanySettings> {
    await latency(350, 600);
    return this.companyTable().all()[0];
  }

  async saveCompany(changes: CompanyChanges): Promise<CompanySettings> {
    await latency(500, 800);
    const { logo_file_id: _file, remove_logo, ...fields } = changes;
    for (const f of ['checkin_time', 'checkout_time'] as const) {
      const v = fields[f];
      if (v !== undefined && !HHMM.test(v)) {
        throw new ApiError(422, 'La hora debe tener el formato HH:MM.', [{ location: `body.${f}`, message: 'La hora debe tener el formato HH:MM.' }]);
      }
    }
    const next = { ...this.companyTable().all()[0], ...fields, ...(remove_logo ? { logo_url: null } : {}) };
    this.companyTable().save([next]);
    return next;
  }

  async uploadLogo(file: File, onProgress?: (pct: number) => void): Promise<CompanySettings> {
    onProgress?.(40);
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    onProgress?.(100);
    const next = { ...this.companyTable().all()[0], logo_url: url };
    this.companyTable().save([next]);
    return next;
  }

  removeLogo(): Promise<CompanySettings> {
    return this.saveCompany({ remove_logo: true });
  }

  async roles(): Promise<readonly RoleDef[]> {
    await latency(350, 600);
    return this.roleTable().all();
  }

  async createRole(draft: RoleDraft): Promise<RoleDef> {
    await latency(450, 750);
    const name = draft.name.trim();
    if (this.roleTable().all().some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError(422, 'Ya hay un rol con ese nombre.', [{ location: 'body.name', message: 'Ya hay un rol con ese nombre.' }]);
    }
    const role: RoleDef = {
      id: uid('role'),
      key: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      description: draft.description ?? null,
      is_system: false,
      scoped: draft.scoped ?? false,
      members: 0,
      permissions: [...draft.permissions],
    };
    this.roleTable().update((rows) => [...rows, role]);
    return role;
  }

  async updateRole(id: string, changes: Partial<RoleDraft>): Promise<RoleDef> {
    await latency(450, 750);
    const role = this.roleTable().all().find((r) => r.id === id);
    if (!role) throw new ApiError(404, 'El rol ya no existe.');
    if (role.is_system) throw new ApiError(422, 'Los roles del sistema no se editan. Duplícalo para crear uno personalizado.');
    const next: RoleDef = {
      ...role,
      name: changes.name?.trim() ?? role.name,
      description: changes.description === undefined ? role.description : changes.description,
      permissions: changes.permissions ? [...changes.permissions] : role.permissions,
      scoped: changes.scoped ?? role.scoped,
    };
    this.roleTable().update((rows) => rows.map((r) => (r.id === id ? next : r)));
    return next;
  }

  async deleteRole(id: string): Promise<void> {
    await latency(350, 600);
    const role = this.roleTable().all().find((r) => r.id === id);
    if (role?.members) throw new ApiError(422, 'El rol tiene colaboradores. Cámbialos de rol antes de borrarlo.');
    this.roleTable().update((rows) => rows.filter((r) => r.id !== id));
  }

}

function seedCompany(tenant: string, name: string, features?: Readonly<Record<string, boolean>>): CompanySettings {
  const demo = DEMO_TENANTS.find((t) => t.id === tenant);
  const garrent = tenant === 'tn_garrent';
  return {
    name,
    legal_name: garrent ? 'Garrent Hospitalidad, S.A.' : 'Costa Limpia, S.A.',
    nit: garrent ? '9876543-2' : '5544332-1',
    logo_url: null,
    timezone: 'America/Guatemala',
    currency: 'GTQ',
    checkin_time: '15:00',
    checkout_time: '11:00',
    checkout_alarm_minutes: 30,
    guest_instructions: 'Hola, {{huesped}}. Te esperamos en {{propiedad}} el {{fecha_entrada}} desde las {{hora_entrada}}.',
    features: {
      reservations: features?.['reservations'] ?? demo?.features.reservations ?? true,
      parking: features?.['parking'] ?? demo?.features.parking ?? false,
      shared_areas: features?.['shared_areas'] ?? demo?.features.shared_areas ?? false,
      guest_chat: false,
      payroll: features?.['payroll'] ?? demo?.features.payroll ?? false,
      smart_locks: false,
    },
  };
}

function seedRoles(tenant: string): RoleDef[] {
  const people = opsPeople(tenant);
  const keys: RoleKey[] = ['admin', 'supervisor', 'cleaner', 'maintenance', 'security', 'owner'];
  return [
    ...keys.map((k) => ({
      id: `role_${k}`,
      key: k,
      name: ROLE_NAMES[k],
      description: null,
      is_system: true,
      scoped: k === 'cleaner' || k === 'maintenance' || k === 'owner',
      members: people.filter((p) => p.role === k).length,
      permissions: ROLE_PERMISSIONS[k],
    })),
    {
      id: 'role_recepcion',
      key: 'recepcion',
      name: 'Recepción',
      description: 'Turno de recepción en el lobby',
      is_system: false,
      scoped: false,
      members: 0,
      permissions: ['properties.read', 'reservations.read', 'reservations.checkin', 'guests.read', 'parking.read', 'shared_areas.read', 'shared_areas.book', 'chat.guest'],
    },
  ];
}
