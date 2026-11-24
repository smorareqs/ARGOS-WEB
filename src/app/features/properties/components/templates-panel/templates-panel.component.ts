import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { ApiError, toApiError } from '../../../../core/http/api-error';
import { CanDirective } from '../../../../core/auth/can.directive';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SessionStore } from '../../../../core/store/session.store';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { SpotIconComponent } from '../../../../shared/atoms/spot-icon/spot-icon.component';
import { PropertiesApi } from '../../services/properties-api.service';
import { ChecklistTemplate, TemplateDraft } from '../../models/property.model';
import { ChecklistEditorComponent } from '../checklist-editor/checklist-editor.component';

/**
 * Subpantalla · Plantillas de checklist (W-C4). Cada plantilla muestra sus
 * secciones, cuántos puntos piden foto y cuántas propiedades la usan. Abrirla
 * lleva al editor (drawer ancho con vista previa de la app); "Duplicar" crea
 * una copia para adaptarla a otra propiedad.
 */
@Component({
  selector: 'app-templates-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CanDirective, EmptyStateComponent, DrawerComponent, BadgeComponent, ButtonComponent, IconComponent, SpotIconComponent, ChecklistEditorComponent],
  template: `
    @if (loading()) {
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        @for (i of [0, 1]; track i) {
          <div class="skeleton h-[168px] !rounded-card"></div>
        }
      </div>
    } @else if (error(); as e) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="error" title="No pudimos cargar las plantillas" [message]="e">
          <app-button variant="secondary" (pressed)="load()"><app-icon name="refresh" [size]="16" /> Reintentar</app-button>
        </app-empty-state>
      </div>
    } @else if (!templates().length) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="done" title="Aún no hay plantillas" message="Una plantilla dice qué revisar en cada limpieza y qué fotos pedir.">
          <app-button *argosCan="'properties.manage'" variant="primary" (pressed)="openCreate()"><app-icon name="plus" [size]="16" /> Nueva plantilla</app-button>
        </app-empty-state>
      </div>
    } @else {
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        @for (t of templates(); track t.id; let i = $index) {
          <article class="card reveal flex flex-col rounded-card border border-border-card bg-surface shadow-e1" [style.--i]="i">
            <button type="button" class="flex flex-1 items-start gap-4 p-5 text-left" (click)="openEdit(t)" [disabled]="!canManage()">
              <app-spot-icon name="cleaning" [size]="52" />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-display text-[19px] font-semibold leading-tight text-primary">{{ t.name }}</span>
                  @if (t.is_default) {
                    <app-badge tone="success" icon="check" size="sm">Por defecto</app-badge>
                  }
                </div>
                @if (t.description) {
                  <p class="mt-0.5 text-[12.5px] text-text-body">{{ t.description }}</p>
                }
                <div class="mt-3 flex flex-wrap gap-1.5">
                  @for (s of sectionsOf(t); track s) {
                    <span class="rounded-xs bg-teal-washed px-2 py-0.5 text-[11px] font-semibold text-teal-muted">{{ s }}</span>
                  }
                </div>
              </div>
            </button>
            <div class="flex items-center gap-4 border-t border-divider px-5 py-3 text-[12px] text-text-secondary">
              <span><b class="tabular text-primary">{{ t.items.length }}</b> puntos</span>
              <span class="flex items-center gap-1"><app-icon name="camera" [size]="13" /> <b class="tabular text-primary">{{ photos(t) }}</b> con foto</span>
              <span><b class="tabular text-primary">{{ t.properties_count }}</b> {{ t.properties_count === 1 ? 'propiedad' : 'propiedades' }}</span>
              <span class="ml-auto flex gap-1" *argosCan="'properties.manage'">
                <app-button variant="icon" size="sm" [ariaLabel]="'Duplicar ' + t.name" (pressed)="duplicate(t)"><app-icon name="copy" [size]="15" /></app-button>
                <app-button variant="icon" size="sm" [ariaLabel]="'Borrar ' + t.name" (pressed)="remove(t)"><app-icon name="trash" [size]="15" /></app-button>
              </span>
            </div>
          </article>
        }
      </div>
    }

    <app-drawer [(open)]="editing" [label]="current() ? 'Editar plantilla' : 'Nueva plantilla'" [width]="980">
      @if (editing()) {
        <app-checklist-editor [initial]="current()" [saving]="saving()" [serverError]="saveError()" (submitted)="save($event)" (cancel)="editing.set(false)" />
      }
    </app-drawer>
  `,
  styles: `
    :host { display: block; }
    .card { transition: box-shadow var(--dur-base) var(--ease-standard), transform var(--spring-standard-dur) var(--spring-standard); }
    .card:hover { box-shadow: var(--shadow-e2); transform: translateY(-2px); }
    @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
  `,
})
export class TemplatesPanelComponent {
  private readonly api = inject(PropertiesApi);
  private readonly session = inject(SessionStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /** Avisa a la lista de propiedades (cambia el nombre de su checklist). */
  readonly changed = output<void>();

  protected readonly templates = signal<readonly ChecklistTemplate[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editing = signal(false);
  protected readonly current = signal<ChecklistTemplate | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<ApiError | null>(null);
  protected readonly canManage = computed(() => this.session.can('properties.manage'));

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.templates.set(await this.api.templates());
    } catch (e) {
      this.error.set(toApiError(e).detail);
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.current.set(null);
    this.saveError.set(null);
    this.editing.set(true);
  }

  protected openEdit(t: ChecklistTemplate): void {
    if (!this.canManage()) return;
    this.current.set(t);
    this.saveError.set(null);
    this.editing.set(true);
  }

  protected sectionsOf(t: ChecklistTemplate): string[] {
    return [...new Set(t.items.map((i) => i.section))];
  }

  protected photos(t: ChecklistTemplate): number {
    return t.items.filter((i) => i.requires_photo).length;
  }

  protected async save(draft: TemplateDraft): Promise<void> {
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const t = this.current();
      if (t) await this.api.updateTemplate(t.id, draft);
      else await this.api.createTemplate(draft);
      this.toast.success(t ? 'Plantilla guardada.' : `Plantilla ${draft.name} creada.`);
      this.editing.set(false);
      await this.load();
      this.changed.emit();
    } catch (e) {
      this.saveError.set(toApiError(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected async duplicate(t: ChecklistTemplate): Promise<void> {
    const names = new Set(this.templates().map((x) => x.name.toLowerCase()));
    let name = `Copia de ${t.name}`;
    for (let n = 2; names.has(name.toLowerCase()); n++) name = `Copia de ${t.name} (${n})`;
    try {
      const copy = await this.api.createTemplate({
        name,
        description: t.description,
        items: t.items.map(({ section, text, requires_photo, requires_before_after }) => ({ section, text, requires_photo, requires_before_after })),
      });
      await this.load();
      this.toast.success(`Creaste ${name}.`);
      this.openEdit(copy);
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    }
  }

  protected async remove(t: ChecklistTemplate): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Borrar ${t.name}?`,
      message: t.properties_count
        ? `${t.properties_count} ${t.properties_count === 1 ? 'propiedad quedará' : 'propiedades quedarán'} sin checklist. Las tareas en curso conservan su copia.`
        : 'Ninguna propiedad la usa. Las tareas en curso conservan su copia.',
      confirmLabel: 'Borrar plantilla',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await this.api.removeTemplate(t.id);
      this.toast.success('Plantilla borrada.');
      await this.load();
      this.changed.emit();
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    }
  }
}
