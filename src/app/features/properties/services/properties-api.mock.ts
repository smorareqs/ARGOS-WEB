import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { Injectable, inject } from '@angular/core';
import { SessionStore, initials } from '../../../core/store/session.store';
import { ApiError } from '../../../core/http/api-error';
import { MockTable, isoFromToday, latency, uid } from '../../../core/mocks/mock-utils';
import { peopleOf } from '../../../core/mocks/demo-people';
import { DEMO_BUILDINGS, DEMO_PROPERTY_ROWS, seededPropertyId } from '../../../core/mocks/demo-properties';
import { PropertiesApi } from './properties-api.service';
import {
  AccessInfo,
  Building,
  Page,
  Property,
  PropertyDraft,
} from '../models/property.model';

/** Mock de propiedades por tenant, persistido en localStorage. */
@Injectable()
export class MockPropertiesApi extends PropertiesApi {
  private readonly session = inject(SessionStore);

  private get tenant(): string {
    return mockTenantKey(this.session.tenant());
  }

  private table(): MockTable<Property> {
    const t = this.tenant;
    return new MockTable<Property>(`properties_${t}`, () => seed(t));
  }

  async list(): Promise<Page<Property>> {
    await latency(600, 950);
    return { items: this.table().all(), next_cursor: null };
  }

  async buildings(): Promise<Page<Building>> {
    await latency(200, 400);
    return { items: DEMO_BUILDINGS[this.tenant] ?? [], next_cursor: null };
  }

  async create(draft: PropertyDraft): Promise<Property> {
    await latency(700, 1100);
    const table = this.table();
    const code = draft.code.trim().toUpperCase();
    if (table.all().some((p) => p.code === code)) {
      throw new ApiError(422, 'Revisa los datos marcados.', [
        { location: 'body.code', message: 'Ya existe una propiedad con ese código. Usa otro.' },
      ]);
    }
    const building = (DEMO_BUILDINGS[this.tenant] ?? []).find((b) => b.id === draft.building_id) ?? null;
    const created: Property = {
      id: uid('pr'),
      code,
      name: draft.name.trim(),
      type: draft.type,
      building_id: building?.id ?? null,
      building_name: building?.name ?? null,
      zone: building?.zone ?? draft.address ?? 'Sin zona',
      setting: building?.setting ?? (draft.type === 'house' ? 'colonial' : 'city'),
      address: draft.address,
      bedrooms: draft.bedrooms,
      bathrooms: draft.bathrooms,
      max_guests: draft.max_guests,
      is_active: true,
      today_status: 'pending',
      open_incidents: 0,
      last_cleaning_at: null,
      assigned: [],
      owners: [],
      has_access_info: false,
      notes: null,
      created_at: new Date().toISOString(),
    };
    table.update((rows) => [created, ...rows]);
    return created;
  }

  async accessInfo(id: string): Promise<AccessInfo> {
    await latency(450, 700);
    const row = DEMO_PROPERTY_ROWS[this.tenant]?.find((r) => this.table().all().find((p) => p.id === id)?.code === r.code);
    if (!row?.access) throw new ApiError(404, 'Esta propiedad aún no tiene información de acceso.');
    return { text: row.access, viewed_at: new Date().toISOString() };
  }
}

function seed(tenantId: string): Property[] {
  const people = peopleOf(tenantId);
  const ref = (id: string) => {
    const p = people.find((x) => x.id === id);
    return p ? { id: p.id, name: p.name, initials: initials(p.name) } : null;
  };
  const buildings = DEMO_BUILDINGS[tenantId] ?? [];
  return (DEMO_PROPERTY_ROWS[tenantId] ?? []).map((r, i) => {
    const b = buildings.find((x) => x.id === r.building) ?? null;
    return {
      id: seededPropertyId(tenantId, i),
      code: r.code,
      name: r.name,
      type: r.type,
      building_id: b?.id ?? null,
      building_name: b?.name ?? null,
      zone: b?.zone ?? r.zone ?? '',
      setting: b?.setting ?? r.setting ?? 'city',
      address: null,
      bedrooms: r.rooms[0],
      bathrooms: r.rooms[1],
      max_guests: r.rooms[2],
      is_active: r.active ?? true,
      today_status: r.status,
      open_incidents: r.incidents ?? 0,
      last_cleaning_at: r.last ? isoFromToday(r.last[0], r.last[1], r.last[2]) : null,
      assigned: r.assigned.map(ref).filter((x) => x !== null),
      owners: (r.owners ?? []).map(ref).filter((x) => x !== null),
      has_access_info: !!r.access,
      notes: null,
      created_at: isoFromToday(-120 + i),
    };
  });
}
