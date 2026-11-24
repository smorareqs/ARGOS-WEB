import { Injectable, inject } from '@angular/core';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { SessionStore } from '../../../core/store/session.store';
import { ApiError } from '../../../core/http/api-error';
import { MockTable, latency, uid } from '../../../core/mocks/mock-utils';
import { peopleOf } from '../../../core/mocks/demo-people';
import { ROLE_NAMES } from '../../../core/auth/permissions';
import { DEMO_BUILDINGS, DEMO_PROPERTY_ROWS, seededPropertyId } from '../../../core/mocks/demo-properties';
import { PersonOption, PropertiesApi, PropertyQuery } from './properties-api.service';
import {
  AccessInfo,
  Building,
  BuildingDraft,
  ChecklistTemplate,
  PersonRef,
  Property,
  PropertyDraft,
  PropertyPatch,
  TemplateDraft,
} from '../models/property.model';

interface Stored extends Property {
  readonly access_text: string | null;
}

const now = () => new Date().toISOString();
const invalid = (location: string, message: string) => new ApiError(422, 'Revisa los datos marcados.', [{ location, message }]);

/**
 * Backend simulado de propiedades (modo demo, sin API): mismo contrato que
 * fase02.md §4, persistido en localStorage por empresa. Sirve para mostrar el
 * producto sin servidor (`npm run docker:demo`).
 */
@Injectable()
export class MockPropertiesApi extends PropertiesApi {
  private readonly session = inject(SessionStore);

  private get tenant(): string {
    return mockTenantKey(this.session.tenant());
  }

  private props(): MockTable<Stored> {
    const t = this.tenant;
    return new MockTable<Stored>(`properties_v2_${t}`, () => seedProperties(t));
  }

  private bldgs(): MockTable<Building> {
    const t = this.tenant;
    return new MockTable<Building>(`buildings_v2_${t}`, () => seedBuildings(t));
  }

  private tpls(): MockTable<ChecklistTemplate> {
    return new MockTable<ChecklistTemplate>(`templates_${this.tenant}`, seedTemplates);
  }

  async list(q: PropertyQuery = {}): Promise<Property[]> {
    await latency(450, 800);
    const text = (q.q ?? '').toLowerCase();
    return this.view().filter(
      (p) =>
        (!text || `${p.code} ${p.name} ${p.zone ?? ''}`.toLowerCase().includes(text)) &&
        (!q.building_id || p.building_id === q.building_id) &&
        (!q.assignee || p.assigned.some((a) => a.user_id === q.assignee)) &&
        (!q.owner || p.owners.some((a) => a.user_id === q.owner)),
    );
  }

  async get(id: string): Promise<Property> {
    await latency(200, 400);
    const p = this.view().find((x) => x.id === id);
    if (!p) throw new ApiError(404, 'La propiedad no existe.');
    return p;
  }

  async create(d: PropertyDraft): Promise<Property> {
    await latency(600, 900);
    const code = d.code.trim().toUpperCase();
    if (this.props().all().some((p) => p.code === code)) throw invalid('body.code', 'Ya existe una propiedad con ese código. Usa otro.');
    const def = this.tpls().all().find((t) => t.is_default);
    const row: Stored = {
      ...emptyProperty(uid('pr'), code, d.name.trim(), d.type),
      ...this.apply(d),
      checklist_template_id: d.checklist_template_id ?? def?.id ?? null,
      access_text: d.access_info ?? null,
    };
    this.props().update((rows) => [...rows, row]);
    return this.get(row.id);
  }

  async update(id: string, patch: PropertyPatch): Promise<Property> {
    await latency(400, 700);
    this.props().update((rows) =>
      rows.map((p) =>
        p.id !== id
          ? p
          : {
              ...p,
              ...this.apply(patch),
              ...(patch.access_info !== undefined ? { access_text: patch.access_info } : {}),
              updated_at: now(),
            },
      ),
    );
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    await latency(300, 500);
    this.props().update((rows) => rows.filter((p) => p.id !== id));
  }

  async accessInfo(id: string): Promise<AccessInfo> {
    await latency(400, 650);
    const p = this.props().all().find((x) => x.id === id);
    if (!p?.access_text) throw new ApiError(404, 'Esta propiedad aún no tiene información de acceso.');
    return { property_id: id, text: p.access_text, updated_at: p.access_info_updated_at, viewed_at: now() };
  }

  async setAssignees(id: string, userIds: readonly string[]): Promise<Property> {
    return this.update(id, {}).then(() => this.setRefs(id, 'assigned', userIds));
  }

  async setOwners(id: string, userIds: readonly string[]): Promise<Property> {
    return this.update(id, {}).then(() => this.setRefs(id, 'owners', userIds));
  }

  async setUserAssignments(userId: string, ids: readonly string[]): Promise<{ property_ids: string[] }> {
    return this.setUserRefs(userId, 'assigned', ids);
  }

  async setUserOwnerships(userId: string, ids: readonly string[]): Promise<{ property_ids: string[] }> {
    return this.setUserRefs(userId, 'owners', ids);
  }

  async buildings(): Promise<readonly Building[]> {
    await latency(200, 400);
    const props = this.props().all();
    return this.bldgs()
      .all()
      .map((b) => ({ ...b, properties_count: props.filter((p) => p.building_id === b.id).length }));
  }

  async createBuilding(d: BuildingDraft): Promise<Building> {
    await latency(400, 700);
    const b: Building = { id: uid('bd'), name: d.name, address: d.address ?? null, zone: d.zone ?? null, lat: d.lat ?? null, lng: d.lng ?? null,
      notes: d.notes ?? null, is_active: true, properties_count: 0, created_at: now(), updated_at: now() };
    this.bldgs().update((rows) => [...rows, b]);
    return b;
  }

  async updateBuilding(id: string, patch: Partial<BuildingDraft>): Promise<Building> {
    await latency(400, 700);
    this.bldgs().update((rows) => rows.map((b) => (b.id === id ? { ...b, ...patch, updated_at: now() } as Building : b)));
    return (await this.buildings()).find((b) => b.id === id)!;
  }

  async removeBuilding(id: string): Promise<void> {
    await latency(300, 500);
    if (this.props().all().some((p) => p.building_id === id)) {
      throw new ApiError(422, 'El edificio tiene propiedades. Muévelas a otro edificio o desactívalo.');
    }
    this.bldgs().update((rows) => rows.filter((b) => b.id !== id));
  }

  async templates(): Promise<readonly ChecklistTemplate[]> {
    await latency(200, 400);
    const props = this.props().all();
    return this.tpls()
      .all()
      .map((t) => ({ ...t, properties_count: props.filter((p) => p.checklist_template_id === t.id).length }))
      .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name));
  }

  async createTemplate(d: TemplateDraft): Promise<ChecklistTemplate> {
    await latency(400, 700);
    if (this.tpls().all().some((t) => t.name.toLowerCase() === d.name.toLowerCase())) throw invalid('body.name', 'Ya hay una plantilla con ese nombre.');
    const t = template(uid('ct'), d);
    this.tpls().update((rows) => [...rows.map((x) => (d.is_default ? { ...x, is_default: false } : x)), t]);
    return t;
  }

  async updateTemplate(id: string, patch: Partial<TemplateDraft>): Promise<ChecklistTemplate> {
    await latency(400, 700);
    this.tpls().update((rows) =>
      rows.map((x) => {
        if (x.id !== id) return patch.is_default ? { ...x, is_default: false } : x;
        return template(id, { name: patch.name ?? x.name, description: patch.description ?? x.description, is_default: patch.is_default ?? x.is_default, items: patch.items ?? x.items });
      }),
    );
    return (await this.templates()).find((t) => t.id === id)!;
  }

  async removeTemplate(id: string): Promise<void> {
    await latency(300, 500);
    this.tpls().update((rows) => rows.filter((t) => t.id !== id));
    this.props().update((rows) => rows.map((p) => (p.checklist_template_id === id ? { ...p, checklist_template_id: null } : p)));
  }

  async people(): Promise<readonly PersonOption[]> {
    await latency(200, 350);
    return peopleOf(this.tenant).map((p) => ({
      user_id: p.id, full_name: p.name, email: p.email, role_key: p.role, role_name: ROLE_NAMES[p.role], status: p.status,
    }));
  }

  // --- Internos ---

  /** Filas con los nombres de edificio y plantilla resueltos (como el JOIN real). */
  private view(): Property[] {
    const b = this.bldgs().all();
    const t = this.tpls().all();
    return this.props()
      .all()
      .map(({ access_text, ...p }) => ({
        ...p,
        has_access_info: !!access_text,
        building_name: b.find((x) => x.id === p.building_id)?.name ?? null,
        building_zone: b.find((x) => x.id === p.building_id)?.zone ?? null,
        checklist_template_name: t.find((x) => x.id === p.checklist_template_id)?.name ?? null,
      }))
      .sort((x, y) => x.code.localeCompare(y.code));
  }

  private apply(d: PropertyPatch): Partial<Stored> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(d)) if (v !== undefined && k !== 'access_info') out[k] = v;
    if (typeof d.code === 'string') out['code'] = d.code.trim().toUpperCase();
    return out as Partial<Stored>;
  }

  private refs(ids: readonly string[]): PersonRef[] {
    const people = peopleOf(this.tenant);
    return ids.flatMap((id) => {
      const p = people.find((x) => x.id === id);
      return p ? [{ user_id: p.id, full_name: p.name }] : [];
    });
  }

  private async setRefs(id: string, key: 'assigned' | 'owners', ids: readonly string[]): Promise<Property> {
    this.props().update((rows) => rows.map((p) => (p.id === id ? { ...p, [key]: this.refs(ids) } : p)));
    return this.get(id);
  }

  private async setUserRefs(userId: string, key: 'assigned' | 'owners', ids: readonly string[]): Promise<{ property_ids: string[] }> {
    await latency(300, 500);
    const [me] = this.refs([userId]);
    this.props().update((rows) =>
      rows.map((p) => {
        const others = p[key].filter((r) => r.user_id !== userId);
        return { ...p, [key]: ids.includes(p.id) && me ? [...others, me] : others };
      }),
    );
    return { property_ids: [...ids] };
  }
}

function emptyProperty(id: string, code: string, name: string, type: Property['type']): Stored {
  return {
    id, code, name, type, building_id: null, building_name: null, building_zone: null, address: null, zone: null, lat: null, lng: null,
    bedrooms: null, bathrooms: null, max_guests: null, checklist_template_id: null, checklist_template_name: null,
    has_access_info: false, access_info_updated_at: null, cover_file_id: null, cover_url: null, notes: null,
    is_active: true, assigned: [], owners: [], created_at: now(), updated_at: now(), access_text: null,
  };
}

function template(id: string, d: TemplateDraft): ChecklistTemplate {
  return {
    id, name: d.name, description: d.description ?? null, is_default: !!d.is_default, properties_count: 0,
    items: d.items.map((it, i) => ({ ...it, id: `${id}_${i}`, position: i + 1, requires_photo: it.requires_photo || it.requires_before_after })),
    created_at: now(), updated_at: now(),
  };
}

function seedTemplates(): ChecklistTemplate[] {
  const item = (section: string, text: string, photo = false, pair = false) => ({ section, text, requires_photo: photo, requires_before_after: pair });
  return [
    template('ct_std', {
      name: 'Limpieza estándar', description: 'Entre huéspedes: deja la propiedad lista para el siguiente check-in.', is_default: true,
      items: [
        item('Entrada y sala', 'Barrer y trapear pisos'), item('Entrada y sala', 'Foto general de la sala ordenada', true),
        item('Cocina', 'Limpiar estufa, horno y microondas', true, true), item('Habitaciones', 'Cambiar sábanas y fundas', true),
        item('Baños', 'Desinfectar inodoro, lavamanos y ducha', true, true), item('Baños', 'Reponer papel, jabón y toallas', true),
        item('Cierre', 'Sacar la basura y dejar bolsas nuevas'),
      ],
    }),
    template('ct_out', {
      name: 'Revisión de salida', description: 'Al check-out: inventario y daños antes de limpiar.',
      items: [item('Inventario', 'Contar toallas y ropa de cama', true), item('Daños', 'Fotografiar cualquier daño o mancha', true)],
    }),
  ];
}

function seedBuildings(tenant: string): Building[] {
  return (DEMO_BUILDINGS[tenant] ?? []).map((b) => ({
    id: b.id, name: b.name, address: null, zone: b.zone, lat: null, lng: null, notes: null, is_active: true,
    properties_count: 0, created_at: now(), updated_at: now(),
  }));
}

function seedProperties(tenant: string): Stored[] {
  const people = peopleOf(tenant);
  const ref = (id: string): PersonRef[] => {
    const p = people.find((x) => x.id === id);
    return p ? [{ user_id: p.id, full_name: p.name }] : [];
  };
  const buildings = DEMO_BUILDINGS[tenant] ?? [];
  return (DEMO_PROPERTY_ROWS[tenant] ?? []).map((r, i) => {
    const b = buildings.find((x) => x.id === r.building) ?? null;
    return {
      ...emptyProperty(seededPropertyId(tenant, i), r.code, r.name, r.type),
      building_id: b?.id ?? null,
      zone: r.zone ?? null,
      bedrooms: r.rooms[0],
      bathrooms: r.rooms[1],
      max_guests: r.rooms[2],
      is_active: r.active ?? true,
      checklist_template_id: 'ct_std',
      assigned: r.assigned.flatMap(ref),
      owners: (r.owners ?? []).flatMap(ref),
      access_text: r.access ?? null,
      access_info_updated_at: r.access ? now() : null,
    };
  });
}
