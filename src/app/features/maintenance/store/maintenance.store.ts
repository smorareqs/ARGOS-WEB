import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { SessionStore } from '../../../core/store/session.store';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { MaintenanceApi, TicketAction } from '../services/maintenance-api.service';
import { PropertiesApi } from '../../properties/services/properties-api.service';
import { Building, Property } from '../../properties/models/property.model';
import {
  ACTIVE_STATUSES, Asset, AssetDetail, AssetDraft, AssetPatch, AssignDraft, Assignable, Metrics, Plan, PlanDraft, PlanPatch,
  ResolveDraft, Ticket, TicketDetail, TicketDraft, TicketPatch, Vendor, VendorDraft, VendorPatch,
} from '../models/maintenance.model';

/**
 * Tienda de Mantenimiento (W-G1–W-G5). Vive con la pantalla: carga
 * incidencias, activos, preventivos y proveedores juntos (el tablero, las
 * fichas y los selectores se cruzan) y los indicadores al abrir su pestaña.
 */
@Injectable()
export class MaintenanceStore {
  private readonly api = inject(MaintenanceApi);
  private readonly propertiesApi = inject(PropertiesApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);

  readonly tickets = signal<readonly Ticket[]>([]);
  readonly assets = signal<readonly Asset[]>([]);
  readonly plans = signal<readonly Plan[]>([]);
  readonly vendors = signal<readonly Vendor[]>([]);
  readonly assignables = signal<readonly Assignable[]>([]);
  readonly properties = signal<readonly Property[]>([]);
  readonly buildings = signal<readonly Building[]>([]);
  readonly metrics = signal<Metrics | null>(null);

  readonly ticket = signal<TicketDetail | null>(null);
  readonly asset = signal<AssetDetail | null>(null);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  /** Qué se está guardando: 'create', 'asset', 'vendor', 'plan' o el id del ticket. */
  readonly busy = signal<string | null>(null);
  readonly saveError = signal<ApiError | null>(null);

  readonly canManage = computed(() => this.session.can('maintenance.manage'));
  readonly canAssign = computed(() => this.session.canAny(['maintenance.assign', 'maintenance.manage']));
  readonly canExecute = computed(() => this.session.can('maintenance.execute'));
  readonly canReport = computed(() => this.session.can('maintenance.report'));
  readonly meId = computed(() => this.session.user()?.id ?? null);

  readonly open = computed(() => this.tickets().filter((t) => ACTIVE_STATUSES.includes(t.status)));
  readonly overduePlans = computed(() => this.plans().filter((p) => p.due_state === 'overdue'));
  readonly activeVendors = computed(() => this.vendors().filter((v) => v.is_active));

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [tickets, assets, plans, vendors, properties, buildings] = await Promise.all([
        this.api.tickets(), this.api.assets(), this.api.plans(), this.api.vendors(),
        this.propertiesApi.list({ active: true }).catch(() => [] as Property[]),
        this.propertiesApi.buildings().catch(() => [] as Building[]),
      ]);
      this.tickets.set(tickets);
      this.assets.set(assets);
      this.plans.set(plans);
      this.vendors.set(vendors);
      this.properties.set(properties);
      this.buildings.set(buildings);
      if (this.canAssign()) this.assignables.set(await this.api.assignables().catch(() => []));
    } catch (err) {
      this.error.set(toApiError(err).detail);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMetrics(): Promise<void> {
    try {
      this.metrics.set(await this.api.metrics());
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    }
  }

  clearSaveError(): void {
    this.saveError.set(null);
  }

  // --- Incidencias -----------------------------------------------------------------

  async openTicket(id: string): Promise<void> {
    if (this.ticket()?.id !== id) this.ticket.set(null);
    try {
      this.ticket.set(await this.api.ticket(id));
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    }
  }

  closeTicket(): void {
    this.ticket.set(null);
  }

  async createTicket(d: TicketDraft): Promise<TicketDetail | null> {
    const t = await this.save('create', () => this.api.createTicket(d));
    if (t) {
      this.upsertTicket(t);
      this.toast.success(`Incidencia #${t.number} reportada.`);
    }
    return t;
  }

  updateTicket(id: string, p: TicketPatch): Promise<boolean> {
    return this.ticketStep(id, () => this.api.updateTicket(id, p), 'Incidencia actualizada.');
  }

  assign(id: string, d: AssignDraft): Promise<boolean> {
    return this.ticketStep(id, () => this.api.assign(id, d), 'Asignación guardada.');
  }

  start(id: string): Promise<boolean> {
    return this.ticketStep(id, () => this.api.start(id), 'Incidencia en curso.');
  }

  resolve(id: string, d: ResolveDraft): Promise<boolean> {
    return this.ticketStep(id, () => this.api.resolve(id, d), 'Incidencia resuelta.', true);
  }

  act(id: string, action: TicketAction, reason?: string): Promise<boolean> {
    const msg: Record<TicketAction, string> = { close: 'Incidencia cerrada.', reject: 'Incidencia rechazada.', reopen: 'Incidencia reabierta.' };
    return this.ticketStep(id, () => this.api.act(id, action, reason), msg[action]);
  }

  uploadPhoto(file: File, kind: 'ticket_photo' | 'ticket_resolution'): Promise<string> {
    return this.api.uploadPhoto(file, kind);
  }

  /** Arrastre en el tablero: solo los pasos sin formulario. */
  async move(t: Ticket, to: string): Promise<void> {
    if (to === 'in_progress' && (t.status === 'open' || t.status === 'assigned')) {
      await this.start(t.id);
    } else if (to === 'closed' && t.status === 'resolved') {
      await this.act(t.id, 'close');
    }
  }

  private async ticketStep(id: string, fn: () => Promise<TicketDetail>, message: string, refreshCatalog = false): Promise<boolean> {
    const t = await this.save(id, fn, true);
    if (!t) return false;
    this.upsertTicket(t);
    if (this.ticket()?.id === id) this.ticket.set(t);
    this.toast.success(message);
    if (refreshCatalog) void this.refreshCatalog();
    return true;
  }

  private upsertTicket(t: Ticket): void {
    this.tickets.update((list) => (list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [t, ...list]));
  }

  /** Resolver mueve preventivos y estados de activos: se releen. */
  private async refreshCatalog(): Promise<void> {
    const [assets, plans] = await Promise.all([this.api.assets(), this.api.plans()]).catch(() => [this.assets(), this.plans()] as const);
    this.assets.set(assets);
    this.plans.set(plans);
  }

  // --- Activos y preventivos -----------------------------------------------------

  async openAsset(id: string): Promise<void> {
    if (this.asset()?.id !== id) this.asset.set(null);
    try {
      this.asset.set(await this.api.asset(id));
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    }
  }

  closeAsset(): void {
    this.asset.set(null);
  }

  async saveAsset(id: string | null, d: AssetDraft | AssetPatch): Promise<Asset | null> {
    const a = await this.save('asset', () => (id ? this.api.updateAsset(id, d as AssetPatch) : this.api.createAsset(d as AssetDraft)));
    if (!a) return null;
    this.assets.update((list) => (list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? a : x)) : [a, ...list]));
    if (this.asset()?.id === a.id) void this.openAsset(a.id);
    this.toast.success(id ? 'Activo guardado.' : 'Activo dado de alta.');
    return a;
  }

  async attachDocument(assetId: string, file: File): Promise<void> {
    this.busy.set('document');
    try {
      await this.api.attachDocument(assetId, file);
      await this.openAsset(assetId);
      this.toast.success('Documento adjunto.');
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this.busy.set(null);
    }
  }

  async removeDocument(assetId: string, fileId: string): Promise<void> {
    try {
      await this.api.removeDocument(assetId, fileId);
      await this.openAsset(assetId);
      this.toast.success('Documento quitado.');
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    }
  }

  async savePlan(assetId: string, planId: string | null, d: PlanDraft | PlanPatch): Promise<Plan | null> {
    const p = await this.save('plan', () => (planId ? this.api.updatePlan(assetId, planId, d) : this.api.createPlan(assetId, d as PlanDraft)));
    if (!p) return null;
    this.plans.update((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p]));
    if (this.asset()?.id === assetId) void this.openAsset(assetId);
    this.toast.success(planId ? 'Preventivo guardado.' : 'Preventivo creado.');
    return p;
  }

  // --- Proveedores ---------------------------------------------------------------

  async saveVendor(id: string | null, d: VendorDraft | VendorPatch): Promise<Vendor | null> {
    const v = await this.save('vendor', () => (id ? this.api.updateVendor(id, d) : this.api.createVendor(d as VendorDraft)));
    if (!v) return null;
    this.vendors.update((list) => (list.some((x) => x.id === v.id) ? list.map((x) => (x.id === v.id ? v : x)) : [...list, v]));
    this.toast.success(id ? 'Proveedor guardado.' : 'Proveedor dado de alta.');
    return v;
  }

  /** Guarda con estado de ocupado; los errores de campo quedan en saveError (o en un toast). */
  private async save<T>(key: string, fn: () => Promise<T>, toastErrors = false): Promise<T | null> {
    this.busy.set(key);
    this.saveError.set(null);
    try {
      return await fn();
    } catch (err) {
      const e = toApiError(err);
      if (toastErrors) this.toast.error(e.detail);
      else this.saveError.set(e);
      return null;
    } finally {
      this.busy.set(null);
    }
  }
}
