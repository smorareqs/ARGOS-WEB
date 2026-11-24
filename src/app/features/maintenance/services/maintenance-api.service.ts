import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';
import { FilesApi } from '../../../core/http/files-api';
import {
  AssetDetail, Asset, AssetDocument, AssetDraft, AssetPatch, AssignDraft, Assignable, Metrics, Plan, PlanDraft, PlanPatch,
  ResolveDraft, Ticket, TicketDetail, TicketDraft, TicketPatch, TicketQuery, Vendor, VendorDraft, VendorPatch,
} from '../models/maintenance.model';

interface Page<T> {
  readonly items: readonly T[];
  readonly next_cursor: string | null;
}

/** Acciones de administración con motivo o nota. */
export type TicketAction = 'close' | 'reject' | 'reopen';

/**
 * Servicio puro de mantenimiento (fase03.md §5). Sin estado. Las listas se
 * piden completas (hasta 500): el tablero y los selectores necesitan todo.
 */
export abstract class MaintenanceApi {
  abstract tickets(q?: TicketQuery): Promise<readonly Ticket[]>;
  abstract ticket(id: string): Promise<TicketDetail>;
  abstract createTicket(d: TicketDraft): Promise<TicketDetail>;
  abstract updateTicket(id: string, p: TicketPatch): Promise<TicketDetail>;
  abstract assign(id: string, d: AssignDraft): Promise<TicketDetail>;
  abstract start(id: string): Promise<TicketDetail>;
  abstract resolve(id: string, d: ResolveDraft): Promise<TicketDetail>;
  abstract act(id: string, action: TicketAction, reason?: string): Promise<TicketDetail>;
  abstract assignables(): Promise<readonly Assignable[]>;

  abstract assets(q?: { property_id?: string; building_id?: string; vendor_id?: string }): Promise<readonly Asset[]>;
  abstract asset(id: string): Promise<AssetDetail>;
  abstract createAsset(d: AssetDraft): Promise<Asset>;
  abstract updateAsset(id: string, p: AssetPatch): Promise<Asset>;
  abstract attachDocument(assetId: string, file: File): Promise<AssetDocument>;
  abstract removeDocument(assetId: string, fileId: string): Promise<void>;

  abstract plans(q?: { from?: string; to?: string }): Promise<readonly Plan[]>;
  abstract createPlan(assetId: string, d: PlanDraft): Promise<Plan>;
  abstract updatePlan(assetId: string, planId: string, p: PlanPatch): Promise<Plan>;

  abstract vendors(): Promise<readonly Vendor[]>;
  abstract createVendor(d: VendorDraft): Promise<Vendor>;
  abstract updateVendor(id: string, p: VendorPatch): Promise<Vendor>;

  abstract metrics(): Promise<Metrics>;
  /** Sube una foto de incidencia y devuelve su file_id (para photo_file_ids). */
  abstract uploadPhoto(file: File, kind: 'ticket_photo' | 'ticket_resolution'): Promise<string>;
}

@Injectable()
export class HttpMaintenanceApi extends MaintenanceApi {
  private readonly http = inject(ApiClient);
  private readonly files = inject(FilesApi);

  tickets(q: TicketQuery = {}): Promise<readonly Ticket[]> {
    return this.http.get<Page<Ticket>>('/tickets', { limit: 500, ...clean(q) }).then((p) => p.items);
  }
  ticket(id: string): Promise<TicketDetail> {
    return this.http.get<TicketDetail>(`/tickets/${id}`);
  }
  createTicket(d: TicketDraft): Promise<TicketDetail> {
    return this.http.post<TicketDetail>('/tickets', compact(d));
  }
  updateTicket(id: string, p: TicketPatch): Promise<TicketDetail> {
    return this.http.patch<TicketDetail>(`/tickets/${id}`, p);
  }
  assign(id: string, d: AssignDraft): Promise<TicketDetail> {
    return this.http.post<TicketDetail>(`/tickets/${id}/assign`, compact(d));
  }
  start(id: string): Promise<TicketDetail> {
    return this.http.post<TicketDetail>(`/tickets/${id}/start`);
  }
  resolve(id: string, d: ResolveDraft): Promise<TicketDetail> {
    return this.http.post<TicketDetail>(`/tickets/${id}/resolve`, compact(d));
  }
  act(id: string, action: TicketAction, reason?: string): Promise<TicketDetail> {
    return this.http.post<TicketDetail>(`/tickets/${id}/${action}`, reason ? { reason } : {});
  }
  assignables(): Promise<readonly Assignable[]> {
    return this.http.get<Page<Assignable>>('/maintenance/assignables').then((p) => p.items);
  }

  assets(q: { property_id?: string; building_id?: string; vendor_id?: string } = {}): Promise<readonly Asset[]> {
    return this.http.get<Page<Asset>>('/assets', { limit: 500, ...clean(q) }).then((p) => p.items);
  }
  asset(id: string): Promise<AssetDetail> {
    return this.http.get<AssetDetail>(`/assets/${id}`);
  }
  createAsset(d: AssetDraft): Promise<Asset> {
    return this.http.post<Asset>('/assets', compact(d));
  }
  updateAsset(id: string, p: AssetPatch): Promise<Asset> {
    return this.http.patch<Asset>(`/assets/${id}`, p);
  }
  async attachDocument(assetId: string, file: File): Promise<AssetDocument> {
    const fileId = await this.files.upload(file, { module: 'maintenance', kind: 'asset_document' });
    return this.http.post<AssetDocument>(`/assets/${assetId}/documents`, { file_id: fileId });
  }
  removeDocument(assetId: string, fileId: string): Promise<void> {
    return this.http.delete<void>(`/assets/${assetId}/documents/${fileId}`);
  }

  plans(q: { from?: string; to?: string } = {}): Promise<readonly Plan[]> {
    return this.http.get<Page<Plan>>('/maintenance/plans', clean(q)).then((p) => p.items);
  }
  createPlan(assetId: string, d: PlanDraft): Promise<Plan> {
    return this.http.post<Plan>(`/assets/${assetId}/plans`, compact(d));
  }
  updatePlan(assetId: string, planId: string, p: PlanPatch): Promise<Plan> {
    return this.http.patch<Plan>(`/assets/${assetId}/plans/${planId}`, p);
  }

  vendors(): Promise<readonly Vendor[]> {
    return this.http.get<Page<Vendor>>('/vendors').then((p) => p.items);
  }
  createVendor(d: VendorDraft): Promise<Vendor> {
    return this.http.post<Vendor>('/vendors', compact(d));
  }
  updateVendor(id: string, p: VendorPatch): Promise<Vendor> {
    return this.http.patch<Vendor>(`/vendors/${id}`, p);
  }

  metrics(): Promise<Metrics> {
    return this.http.get<Metrics>('/maintenance/metrics');
  }
  uploadPhoto(file: File, kind: 'ticket_photo' | 'ticket_resolution'): Promise<string> {
    return this.files.upload(file, { module: 'maintenance', kind });
  }
}

/** Los POST no aceptan null en campos opcionales (solo los PATCH): se omiten. */
function compact<T extends object>(body: T): Partial<T> {
  return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== null && v !== undefined)) as Partial<T>;
}

/** Quita los filtros vacíos de un query. */
function clean(q: object): Record<string, string> {
  return Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Record<string, string>;
}
