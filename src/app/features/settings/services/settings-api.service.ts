import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';
import { FilesApi } from '../../../core/http/files-api';
import { Page } from '../../../core/http/page';
import { FeatureFlag, Permission } from '../../../core/auth/permissions';
import { SessionStore } from '../../../core/store/session.store';

/**
 * Contrato de configuración de la empresa (fase01.md §3.7:
 * `/tenants/{id}/settings`, `/tenants/{id}/roles`) · W-O1, W-O3, W-O4.
 */

export interface CompanySettings {
  readonly name: string;
  readonly legal_name: string;
  readonly nit: string;
  readonly logo_url: string | null;
  readonly timezone: string;
  readonly currency: string;
  readonly checkin_time: string;
  readonly checkout_time: string;
  readonly checkout_alarm_minutes: number;
  readonly guest_instructions: string;
  /** Solo lectura: las define el plan (las cambia ARGOS). */
  readonly features: Readonly<Partial<Record<FeatureFlag | 'smart_locks', boolean>>>;
}

/** Campos que la empresa puede cambiar (los omitidos no cambian). */
export type CompanyChanges = Partial<Omit<CompanySettings, 'logo_url' | 'features'>> & {
  readonly logo_file_id?: string;
  readonly remove_logo?: boolean;
};

export interface RoleDef {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  /** Los siete de sistema los mantiene ARGOS: solo lectura. */
  readonly is_system: boolean;
  readonly scoped: boolean;
  readonly members: number;
  readonly permissions: readonly Permission[];
}

export interface RoleDraft {
  readonly name: string;
  readonly description?: string | null;
  readonly permissions: readonly Permission[];
  /** Solo ve sus propiedades asignadas o propias (fase02 §3). */
  readonly scoped?: boolean;
}

/** Servicio puro de configuración. Sin estado. */
export abstract class SettingsApi {
  abstract company(): Promise<CompanySettings>;
  abstract saveCompany(changes: CompanyChanges): Promise<CompanySettings>;
  abstract uploadLogo(file: File, onProgress?: (pct: number) => void): Promise<CompanySettings>;
  abstract removeLogo(): Promise<CompanySettings>;
  abstract roles(): Promise<readonly RoleDef[]>;
  abstract createRole(draft: RoleDraft): Promise<RoleDef>;
  abstract updateRole(id: string, changes: Partial<RoleDraft>): Promise<RoleDef>;
  abstract deleteRole(id: string): Promise<void>;
}

@Injectable()
export class HttpSettingsApi extends SettingsApi {
  private readonly http = inject(ApiClient);
  private readonly files = inject(FilesApi);
  private readonly session = inject(SessionStore);

  private get base(): string {
    return `/tenants/${this.session.tenant()?.id}`;
  }

  company(): Promise<CompanySettings> {
    return this.http.get<CompanySettings>(`${this.base}/settings`);
  }
  saveCompany(changes: CompanyChanges): Promise<CompanySettings> {
    return this.http.patch<CompanySettings>(`${this.base}/settings`, changes);
  }
  async uploadLogo(file: File, onProgress?: (pct: number) => void): Promise<CompanySettings> {
    const id = await this.files.upload(file, { module: 'tenant', kind: 'logo' }, onProgress);
    return this.saveCompany({ logo_file_id: id });
  }
  removeLogo(): Promise<CompanySettings> {
    return this.saveCompany({ remove_logo: true });
  }
  async roles(): Promise<readonly RoleDef[]> {
    return (await this.http.get<Page<RoleDef>>(`${this.base}/roles`)).items;
  }
  createRole(draft: RoleDraft): Promise<RoleDef> {
    return this.http.post<RoleDef>(`${this.base}/roles`, draft);
  }
  updateRole(id: string, changes: Partial<RoleDraft>): Promise<RoleDef> {
    return this.http.patch<RoleDef>(`${this.base}/roles/${id}`, changes);
  }
  deleteRole(id: string): Promise<void> {
    return this.http.delete<void>(`${this.base}/roles/${id}`);
  }
}
