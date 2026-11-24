import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MaintenanceStore } from '../../store/maintenance.store';
import { ACTIVE_STATUSES, CATEGORY_META, TICKET_STATUS, TicketDetail, TicketEvent, URGENCY_META, placeOf } from '../../models/maintenance.model';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { PhotoPickerComponent } from '../../../../shared/molecules/photo-picker/photo-picker.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';
import { initials } from '../../../../core/store/session.store';
import { gtq } from '../../../../shared/utils/time';

const FIELD: Record<string, string> = { title: 'el título', description: 'la descripción', urgency: 'la urgencia', asset_id: 'el activo', cost: 'el costo' };

/**
 * Ficha de una incidencia (drawer de W-G1): qué pasa, fotos, responsables,
 * costo y línea de tiempo. Las acciones dependen del estado y del permiso:
 * asignar (maintenance.assign), iniciar y resolver (maintenance.execute),
 * cerrar, rechazar y reabrir (maintenance.manage). Rechazar y reabrir piden
 * motivo.
 */
@Component({
  selector: 'app-ticket-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ButtonComponent, IconComponent, BadgeComponent, AvatarComponent, SelectComponent, CheckboxComponent, FormFieldComponent, PhotoPickerComponent, RelativeDatePipe],
  template: `
    @let t = ticket();
    <div class="flex min-h-full flex-col">
      <div class="flex-1 px-6 pb-6 pt-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-mono text-[12px] font-bold text-text-secondary">#{{ t.number }}</span>
          <app-badge [tone]="status[t.status].tone" size="sm">{{ status[t.status].label }}</app-badge>
          <app-badge [tone]="urg[t.urgency].tone" size="sm">Urgencia {{ urg[t.urgency].label.toLowerCase() }}</app-badge>
          @if (t.plan_name) { <app-badge tone="info" size="sm">Preventivo</app-badge> }
        </div>
        <h2 class="mt-3 font-display text-[22px] font-semibold leading-tight text-primary">{{ t.title }}</h2>
        <p class="mt-1.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-text-secondary">
          <span class="font-bold text-primary" [class.font-mono]="!!t.property_code">{{ where(t) }}</span>
          @if (t.property_name) { <span>{{ t.property_name }}</span> }
          @if (t.asset_name) { <span class="inline-flex items-center gap-1">· <app-icon [name]="cat[t.asset_category ?? 'other'].icon" [size]="13" /> {{ t.asset_name }}</span> }
        </p>
        <p class="mt-1 text-[12px] text-text-secondary">
          {{ t.reporter_name ? 'Reportó ' + t.reporter_name : 'Lo generó el preventivo ' + (t.plan_name ?? '') }} · {{ t.created_at | relativeDate }}
        </p>
        @if (t.description) {
          <p class="mt-4 whitespace-pre-line text-[13.5px] leading-relaxed text-text-body">{{ t.description }}</p>
        }

        @if (t.photos.length) {
          <div class="mt-4 grid grid-cols-3 gap-2">
            @for (p of t.photos; track p.file_id) {
              <a class="photo relative block overflow-hidden rounded-tile" [href]="p.url" target="_blank" rel="noopener" [attr.aria-label]="'Abrir foto ' + ($index + 1)">
                <img [src]="p.url" alt="" class="aspect-square w-full object-cover" loading="lazy" />
                @if (p.stage === 'resolution') { <span class="absolute bottom-1 left-1 rounded-xs bg-success px-1.5 py-px text-[10px] font-bold text-white">Solución</span> }
              </a>
            }
          </div>
        }

        <!-- Responsables -->
        <section class="mt-6 rounded-card border border-border-card bg-surface-soft p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-[12px] font-bold uppercase tracking-[1px] text-text-secondary">Responsables</h3>
            @if (canAssignNow() && mode() !== 'assign') {
              <app-button variant="link" size="sm" (pressed)="startAssign()">{{ t.assignee_name || t.vendor_name ? 'Cambiar' : 'Asignar' }}</app-button>
            }
          </div>
          @if (mode() === 'assign') {
            <div class="mt-3 grid gap-3">
              <app-form-field label="Colaborador" [optional]="true">
                <app-select [compact]="true" [options]="assigneeOptions()" [(value)]="fAssignee" ariaLabel="Colaborador" />
              </app-form-field>
              <app-form-field label="Proveedor" [optional]="true">
                <app-select [compact]="true" [options]="vendorOptions()" [(value)]="fVendor" ariaLabel="Proveedor" />
              </app-form-field>
              <app-form-field label="Nota para quien la atiende" for="td-note" [optional]="true">
                <input id="td-note" class="field-native" maxlength="500" placeholder="Ej.: lleva escalera; el huésped llega a las 15:00" [value]="fNote()" (input)="fNote.set($any($event.target).value)" />
              </app-form-field>
              <p class="text-[12px] text-text-secondary">Asignarla a un colaborador le crea su tarea de mantenimiento en la app.</p>
              <div class="flex justify-end gap-2">
                <app-button variant="tertiary" size="sm" (pressed)="mode.set('view')">Cancelar</app-button>
                <app-button variant="primary" size="sm" [disabled]="!fAssignee() && !fVendor()" [loading]="busy()" (pressed)="saveAssign()">Guardar asignación</app-button>
              </div>
            </div>
          } @else {
            <div class="mt-3 flex flex-col gap-2.5">
              @if (t.assignee_name) {
                <div class="flex items-center gap-2.5 text-[13px]"><app-avatar [initials]="ini(t.assignee_name)" [name]="t.assignee_name" [size]="28" /><span class="font-bold text-primary">{{ t.assignee_name }}</span></div>
              }
              @if (t.vendor_name) {
                <div class="flex items-center gap-2.5 text-[13px]"><span class="vendor flex h-7 w-7 items-center justify-center rounded-pill"><app-icon name="building" [size]="14" /></span><span class="font-bold text-primary">{{ t.vendor_name }}</span><span class="text-text-secondary">proveedor</span></div>
              }
              @if (!t.assignee_name && !t.vendor_name) {
                <p class="text-[13px] font-bold text-danger">Nadie la atiende todavía.</p>
              }
            </div>
          }
        </section>

        <!-- Costo y solución -->
        <section class="mt-3 grid grid-cols-2 gap-3">
          <div class="rounded-card border border-border-card p-4">
            <div class="text-[11px] uppercase tracking-[1px] text-text-secondary">Costo</div>
            @if (editingCost()) {
              <div class="mt-2 flex items-center gap-2">
                <input class="field-native tabular !h-9 w-full" type="number" min="0" step="0.01" [value]="fCost()" (input)="fCost.set($any($event.target).value)" aria-label="Costo en quetzales" />
                <app-button variant="primary" size="sm" [loading]="busy()" (pressed)="saveCost()">OK</app-button>
              </div>
            } @else {
              <div class="mt-1 flex items-baseline gap-2">
                <span class="tabular font-display text-[22px] font-semibold text-primary">{{ t.cost === null ? '—' : money(t.cost) }}</span>
                @if (store.canManage()) { <app-button variant="link" size="sm" (pressed)="startCost()">Editar</app-button> }
              </div>
            }
          </div>
          <div class="rounded-card border border-border-card p-4">
            <div class="text-[11px] uppercase tracking-[1px] text-text-secondary">{{ t.resolved_at ? 'Resuelta' : 'Abierta hace' }}</div>
            <div class="mt-1 font-display text-[18px] font-semibold text-primary">{{ t.resolved_at ? (t.resolved_at | date: 'd MMM, HH:mm') : (t.created_at | relativeDate) }}</div>
          </div>
        </section>
        @if (t.resolution) {
          <p class="solution mt-3 rounded-card px-4 py-3 text-[13px] leading-relaxed"><b>Qué se hizo:</b> {{ t.resolution }}</p>
        }

        <!-- Resolver -->
        @if (mode() === 'resolve') {
          <section class="mt-5 rounded-card border border-border-card p-4" aria-label="Resolver la incidencia">
            <h3 class="font-display text-[16px] font-semibold text-primary">Resolver</h3>
            <div class="mt-3 grid gap-3">
              <app-form-field label="Qué se hizo" for="td-res" [required]="true" [error]="tried() && fResolution().trim().length < 3 ? 'Cuéntalo en una línea.' : null">
                <textarea id="td-res" rows="3" class="field-native" placeholder="Ej.: se cambió el empaque y se probó sin fugas" [value]="fResolution()" (input)="fResolution.set($any($event.target).value)"></textarea>
              </app-form-field>
              <app-form-field label="Costo (Q)" for="td-rcost" [optional]="true">
                <input id="td-rcost" class="field-native tabular" type="number" min="0" step="0.01" [value]="fCost()" (input)="fCost.set($any($event.target).value)" />
              </app-form-field>
              <app-photo-picker label="Fotos de la solución" [(files)]="fPhotos" />
              @if (t.asset_id) {
                <app-checkbox [(checked)]="fOperational">El activo vuelve a operar (resuelve su alerta)</app-checkbox>
              }
              <div class="flex justify-end gap-2">
                <app-button variant="tertiary" size="sm" (pressed)="mode.set('view')">Cancelar</app-button>
                <app-button variant="primary" size="sm" [loading]="busy()" (pressed)="saveResolve()"><app-icon name="check" [size]="15" /> Marcar resuelta</app-button>
              </div>
            </div>
          </section>
        }

        <!-- Línea de tiempo -->
        <h3 class="mb-3 mt-7 text-[12px] font-bold uppercase tracking-[1px] text-text-secondary">Historial</h3>
        <ol class="timeline relative ml-1.5 border-l border-divider pl-5">
          @for (e of t.events; track e.id) {
            <li class="relative pb-4 last:pb-0">
              <span class="dot absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-pill" [style.background]="dotOf(e)"></span>
              <div class="text-[13px] text-text-body"><b class="text-primary">{{ e.actor_name ?? 'El sistema' }}</b> {{ phrase(e) }}</div>
              @if (detailOf(e); as d) { <div class="mt-0.5 text-[12.5px] text-text-secondary">{{ d }}</div> }
              <div class="mt-0.5 text-[11.5px] text-text-muted">{{ e.created_at | date: 'd MMM, HH:mm' }}</div>
            </li>
          }
        </ol>
      </div>

      @if (actions().length) {
        <div class="material-glass sticky bottom-0 flex flex-wrap justify-end gap-2.5 border-t border-divider px-6 py-4">
          @for (a of actions(); track a.key) {
            <app-button [variant]="a.variant" [loading]="busy() && pending() === a.key" (pressed)="run(a.key)">{{ a.label }}</app-button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100%; }
    .photo { box-shadow: var(--shadow-e1); }
    .photo img { transition: transform var(--dur-base); }
    .photo:hover img { transform: scale(1.04); }
    .vendor { background: var(--color-teal-washed); color: var(--color-teal-muted); }
    .solution { background: var(--color-success-soft); color: var(--color-text-body); }
    .dot { box-shadow: 0 0 0 3px var(--color-surface); }
    @media (prefers-reduced-motion: reduce) { .photo img { transition: none; } }
  `,
})
export class TicketDetailComponent {
  protected readonly store = inject(MaintenanceStore);
  private readonly confirm = inject(ConfirmService);

  readonly ticket = input.required<TicketDetail>();

  protected readonly mode = signal<'view' | 'assign' | 'resolve'>('view');
  protected readonly pending = signal<string | null>(null);
  protected readonly editingCost = signal(false);
  protected readonly tried = signal(false);
  protected readonly fAssignee = signal('');
  protected readonly fVendor = signal('');
  protected readonly fNote = signal('');
  protected readonly fCost = signal('');
  protected readonly fResolution = signal('');
  protected readonly fPhotos = signal<readonly File[]>([]);
  protected readonly fOperational = signal(true);

  protected readonly status = TICKET_STATUS;
  protected readonly urg = URGENCY_META;
  protected readonly cat = CATEGORY_META;
  protected readonly ini = initials;
  protected readonly where = placeOf;
  protected readonly money = (v: number) => gtq(v);

  constructor() {
    // Otra incidencia: se cierra cualquier formulario abierto.
    effect(() => {
      this.ticket().id;
      untracked(() => {
        this.mode.set('view');
        this.editingCost.set(false);
        this.tried.set(false);
      });
    });
  }

  protected readonly busy = computed(() => this.store.busy() === this.ticket().id);
  protected readonly isActive = computed(() => ACTIVE_STATUSES.includes(this.ticket().status));
  protected readonly canAssignNow = computed(() => this.store.canAssign() && this.isActive());
  /** Quien atiende o administra; si está asignada a otra persona, solo administración. */
  protected readonly canWork = computed(() => {
    const t = this.ticket();
    return this.store.canExecute() && (!t.assigned_to || t.assigned_to === this.store.meId() || this.store.canAssign());
  });

  protected readonly assigneeOptions = computed(() => [
    { value: '', label: 'Sin colaborador' },
    ...this.store.assignables().map((a) => ({ value: a.user_id, label: `${a.full_name} · ${a.open_tickets} abiertas` })),
  ]);
  protected readonly vendorOptions = computed(() => [
    { value: '', label: 'Sin proveedor' },
    ...this.store.activeVendors().map((v) => ({ value: v.id, label: v.service_type ? `${v.name} · ${v.service_type}` : v.name })),
  ]);

  protected readonly actions = computed(() => {
    const t = this.ticket();
    const out: { key: string; label: string; variant: 'primary' | 'secondary' | 'ghost' | 'danger' }[] = [];
    if (this.mode() !== 'view') return out;
    if ((t.status === 'open' || t.status === 'assigned') && this.store.canManage()) out.push({ key: 'reject', label: 'Rechazar', variant: 'ghost' });
    if (t.status === 'resolved' && this.store.canManage()) out.push({ key: 'reopen', label: 'Reabrir', variant: 'ghost' });
    if (t.status === 'rejected' && this.store.canManage()) out.push({ key: 'reopen', label: 'Reabrir', variant: 'secondary' });
    if ((t.status === 'open' || t.status === 'assigned') && this.canWork()) out.push({ key: 'start', label: 'Iniciar', variant: 'secondary' });
    if (this.isActive() && this.canWork()) out.push({ key: 'resolve', label: 'Resolver', variant: 'primary' });
    if (t.status === 'resolved' && this.store.canManage()) out.push({ key: 'close', label: 'Cerrar', variant: 'primary' });
    return out;
  });

  protected startAssign(): void {
    const t = this.ticket();
    this.fAssignee.set(t.assigned_to ?? '');
    this.fVendor.set(t.vendor_id ?? '');
    this.fNote.set('');
    this.mode.set('assign');
  }

  protected async saveAssign(): Promise<void> {
    const ok = await this.store.assign(this.ticket().id, {
      assignee_id: this.fAssignee() || null, vendor_id: this.fVendor() || null, note: this.fNote().trim() || undefined,
    });
    if (ok) this.mode.set('view');
  }

  protected startCost(): void {
    this.fCost.set(this.ticket().cost === null ? '' : String(this.ticket().cost));
    this.editingCost.set(true);
  }

  protected async saveCost(): Promise<void> {
    const v = this.fCost().trim();
    const ok = await this.store.updateTicket(this.ticket().id, { cost: v === '' ? null : Number(v) });
    if (ok) this.editingCost.set(false);
  }

  protected async saveResolve(): Promise<void> {
    this.tried.set(true);
    if (this.fResolution().trim().length < 3) return;
    this.pending.set('resolve');
    try {
      const ids: string[] = [];
      for (const f of this.fPhotos()) ids.push(await this.store.uploadPhoto(f, 'ticket_resolution'));
      const cost = this.fCost().trim();
      const ok = await this.store.resolve(this.ticket().id, {
        resolution: this.fResolution().trim(), cost: cost === '' ? null : Number(cost), photo_file_ids: ids,
        asset_operational: !!this.ticket().asset_id && this.fOperational(),
      });
      if (ok) this.mode.set('view');
    } finally {
      this.pending.set(null);
    }
  }

  protected async run(key: string): Promise<void> {
    const id = this.ticket().id;
    this.pending.set(key);
    try {
      if (key === 'resolve') {
        this.fResolution.set('');
        this.fCost.set(this.ticket().cost === null ? '' : String(this.ticket().cost));
        this.fPhotos.set([]);
        this.fOperational.set(true);
        this.tried.set(false);
        this.mode.set('resolve');
      } else if (key === 'start') {
        await this.store.start(id);
      } else if (key === 'close') {
        await this.store.act(id, 'close');
      } else {
        const reason = await this.confirm.askReason({
          title: key === 'reject' ? 'Rechazar la incidencia' : 'Reabrir la incidencia',
          message: key === 'reject' ? 'Queda en el historial y quien la reportó lo ve.' : 'Vuelve a quien la tenía asignada.',
          confirmLabel: key === 'reject' ? 'Rechazar' : 'Reabrir',
          tone: key === 'reject' ? 'danger' : 'primary',
          reasons: key === 'reject' ? ['Está duplicada', 'No es una falla', 'Ya se resolvió'] : ['Volvió a fallar', 'Quedó incompleta'],
        });
        if (reason) await this.store.act(id, key as 'reject' | 'reopen', reason);
      }
    } finally {
      this.pending.set(null);
    }
  }

  protected phrase(e: TicketEvent): string {
    switch (e.type) {
      case 'created':
        return 'reportó la incidencia';
      case 'assigned':
        return 'asignó la incidencia';
      case 'started':
        return 'la inició';
      case 'resolved':
        return 'la marcó resuelta';
      case 'closed':
        return 'la cerró';
      case 'rejected':
        return 'la rechazó';
      case 'reopened':
        return 'la reabrió';
      default: {
        const fields = (e.data['fields'] as string[] | undefined) ?? [];
        return `corrigió ${fields.map((f) => FIELD[f] ?? f).join(', ') || 'los datos'}`;
      }
    }
  }

  protected detailOf(e: TicketEvent): string | null {
    const d = e.data;
    if (e.type === 'assigned') return [d['assignee_name'], d['vendor_name']].filter(Boolean).join(' y ') + (d['note'] ? ` · "${d['note']}"` : '') || null;
    if (e.type === 'resolved') return [d['resolution'], d['cost'] !== undefined ? gtq(Number(d['cost'])) : null].filter(Boolean).join(' · ') || null;
    if (e.type === 'rejected' || e.type === 'reopened' || e.type === 'closed') return (d['reason'] as string | undefined) ?? null;
    if (e.type === 'updated' && d['urgency']) return `Urgencia ${URGENCY_META[d['urgency'] as keyof typeof URGENCY_META]?.label.toLowerCase() ?? ''}`;
    return null;
  }

  protected dotOf(e: TicketEvent): string {
    const color: Partial<Record<TicketEvent['type'], string>> = {
      created: 'var(--color-danger)', assigned: 'var(--color-teal-muted)', started: 'var(--color-secondary)',
      resolved: 'var(--color-success)', closed: 'var(--color-text-muted)', rejected: 'var(--color-text-muted)',
    };
    return color[e.type] ?? 'var(--color-border-card)';
  }
}
