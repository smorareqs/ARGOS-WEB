import { Injectable, computed, inject, signal } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { ToastService } from '../../../core/services/toast.service';
import { FilesApi } from '../../../core/http/files-api';
import { AuditApi, AuditRecord } from '../../../core/http/audit-api';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { PersonOption, PropertiesApi } from '../services/properties-api.service';
import { AccessInfo, Building, ChecklistTemplate, Property, PropertyPatch } from '../models/property.model';

/**
 * Tienda de la ficha de propiedad (W-C2). Carga la propiedad por código y lo
 * que necesitan sus pestañas: edificios y plantillas (editar), personas
 * (asignados y propietarios, con users.read) e historial (con audit.read).
 */
@Injectable()
export class PropertyPageStore {
  private readonly api = inject(PropertiesApi);
  private readonly files = inject(FilesApi);
  private readonly audit = inject(AuditApi);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);

  private readonly _property = signal<Property | null>(null);
  private readonly _all = signal<readonly Property[]>([]);
  private readonly _buildings = signal<readonly Building[]>([]);
  private readonly _templates = signal<readonly ChecklistTemplate[]>([]);
  private readonly _people = signal<readonly PersonOption[]>([]);
  private readonly _history = signal<readonly AuditRecord[] | null>(null);
  private readonly _loading = signal(true);
  private readonly _notFound = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _saving = signal<string | null>(null);
  private readonly _saveError = signal<ApiError | null>(null);
  private readonly _access = signal<AccessInfo | null>(null);
  private readonly _accessLoading = signal(false);
  private readonly _accessError = signal<string | null>(null);

  readonly property = this._property.asReadonly();
  readonly all = this._all.asReadonly();
  readonly buildings = this._buildings.asReadonly();
  readonly templates = this._templates.asReadonly();
  readonly people = this._people.asReadonly();
  readonly history = this._history.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly notFound = this._notFound.asReadonly();
  readonly error = this._error.asReadonly();
  /** Qué se está guardando ('datos', 'equipo', 'foto'…) o null. */
  readonly saving = this._saving.asReadonly();
  readonly saveError = this._saveError.asReadonly();
  readonly access = this._access.asReadonly();
  readonly accessLoading = this._accessLoading.asReadonly();
  readonly accessError = this._accessError.asReadonly();

  readonly canManage = computed(() => this.session.can('properties.manage'));
  readonly canSeeAccess = computed(() => this.session.can('properties.access_info'));
  readonly canAudit = computed(() => this.session.can('audit.read'));

  readonly template = computed(() => {
    const id = this._property()?.checklist_template_id;
    return id ? (this._templates().find((t) => t.id === id) ?? null) : null;
  });

  /** Quién consultó el acceso, de la bitácora (lo más reciente primero). */
  readonly accessViews = computed(() => (this._history() ?? []).filter((r) => r.action === 'property.access_viewed'));

  async load(code: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    this._notFound.set(false);
    this._access.set(null);
    this._history.set(null);
    try {
      const [all, buildings, templates] = await Promise.all([
        this.api.list(),
        this.api.buildings(),
        this.api.templates().catch(() => [] as readonly ChecklistTemplate[]),
      ]);
      this._all.set(all);
      this._buildings.set(buildings);
      this._templates.set(templates);
      const p = all.find((x) => x.code.toUpperCase() === code.toUpperCase()) ?? null;
      this._property.set(p);
      this._notFound.set(!p);
      if (p) {
        void this.loadPeople();
        void this.loadHistory();
      }
    } catch (err) {
      this._error.set(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }

  async loadHistory(): Promise<void> {
    const p = this._property();
    if (!p || !this.canAudit()) return;
    try {
      this._history.set(await this.audit.all({ property_id: p.id }, 300));
    } catch {
      this._history.set([]);
    }
  }

  private async loadPeople(): Promise<void> {
    if (!this.canManage()) return;
    try {
      this._people.set(await this.api.people());
    } catch {
      this._people.set([]);
    }
  }

  clearSaveError(): void {
    this._saveError.set(null);
  }

  /** Guarda un PATCH; devuelve true si salió bien. */
  async update(patch: PropertyPatch, what = 'datos', message = 'Cambios guardados.'): Promise<boolean> {
    const p = this._property();
    if (!p) return false;
    return this.run(what, async () => {
      this.replace(await this.api.update(p.id, patch));
      if (patch.access_info !== undefined) this._access.set(null);
      this.toast.success(message);
    });
  }

  async setTeam(kind: 'assigned' | 'owners', userIds: readonly string[]): Promise<boolean> {
    const p = this._property();
    if (!p) return false;
    return this.run('equipo', async () => {
      this.replace(kind === 'assigned' ? await this.api.setAssignees(p.id, userIds) : await this.api.setOwners(p.id, userIds));
      this.toast.success(kind === 'assigned' ? 'Asignados guardados.' : 'Propietarios guardados.');
    });
  }

  async uploadCover(file: File): Promise<boolean> {
    const p = this._property();
    if (!p) return false;
    return this.run('foto', async () => {
      const id = await this.files.upload(file, { module: 'properties', kind: 'cover', entityType: 'property', entityId: p.id });
      this.replace(await this.api.update(p.id, { cover_file_id: id }));
      this.toast.success('Foto actualizada.');
    });
  }

  async remove(): Promise<boolean> {
    const p = this._property();
    if (!p) return false;
    return this.run('borrar', async () => {
      await this.api.remove(p.id);
      this.toast.success(`Propiedad ${p.code} borrada.`);
    });
  }

  async revealAccess(): Promise<void> {
    const p = this._property();
    if (!p || this._accessLoading()) return;
    this._accessLoading.set(true);
    this._accessError.set(null);
    try {
      this._access.set(await this.api.accessInfo(p.id));
      void this.loadHistory();
    } catch (err) {
      this._accessError.set(toApiError(err).detail);
    } finally {
      this._accessLoading.set(false);
    }
  }

  private replace(p: Property): void {
    this._property.set(p);
    this._all.update((list) => list.map((x) => (x.id === p.id ? p : x)));
    void this.loadHistory();
  }

  private async run(what: string, fn: () => Promise<void>): Promise<boolean> {
    this._saving.set(what);
    this._saveError.set(null);
    try {
      await fn();
      return true;
    } catch (err) {
      const e = toApiError(err);
      this._saveError.set(e);
      if (!e.errors.length) this.toast.error(e.detail);
      return false;
    } finally {
      this._saving.set(null);
    }
  }
}
