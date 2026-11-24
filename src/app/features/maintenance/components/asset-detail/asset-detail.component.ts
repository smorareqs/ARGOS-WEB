import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MaintenanceStore } from '../../store/maintenance.store';
import { ASSET_STATUS, AssetDetail, AssetStatus, CATEGORY_META, DUE_META, Plan, TICKET_STATUS, frequencyLabel, placeOf } from '../../models/maintenance.model';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { dayKey, gtq } from '../../../../shared/utils/time';

/**
 * Ficha del activo (drawer de W-G2): datos y garantía, estado (cambiarlo
 * levanta o resuelve la alerta de falla), documentos, preventivos e
 * incidencias con su costo.
 */
@Component({
  selector: 'app-asset-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ButtonComponent, IconComponent, BadgeComponent, SelectComponent],
  template: `
    @let a = asset();
    <div class="flex min-h-full flex-col">
      <div class="flex-1 px-6 pb-6 pt-1">
        <div class="flex items-start gap-4">
          <span class="cat flex h-14 w-14 shrink-0 items-center justify-center rounded-hero"><app-icon [name]="cat[a.category].icon" [size]="26" /></span>
          <div class="min-w-0 flex-1">
            <div class="text-[11px] uppercase tracking-[1.4px] text-secondary">{{ cat[a.category].label }}</div>
            <h2 class="mt-0.5 font-display text-[22px] font-semibold leading-tight text-primary">{{ a.name }}</h2>
            <p class="mt-1 text-[12.5px] text-text-secondary"><span class="font-bold text-primary" [class.font-mono]="!!a.property_code">{{ where(a) }}</span>{{ a.property_name ? ' · ' + a.property_name : a.building_name && !a.property_id ? ' · edificio completo' : '' }}</p>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-3">
          @if (store.canManage()) {
            <app-select class="w-[220px]" [compact]="true" [options]="statusOptions" [value]="a.status" (changed)="setStatus($any($event))" ariaLabel="Estado del activo" />
          } @else {
            <app-badge [tone]="st[a.status].tone">{{ st[a.status].label }}</app-badge>
          }
          @if (a.status !== 'operational') { <span class="text-[12px] text-text-secondary">Tiene una alerta abierta mientras no opere.</span> }
        </div>

        <dl class="mt-5 grid grid-cols-2 gap-x-5 gap-y-3.5 rounded-card border border-border-card p-4 text-[13px]">
          @for (f of facts(); track f.label) {
            <div class="min-w-0"><dt class="text-[11px] uppercase tracking-[0.8px] text-text-secondary">{{ f.label }}</dt><dd class="mt-0.5 truncate font-bold text-primary" [class.!text-danger]="f.bad">{{ f.value }}</dd></div>
          }
        </dl>
        <div class="mt-3 grid grid-cols-3 gap-3 text-center">
          <div class="rounded-card bg-surface-soft p-3"><div class="tabular font-display text-[20px] font-semibold text-primary">{{ a.open_tickets }}</div><div class="text-[11px] text-text-secondary">abiertas</div></div>
          <div class="rounded-card bg-surface-soft p-3"><div class="tabular font-display text-[20px] font-semibold text-primary">{{ a.tickets_count }}</div><div class="text-[11px] text-text-secondary">incidencias</div></div>
          <div class="rounded-card bg-surface-soft p-3"><div class="tabular font-display text-[20px] font-semibold text-primary">{{ money(a.cost_year) }}</div><div class="text-[11px] text-text-secondary">gasto del año</div></div>
        </div>
        @if (a.notes) { <p class="mt-3 whitespace-pre-line text-[13px] text-text-body">{{ a.notes }}</p> }

        <!-- Documentos -->
        <section class="mt-7">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-[12px] font-bold uppercase tracking-[1px] text-text-secondary">Documentos</h3>
            @if (store.canManage()) {
              <label class="upload inline-flex cursor-pointer items-center gap-1.5 rounded-field px-2.5 py-1.5 text-[12px] font-bold" [class.opacity-60]="store.busy() === 'document'">
                <app-icon name="upload" [size]="14" /> {{ store.busy() === 'document' ? 'Subiendo…' : 'Adjuntar' }}
                <input type="file" class="sr-only" accept="application/pdf,image/png,image/jpeg,image/webp" [disabled]="store.busy() === 'document'" (change)="attach($event)" />
              </label>
            }
          </div>
          @if (a.documents.length) {
            <ul class="divide-y divide-divider rounded-card border border-border-card">
              @for (d of a.documents; track d.file_id) {
                <li class="flex items-center gap-3 px-3.5 py-2.5">
                  <app-icon name="file" [size]="18" class="shrink-0 text-teal-muted" />
                  <a [href]="d.url" target="_blank" rel="noopener" class="min-w-0 flex-1">
                    <span class="block truncate text-[13px] font-bold text-primary hover:underline">{{ d.name }}</span>
                    <span class="text-[11.5px] text-text-secondary">{{ size(d.size_bytes) }} · {{ d.created_at | date: 'd MMM y' }}</span>
                  </a>
                  @if (store.canManage()) {
                    <app-button variant="icon" size="sm" [ariaLabel]="'Quitar ' + d.name" (pressed)="remove(d.file_id, d.name)"><app-icon name="trash" [size]="15" /></app-button>
                  }
                </li>
              }
            </ul>
          } @else {
            <p class="rounded-card bg-surface-soft px-4 py-3 text-[12.5px] text-text-secondary">Sube el manual, la garantía o la factura (PDF o foto, hasta 15 MB).</p>
          }
        </section>

        <!-- Preventivos -->
        <section class="mt-7">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-[12px] font-bold uppercase tracking-[1px] text-text-secondary">Preventivos</h3>
            @if (store.canManage()) { <app-button variant="link" size="sm" (pressed)="newPlan.emit(a.id)"><app-icon name="plus" [size]="14" /> Nuevo</app-button> }
          </div>
          @if (a.plans.length) {
            <ul class="flex flex-col gap-2">
              @for (p of a.plans; track p.id) {
                <li>
                  <button type="button" class="row flex w-full items-center gap-3 rounded-card border border-border-card px-3.5 py-2.5 text-left" [disabled]="!store.canManage()" (click)="editPlan.emit(p)">
                    <div class="min-w-0 flex-1">
                      <div class="truncate text-[13px] font-bold text-primary">{{ p.name }}</div>
                      <div class="truncate text-[11.5px] text-text-secondary">{{ freq(p.frequency_days) }}@if (p.vendor_name) { · {{ p.vendor_name }} }@if (p.responsible_name) { · {{ p.responsible_name }} }</div>
                    </div>
                    <div class="text-right">
                      <app-badge [tone]="due[p.due_state].tone" size="sm">{{ due[p.due_state].label }}</app-badge>
                      <div class="tabular mt-0.5 text-[11.5px] text-text-secondary">{{ asDate(p.next_due_at) | date: 'd MMM y' }}</div>
                    </div>
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="rounded-card bg-surface-soft px-4 py-3 text-[12.5px] text-text-secondary">Sin preventivo. Agrégale uno y el sistema crea su incidencia antes de que toque.</p>
          }
        </section>

        <!-- Incidencias -->
        <section class="mt-7">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-[12px] font-bold uppercase tracking-[1px] text-text-secondary">Incidencias</h3>
            @if (store.canReport() && a.property_id) { <app-button variant="link" size="sm" (pressed)="report.emit(a)"><app-icon name="plus" [size]="14" /> Reportar</app-button> }
          </div>
          @if (a.tickets.length) {
            <ul class="divide-y divide-divider rounded-card border border-border-card">
              @for (t of a.tickets; track t.id) {
                <li>
                  <button type="button" class="row flex w-full items-center gap-3 px-3.5 py-2.5 text-left" (click)="openTicket.emit(t.id)">
                    <span class="font-mono text-[11.5px] text-text-secondary">#{{ t.number }}</span>
                    <span class="min-w-0 flex-1 truncate text-[13px] font-bold text-primary">{{ t.title }}</span>
                    @if (t.cost) { <span class="tabular text-[12px] text-text-body">{{ money(t.cost) }}</span> }
                    <app-badge [tone]="ts[t.status].tone" size="sm">{{ ts[t.status].label }}</app-badge>
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="rounded-card bg-surface-soft px-4 py-3 text-[12.5px] text-text-secondary">Nunca ha fallado.</p>
          }
        </section>
      </div>

      @if (store.canManage()) {
        <div class="material-glass sticky bottom-0 flex flex-wrap justify-end gap-2.5 border-t border-divider px-6 py-4">
          <app-button variant="ghost" (pressed)="toggleActive()">{{ a.is_active ? 'Dar de baja' : 'Reactivar' }}</app-button>
          <app-button variant="secondary" (pressed)="edit.emit(a)"><app-icon name="pencil" [size]="15" /> Editar</app-button>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100%; }
    .cat { background: var(--color-teal-washed); color: var(--color-teal-muted); }
    .upload { color: var(--color-teal-muted); }
    .upload:hover { color: var(--color-primary); background: var(--color-surface-soft); }
    .row { transition: background var(--dur-fast); }
    .row:not(:disabled):hover { background: var(--color-surface-soft); }
  `,
})
export class AssetDetailComponent {
  protected readonly store = inject(MaintenanceStore);
  private readonly confirm = inject(ConfirmService);

  readonly asset = input.required<AssetDetail>();
  readonly edit = output<AssetDetail>();
  readonly newPlan = output<string>();
  readonly editPlan = output<Plan>();
  readonly openTicket = output<string>();
  readonly report = output<AssetDetail>();

  protected readonly cat = CATEGORY_META;
  protected readonly st = ASSET_STATUS;
  protected readonly ts = TICKET_STATUS;
  protected readonly due = DUE_META;
  protected readonly where = placeOf;
  protected readonly freq = frequencyLabel;
  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly asDate = (d: string) => new Date(`${d}T12:00:00`);
  protected readonly statusOptions = (Object.keys(ASSET_STATUS) as AssetStatus[]).map((s) => ({ value: s, label: ASSET_STATUS[s].label }));

  protected readonly facts = computed(() => {
    const a = this.asset();
    const fmt = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
    const warrantyOver = !!a.warranty_until && a.warranty_until < dayKey();
    return [
      { label: 'Marca', value: a.brand ?? '—', bad: false },
      { label: 'Modelo', value: a.model ?? '—', bad: false },
      { label: 'Serie', value: a.serial ?? '—', bad: false },
      { label: 'Ubicación', value: a.location ?? '—', bad: false },
      { label: 'Instalado', value: fmt(a.installed_at), bad: false },
      { label: warrantyOver ? 'Garantía vencida' : 'Garantía hasta', value: fmt(a.warranty_until), bad: warrantyOver },
      { label: 'Proveedor', value: a.vendor_name ?? '—', bad: false },
      { label: 'Próximo preventivo', value: fmt(a.next_due_at), bad: !!a.next_due_at && a.next_due_at < dayKey() },
    ];
  });

  protected setStatus(s: AssetStatus): void {
    if (s !== this.asset().status) void this.store.saveAsset(this.asset().id, { status: s });
  }

  protected async toggleActive(): Promise<void> {
    const a = this.asset();
    if (a.is_active) {
      const ok = await this.confirm.ask({
        title: `Dar de baja ${a.name}`, message: 'Deja de aparecer al reportar y sus preventivos se pausan. Conserva su historial.',
        confirmLabel: 'Dar de baja', tone: 'danger',
      });
      if (!ok) return;
    }
    void this.store.saveAsset(a.id, { is_active: !a.is_active });
  }

  protected attach(e: Event): void {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (f) void this.store.attachDocument(this.asset().id, f);
  }

  protected async remove(fileId: string, name: string): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Quitar documento', message: `${name} deja de estar en la ficha.`, confirmLabel: 'Quitar', tone: 'danger' });
    if (ok) void this.store.removeDocument(this.asset().id, fileId);
  }

  protected size(bytes: number): string {
    return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}
