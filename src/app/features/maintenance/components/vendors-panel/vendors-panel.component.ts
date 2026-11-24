import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MaintenanceStore } from '../../store/maintenance.store';
import { ASSET_STATUS, CATEGORY_META, TICKET_STATUS, Vendor, placeOf } from '../../models/maintenance.model';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { gtq } from '../../../../shared/utils/time';

/**
 * W-G4 · Proveedores: tarjetas con especialidad, contacto y lo que han
 * atendido (activos a cargo, incidencias, tiempo de respuesta, gasto del
 * año). Al abrir uno, su ficha lista activos e incidencias.
 */
@Component({
  selector: 'app-vendors-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, BadgeComponent, EmptyStateComponent],
  template: `
    @if (!store.loading() && !store.vendors().length) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="team" title="Sin proveedores" message="Agrega a quienes atienden elevadores, A/C, plomería o piscinas para asignarles incidencias y preventivos." />
      </div>
    } @else {
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (v of store.vendors(); track v.id; let n = $index) {
          <button type="button" class="vcard reveal rounded-card border border-border-card bg-surface p-5 text-left shadow-e1" [class.is-off]="!v.is_active" [style.--i]="n" (click)="opened.emit(v.id)">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[11px] uppercase tracking-[1.2px] text-secondary">{{ v.service_type ?? 'Servicio general' }}</span>
              @if (!v.is_active) { <app-badge tone="muted" size="sm">Inactivo</app-badge> }
              @if (v.open_tickets) { <app-badge tone="warning" size="sm">{{ v.open_tickets }} {{ v.open_tickets === 1 ? 'abierta' : 'abiertas' }}</app-badge> }
            </div>
            <h3 class="mt-1 font-display text-[19px] font-semibold text-primary">{{ v.name }}</h3>
            <p class="mt-1 flex flex-wrap gap-x-3 text-[12.5px] text-text-secondary">
              @if (v.contact_name) { <span>{{ v.contact_name }}</span> }
              @if (v.phone) { <span class="inline-flex items-center gap-1"><app-icon name="phone" [size]="13" />{{ v.phone }}</span> }
            </p>
            <dl class="mt-4 grid grid-cols-3 gap-2 border-t border-divider pt-4 text-center">
              <div><dt class="text-[10.5px] uppercase tracking-[0.8px] text-text-secondary">Activos</dt><dd class="tabular mt-1 font-display text-[20px] font-semibold text-primary">{{ v.assets_count }}</dd></div>
              <div><dt class="text-[10.5px] uppercase tracking-[0.8px] text-text-secondary">Atendidas</dt><dd class="tabular mt-1 font-display text-[20px] font-semibold text-primary">{{ v.tickets_done }}</dd></div>
              <div><dt class="text-[10.5px] uppercase tracking-[0.8px] text-text-secondary">Resuelve en</dt><dd class="tabular mt-1 font-display text-[20px] font-semibold text-primary">{{ v.avg_hours === null ? '—' : hours(v.avg_hours) }}</dd></div>
            </dl>
            <p class="mt-3 text-[12px] text-text-secondary">Gasto en el año: <b class="tabular text-primary">{{ money(v.spend_year) }}</b></p>
          </button>
        }
      </div>
    }
  `,
  styles: `
    .vcard { transition: box-shadow var(--dur-base), transform var(--spring-standard-dur) var(--spring-standard); }
    .vcard:hover { box-shadow: var(--shadow-e2); transform: translateY(-2px); }
    .vcard.is-off { opacity: 0.7; }
    @media (prefers-reduced-motion: reduce) { .vcard { transition: none; } }
  `,
})
export class VendorsPanelComponent {
  protected readonly store = inject(MaintenanceStore);
  readonly opened = output<string>();
  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly hours = (h: number) => (h >= 48 ? `${Math.round(h / 24)} d` : `${Math.round(h)} h`);
}

/**
 * Ficha de un proveedor (drawer de W-G4): contacto, activos a su cargo e
 * incidencias que atiende o atendió.
 */
@Component({
  selector: 'app-vendor-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, IconComponent, BadgeComponent],
  template: `
    @let v = vendor();
    <div class="flex min-h-full flex-col">
      <div class="flex-1 px-6 pb-6 pt-1">
        <div class="text-[11px] uppercase tracking-[1.4px] text-secondary">{{ v.service_type ?? 'Servicio general' }}</div>
        <h2 class="mt-0.5 font-display text-[22px] font-semibold text-primary">{{ v.name }}</h2>
        <div class="mt-3 flex flex-col gap-1.5 text-[13px] text-text-body">
          @if (v.contact_name) { <span class="inline-flex items-center gap-2"><app-icon name="user-plus" [size]="15" class="text-text-secondary" />{{ v.contact_name }}</span> }
          @if (v.phone) { <a class="inline-flex items-center gap-2 hover:text-primary" [href]="'tel:' + v.phone.replace(' ', '')"><app-icon name="phone" [size]="15" class="text-text-secondary" />{{ v.phone }}</a> }
          @if (v.email) { <a class="inline-flex items-center gap-2 hover:text-primary" [href]="'mailto:' + v.email"><app-icon name="mail" [size]="15" class="text-text-secondary" />{{ v.email }}</a> }
        </div>
        @if (v.notes) { <p class="mt-3 whitespace-pre-line text-[13px] text-text-body">{{ v.notes }}</p> }

        <h3 class="mb-2 mt-7 text-[12px] font-bold uppercase tracking-[1px] text-text-secondary">Activos a su cargo</h3>
        <ul class="divide-y divide-divider rounded-card border border-border-card">
          @for (a of assets(); track a.id) {
            <li>
              <button type="button" class="row flex w-full items-center gap-3 px-3.5 py-2.5 text-left" (click)="openAsset.emit(a.id)">
                <app-icon [name]="cat[a.category].icon" [size]="16" class="shrink-0 text-teal-muted" />
                <span class="min-w-0 flex-1 truncate text-[13px] font-bold text-primary">{{ a.name }} <span class="text-[11.5px] font-normal text-text-secondary" [class.font-mono]="!!a.property_code">{{ where(a) }}</span></span>
                <app-badge [tone]="st[a.status].tone" size="sm">{{ st[a.status].label }}</app-badge>
              </button>
            </li>
          } @empty {
            <li class="px-3.5 py-3 text-[12.5px] text-text-secondary">Ningún activo lo tiene como proveedor.</li>
          }
        </ul>

        <h3 class="mb-2 mt-7 text-[12px] font-bold uppercase tracking-[1px] text-text-secondary">Incidencias</h3>
        <ul class="divide-y divide-divider rounded-card border border-border-card">
          @for (t of tickets(); track t.id) {
            <li>
              <button type="button" class="row flex w-full items-center gap-3 px-3.5 py-2.5 text-left" (click)="openTicket.emit(t.id)">
                <span class="font-mono text-[11.5px] text-text-secondary">#{{ t.number }}</span>
                <span class="min-w-0 flex-1 truncate text-[13px] font-bold text-primary">{{ t.title }}</span>
                @if (t.cost) { <span class="tabular text-[12px]">{{ money(t.cost) }}</span> }
                <app-badge [tone]="ts[t.status].tone" size="sm">{{ ts[t.status].label }}</app-badge>
              </button>
            </li>
          } @empty {
            <li class="px-3.5 py-3 text-[12.5px] text-text-secondary">Todavía no atiende incidencias.</li>
          }
        </ul>
      </div>
      @if (store.canManage()) {
        <div class="material-glass sticky bottom-0 flex justify-end gap-2.5 border-t border-divider px-6 py-4">
          <app-button variant="ghost" (pressed)="toggle()">{{ v.is_active ? 'Desactivar' : 'Reactivar' }}</app-button>
          <app-button variant="secondary" (pressed)="edit.emit(v)"><app-icon name="pencil" [size]="15" /> Editar</app-button>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100%; }
    .row { transition: background var(--dur-fast); }
    .row:hover { background: var(--color-surface-soft); }
  `,
})
export class VendorDetailComponent {
  protected readonly store = inject(MaintenanceStore);
  readonly vendor = input.required<Vendor>();
  readonly edit = output<Vendor>();
  readonly openAsset = output<string>();
  readonly openTicket = output<string>();

  protected readonly cat = CATEGORY_META;
  protected readonly st = ASSET_STATUS;
  protected readonly ts = TICKET_STATUS;
  protected readonly where = placeOf;
  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly assets = computed(() => this.store.assets().filter((a) => a.vendor_id === this.vendor().id));
  protected readonly tickets = computed(() => this.store.tickets().filter((t) => t.vendor_id === this.vendor().id).slice(0, 20));

  protected toggle(): void {
    void this.store.saveVendor(this.vendor().id, { is_active: !this.vendor().is_active });
  }
}
