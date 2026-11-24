import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';
import { SessionStore } from '../../../core/store/session.store';
import {
  AccessInfo,
  Building,
  BuildingDraft,
  ChecklistTemplate,
  Page,
  Property,
  PropertyDraft,
  PropertyPatch,
  TemplateDraft,
} from '../models/property.model';

/** Persona de la empresa para los selectores (de `/tenants/{id}/members`). */
export interface PersonOption {
  readonly user_id: string;
  readonly full_name: string;
  readonly email: string;
  readonly role_key: string;
  readonly role_name: string;
  readonly status: 'active' | 'suspended' | 'invited';
}

export interface PropertyQuery {
  readonly q?: string;
  readonly building_id?: string;
  readonly active?: boolean;
  readonly assignee?: string;
  readonly owner?: string;
}

/**
 * Servicio puro de propiedades, edificios y plantillas de checklist
 * (fase02.md §4). Sin estado. Rechaza con ApiError (422 con `errors[]` por
 * campo, p. ej. `body.code`). Se elige en app.config: la API real o el mock
 * del modo demo (MOCK_MODULES.properties).
 */
export abstract class PropertiesApi {
  abstract list(q?: PropertyQuery): Promise<Property[]>;
  abstract get(id: string): Promise<Property>;
  abstract create(draft: PropertyDraft): Promise<Property>;
  abstract update(id: string, patch: PropertyPatch): Promise<Property>;
  abstract remove(id: string): Promise<void>;
  abstract accessInfo(id: string): Promise<AccessInfo>;
  abstract setAssignees(id: string, userIds: readonly string[]): Promise<Property>;
  abstract setOwners(id: string, userIds: readonly string[]): Promise<Property>;
  abstract setUserAssignments(userId: string, propertyIds: readonly string[]): Promise<{ property_ids: string[] }>;
  abstract setUserOwnerships(userId: string, propertyIds: readonly string[]): Promise<{ property_ids: string[] }>;
  abstract buildings(): Promise<readonly Building[]>;
  abstract createBuilding(draft: BuildingDraft): Promise<Building>;
  abstract updateBuilding(id: string, patch: Partial<BuildingDraft>): Promise<Building>;
  abstract removeBuilding(id: string): Promise<void>;
  abstract templates(): Promise<readonly ChecklistTemplate[]>;
  abstract createTemplate(draft: TemplateDraft): Promise<ChecklistTemplate>;
  abstract updateTemplate(id: string, patch: Partial<TemplateDraft>): Promise<ChecklistTemplate>;
  abstract removeTemplate(id: string): Promise<void>;
  abstract people(): Promise<readonly PersonOption[]>;
}

@Injectable()
export class HttpPropertiesApi extends PropertiesApi {
  private readonly http = inject(ApiClient);
  private readonly session = inject(SessionStore);

  /** Todas las propiedades del alcance (sigue el cursor). */
  async list(q: PropertyQuery = {}): Promise<Property[]> {
    const out: Property[] = [];
    let cursor: string | null = null;
    do {
      const params: Record<string, string | number> = { limit: 500 };
      if (q.q) params['q'] = q.q;
      if (q.building_id) params['building_id'] = q.building_id;
      if (q.active !== undefined) params['active'] = String(q.active);
      if (q.assignee) params['assignee'] = q.assignee;
      if (q.owner) params['owner'] = q.owner;
      if (cursor) params['cursor'] = cursor;
      const page: Page<Property> = await this.http.get<Page<Property>>('/properties', params);
      out.push(...page.items);
      cursor = page.next_cursor;
    } while (cursor);
    return out;
  }

  get(id: string): Promise<Property> {
    return this.http.get<Property>(`/properties/${id}`);
  }


  create(draft: PropertyDraft): Promise<Property> {
    return this.http.post<Property>('/properties', draft);
  }

  update(id: string, patch: PropertyPatch): Promise<Property> {
    return this.http.patch<Property>(`/properties/${id}`, patch);
  }

  remove(id: string): Promise<void> {
    return this.http.delete<void>(`/properties/${id}`);
  }

  accessInfo(id: string): Promise<AccessInfo> {
    return this.http.get<AccessInfo>(`/properties/${id}/access-info`);
  }

  setAssignees(id: string, userIds: readonly string[]): Promise<Property> {
    return this.http.put<Property>(`/properties/${id}/assignments`, { user_ids: userIds });
  }

  setOwners(id: string, userIds: readonly string[]): Promise<Property> {
    return this.http.put<Property>(`/properties/${id}/owners`, { user_ids: userIds });
  }

  /** Reemplaza las propiedades asignadas a una persona (ficha del colaborador). */
  setUserAssignments(userId: string, propertyIds: readonly string[]): Promise<{ property_ids: string[] }> {
    return this.http.put(`/property-assignments/${userId}`, { property_ids: propertyIds });
  }

  setUserOwnerships(userId: string, propertyIds: readonly string[]): Promise<{ property_ids: string[] }> {
    return this.http.put(`/property-owners/${userId}`, { property_ids: propertyIds });
  }

  // --- Edificios -------------------------------------------------------------

  async buildings(): Promise<readonly Building[]> {
    return (await this.http.get<Page<Building>>('/buildings')).items;
  }

  createBuilding(draft: BuildingDraft): Promise<Building> {
    return this.http.post<Building>('/buildings', draft);
  }

  updateBuilding(id: string, patch: Partial<BuildingDraft>): Promise<Building> {
    return this.http.patch<Building>(`/buildings/${id}`, patch);
  }

  removeBuilding(id: string): Promise<void> {
    return this.http.delete<void>(`/buildings/${id}`);
  }

  // --- Plantillas de checklist ------------------------------------------------

  async templates(): Promise<readonly ChecklistTemplate[]> {
    return (await this.http.get<Page<ChecklistTemplate>>('/checklist-templates')).items;
  }

  createTemplate(draft: TemplateDraft): Promise<ChecklistTemplate> {
    return this.http.post<ChecklistTemplate>('/checklist-templates', draft);
  }

  updateTemplate(id: string, patch: Partial<TemplateDraft>): Promise<ChecklistTemplate> {
    return this.http.patch<ChecklistTemplate>(`/checklist-templates/${id}`, patch);
  }

  removeTemplate(id: string): Promise<void> {
    return this.http.delete<void>(`/checklist-templates/${id}`);
  }

  // --- Personas (selectores) --------------------------------------------------

  /** Personas de la empresa (requiere users.read). */
  async people(): Promise<readonly PersonOption[]> {
    const tenant = this.session.tenant()?.id;
    if (!tenant || !this.session.can('users.read')) return [];
    return (await this.http.get<Page<PersonOption>>(`/tenants/${tenant}/members`)).items;
  }
}
