import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';
import { Page } from '../../../core/http/page';

/**
 * Contrato de la administración de ARGOS (fase01.md §3.7: `/platform/*`,
 * RequirePlatformAdmin). Solo existe contra el backend real: no hay mock.
 */

export type PlatformFeature = 'reservations' | 'parking' | 'shared_areas' | 'guest_chat' | 'payroll' | 'smart_locks';

export const PLATFORM_FEATURES: readonly { readonly key: PlatformFeature; readonly label: string; readonly hint: string }[] = [
  { key: 'reservations', label: 'Reservas', hint: 'Calendario, huéspedes, depósitos y canales' },
  { key: 'parking', label: 'Parqueos', hint: 'Espacios, placas y asignación por reserva' },
  { key: 'shared_areas', label: 'Áreas comunes', hint: 'Piscina, gimnasio y salones con horario' },
  { key: 'guest_chat', label: 'Chat con huéspedes', hint: 'Mensajes desde la app del huésped' },
  { key: 'payroll', label: 'Nómina', hint: 'Planilla quincenal, IGSS y boletas' },
  { key: 'smart_locks', label: 'Cerraduras inteligentes', hint: 'Códigos de acceso por estancia' },
];

export interface PlatformTenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly schema_name: string;
  readonly is_active: boolean;
  readonly timezone: string;
  readonly currency: string;
  readonly logo_url: string | null;
  readonly features: Readonly<Record<PlatformFeature, boolean>>;
  readonly members: number;
  readonly active_members: number;
  readonly last_activity: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface TenantDraft {
  readonly name: string;
  readonly slug: string;
  readonly timezone?: string;
  readonly admin_email?: string;
  readonly features: Partial<Record<PlatformFeature, boolean>>;
}

export interface TenantChanges {
  readonly name?: string;
  readonly is_active?: boolean;
  readonly features?: Partial<Record<PlatformFeature, boolean>>;
}

export interface PlatformAuditEntry {
  readonly id: string;
  readonly actor_id: string | null;
  readonly actor_name: string | null;
  readonly actor_email: string | null;
  readonly tenant_id: string | null;
  readonly tenant_name: string | null;
  readonly action: string;
  readonly entity: string;
  readonly entity_id: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly ip: string | null;
  readonly created_at: string;
}

@Injectable({ providedIn: 'root' })
export class PlatformApi {
  private readonly http = inject(ApiClient);

  tenants(): Promise<readonly PlatformTenant[]> {
    return this.http.get<readonly PlatformTenant[]>('/platform/tenants', { limit: 1000 });
  }

  create(draft: TenantDraft): Promise<PlatformTenant> {
    return this.http.post<PlatformTenant>('/platform/tenants', draft);
  }

  update(id: string, changes: TenantChanges): Promise<PlatformTenant> {
    return this.http.patch<PlatformTenant>(`/platform/tenants/${id}`, changes);
  }

  audit(filter: { tenant_id?: string; action?: string; limit?: number; offset?: number }): Promise<Page<PlatformAuditEntry>> {
    const params: Record<string, string | number> = { limit: filter.limit ?? 100, offset: filter.offset ?? 0 };
    if (filter.tenant_id) params['tenant_id'] = filter.tenant_id;
    if (filter.action) params['action'] = filter.action;
    return this.http.get<Page<PlatformAuditEntry>>('/platform/audit', params);
  }
}
