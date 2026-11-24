import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReservationsStore } from '../../store/reservations.store';
import { Guest, GuestDetail, RES_STATUS, Reservation } from '../../models/reservation.model';
import { CellDefDirective, DataTableComponent, TableColumn } from '../../../../shared/organisms/data-table/data-table.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';

/**
 * W-H5 · Huéspedes: directorio con búsqueda por nombre, correo o documento,
 * cuántas veces vinieron y la lista negra.
 */
@Component({
  selector: 'app-guests-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DataTableComponent, CellDefDirective, AvatarComponent, BadgeComponent, InputComponent, EmptyStateComponent],
  template: `
    <app-input class="mb-4 block min-w-0 lg:w-[360px]" type="search" icon="search" [compact]="true" placeholder="Nombre, correo o documento" ariaLabel="Buscar huéspedes" [value]="query()" (valueChange)="search($event)" />
    @if (store.guests() && !store.guests()!.length && !query()) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="team" title="Aún no hay huéspedes" message="Se agregan solos al crear reservas o al registrarlos en el check-in." />
      </div>
    } @else {
      <app-data-table [columns]="cols" [rows]="store.guests() ?? []" [rowKey]="key" [loading]="!store.guests()" [activeKey]="active()" (rowClick)="opened.emit($event.id)">
        <ng-template appCell="name" let-g>
          <div class="flex items-center gap-2.5">
            <app-avatar [initials]="g.full_name.slice(0, 1)" [name]="g.full_name" [size]="30" />
            <div class="min-w-0"><div class="truncate text-[13px] font-bold text-primary">{{ g.full_name }}</div><div class="truncate text-[11.5px] text-text-secondary">{{ g.email ?? 'Sin correo' }}</div></div>
          </div>
        </ng-template>
        <ng-template appCell="doc" let-g>
          @if (g.document_number) { <span class="font-mono text-[12px]">{{ g.document_number }}</span> } @else { <span class="text-text-muted">—</span> }
        </ng-template>
        <ng-template appCell="last" let-g>{{ g.last_stay ? (asDate(g.last_stay) | date: 'd MMM y') : '—' }}</ng-template>
        <ng-template appCell="flag" let-g>
          @if (g.blacklisted) {
            <app-badge tone="danger" size="sm" icon="ban">Lista negra</app-badge>
          } @else if (g.next_stay) {
            <app-badge tone="info" size="sm">Llega {{ asDate(g.next_stay) | date: 'd MMM' }}</app-badge>
          } @else if (g.stays > 1) {
            <app-badge tone="validated" size="sm" icon="star">Frecuente</app-badge>
          }
        </ng-template>
      </app-data-table>
    }
  `,
})
export class GuestsPanelComponent {
  protected readonly store = inject(ReservationsStore);
  readonly active = input<string | null>(null);
  readonly opened = output<string>();

  protected readonly query = signal('');
  private timer: ReturnType<typeof setTimeout> | undefined;
  protected readonly key = (g: Guest) => g.id;
  protected readonly cols: TableColumn<Guest>[] = [
    { key: 'name', label: 'Huésped', sortable: true, value: (g) => g.full_name },
    { key: 'nationality', label: 'País', sortable: true, priority: 'md', width: '80px', value: (g) => g.nationality ?? '' },
    { key: 'doc', label: 'Documento', priority: 'lg' },
    { key: 'stays', label: 'Estancias', sortable: true, align: 'right', width: '100px', value: (g) => g.stays },
    { key: 'last', label: 'Última salida', sortable: true, priority: 'md', value: (g) => g.last_stay ?? '' },
    { key: 'flag', label: '' },
  ];

  constructor() {
    if (!this.store.guests()) void this.store.loadGuests();
  }

  protected asDate(k: string): Date {
    return new Date(`${k}T12:00:00`);
  }

  protected search(q: string): void {
    this.query.set(q);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.store.loadGuests(q.trim()), 250);
  }
}

/**
 * Ficha del huésped (drawer de W-H5): contacto y documento, estancias, notas
 * y lista negra con su motivo.
 */
@Component({
  selector: 'app-guest-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, AvatarComponent, BadgeComponent, ButtonComponent, CheckboxComponent, IconComponent, InputComponent, SelectComponent, FormFieldComponent],
  template: `
    @let g = guest();
    <div class="flex min-h-full flex-col">
      <div class="flex-1 px-6 pb-6 pt-1">
        <div class="flex items-center gap-3">
          <app-avatar [initials]="g.full_name.slice(0, 1)" [name]="g.full_name" [size]="52" />
          <div class="min-w-0">
            <h2 class="font-display text-[22px] font-semibold leading-tight text-primary">{{ g.full_name }}</h2>
            <p class="text-[12.5px] text-text-secondary">{{ g.stays }} {{ g.stays === 1 ? 'estancia' : 'estancias' }}{{ g.nationality ? ' · ' + g.nationality : '' }}</p>
          </div>
        </div>
        @if (g.blacklisted) {
          <p class="mt-4 flex gap-2 rounded-field border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[12.5px] text-danger">
            <app-icon name="ban" [size]="16" class="mt-0.5 shrink-0" /> En lista negra{{ g.blacklist_reason ? ': ' + g.blacklist_reason : '.' }} No se le pueden crear reservas.
          </p>
        }
        @if (editing()) {
          <div class="mt-5 grid gap-3">
            <app-form-field label="Nombre" for="gd-name" [required]="true"><app-input inputId="gd-name" [compact]="true" [(value)]="fName" /></app-form-field>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <app-form-field label="Correo" for="gd-mail" [error]="fieldError('body.email')"><app-input inputId="gd-mail" type="email" [compact]="true" [(value)]="fEmail" /></app-form-field>
              <app-form-field label="Teléfono" for="gd-tel"><app-input inputId="gd-tel" type="tel" [compact]="true" [(value)]="fPhone" /></app-form-field>
            </div>
            <div class="grid grid-cols-[110px_1fr_70px] gap-3">
              <app-form-field label="Documento"><app-select [compact]="true" [options]="docTypes" [(value)]="fDocType" ariaLabel="Tipo de documento" /></app-form-field>
              <app-form-field label="Número" for="gd-doc" [error]="fieldError('body.document_number')"><app-input inputId="gd-doc" [compact]="true" [maxlength]="32" [(value)]="fDoc" /></app-form-field>
              <app-form-field label="País" for="gd-nat"><app-input inputId="gd-nat" [compact]="true" [maxlength]="2" [(value)]="fNat" /></app-form-field>
            </div>
            <app-form-field label="Notas" for="gd-notes" [optional]="true">
              <textarea id="gd-notes" rows="2" class="field-native" maxlength="2000" [value]="fNotes()" (input)="fNotes.set($any($event.target).value)"></textarea>
            </app-form-field>
            @if (store.canGuestsManage()) {
              <app-checkbox [(checked)]="fBlack">En lista negra</app-checkbox>
              @if (fBlack()) {
                <app-input [compact]="true" [maxlength]="500" placeholder="Motivo (lo ve quien intente reservarle)" ariaLabel="Motivo de la lista negra" [(value)]="fReason" />
              }
            }
            @if (generalError(); as e) { <p class="text-[12.5px] font-bold text-danger">{{ e }}</p> }
          </div>
        } @else {
          <dl class="mt-5 grid grid-cols-1 gap-2.5 rounded-card border border-border-card p-4 text-[13px]">
            <div class="flex justify-between gap-3"><dt class="text-text-secondary">Correo</dt><dd class="truncate text-primary">{{ g.email ?? '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-text-secondary">Teléfono</dt><dd class="tabular text-primary">{{ g.phone ?? '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-text-secondary">{{ g.document_type === 'passport' ? 'Pasaporte' : 'DPI' }}</dt><dd class="font-mono text-primary">{{ g.document_number ?? '—' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-text-secondary">Fotos del documento</dt><dd class="text-primary">{{ g.documents.length ? 'Guardadas' : 'No hay' }}</dd></div>
          </dl>
          @if (g.notes) { <p class="mt-3 whitespace-pre-line text-[13px] text-text-body">{{ g.notes }}</p> }
        }
        <h3 class="mb-2 mt-7 text-[12px] font-bold uppercase tracking-[1px] text-text-secondary">Estancias</h3>
        <ul class="divide-y divide-divider rounded-card border border-border-card">
          @for (r of g.reservations; track r.id) {
            <li>
              <button type="button" class="row flex w-full items-center gap-3 px-3.5 py-2.5 text-left" (click)="openReservation.emit(r.id)">
                <span class="font-mono text-[11.5px] text-text-secondary">{{ r.property_code }}</span>
                <span class="min-w-0 flex-1 truncate text-[13px] text-primary">{{ asDate(r.check_in_date) | date: 'd MMM' }} → {{ asDate(r.check_out_date) | date: 'd MMM y' }}</span>
                <app-badge [tone]="st(r).tone" size="sm">{{ st(r).label }}</app-badge>
              </button>
            </li>
          } @empty {
            <li class="px-3.5 py-3 text-[12.5px] text-text-secondary">Todavía no tiene estancias.</li>
          }
        </ul>
      </div>
      @if (store.canRegister()) {
        <div class="material-glass sticky bottom-0 flex justify-end gap-2.5 border-t border-divider px-6 py-4">
          @if (editing()) {
            <app-button variant="tertiary" (pressed)="editing.set(false)">Cancelar</app-button>
            <app-button variant="primary" [loading]="store.busy() === 'guest'" (pressed)="save()">Guardar</app-button>
          } @else {
            <app-button variant="secondary" (pressed)="edit()"><app-icon name="pencil" [size]="15" /> Editar</app-button>
          }
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
export class GuestDetailComponent {
  protected readonly store = inject(ReservationsStore);
  readonly guest = input.required<GuestDetail>();
  readonly openReservation = output<string>();

  protected readonly docTypes = [{ value: 'dpi', label: 'DPI' }, { value: 'passport', label: 'Pasaporte' }];
  protected readonly editing = signal(false);
  protected readonly fName = signal('');
  protected readonly fEmail = signal('');
  protected readonly fPhone = signal('');
  protected readonly fDocType = signal('dpi');
  protected readonly fDoc = signal('');
  protected readonly fNat = signal('');
  protected readonly fNotes = signal('');
  protected readonly fBlack = signal(false);
  protected readonly fReason = signal('');
  protected readonly st = (r: Reservation) => RES_STATUS[r.status];
  protected readonly generalError = computed(() => {
    const e = this.store.saveError();
    return e && !e.errors.length ? e.detail : null;
  });

  constructor() {
    let last = '';
    effect(() => {
      const id = this.guest().id;
      untracked(() => {
        if (id !== last) this.editing.set(false);
        last = id;
      });
    });
  }

  protected asDate(k: string): Date {
    return new Date(`${k}T12:00:00`);
  }
  protected fieldError(loc: string): string | null {
    return this.store.saveError()?.errors.find((e) => e.location === loc)?.message ?? null;
  }

  protected edit(): void {
    const g = this.guest();
    this.store.clearSaveError();
    this.fName.set(g.full_name);
    this.fEmail.set(g.email ?? '');
    this.fPhone.set(g.phone ?? '');
    this.fDocType.set(g.document_type ?? 'dpi');
    this.fDoc.set(g.document_number ?? '');
    this.fNat.set(g.nationality ?? '');
    this.fNotes.set(g.notes ?? '');
    this.fBlack.set(g.blacklisted);
    this.fReason.set(g.blacklist_reason ?? '');
    this.editing.set(true);
  }

  protected async save(): Promise<void> {
    const g = this.guest();
    const doc = this.fDoc().trim();
    const v = (s: string) => s.trim() || null;
    const patch: Record<string, unknown> = {
      full_name: this.fName().trim(), email: v(this.fEmail()), phone: v(this.fPhone()), nationality: v(this.fNat().toUpperCase()),
      notes: v(this.fNotes()), document_type: doc ? this.fDocType() : null, document_number: doc || null,
    };
    if (this.store.canGuestsManage() && (this.fBlack() !== g.blacklisted || (this.fBlack() && this.fReason() !== (g.blacklist_reason ?? '')))) {
      patch['blacklisted'] = this.fBlack();
      patch['blacklist_reason'] = this.fBlack() ? v(this.fReason()) : null;
    }
    if (await this.store.saveGuest(g.id, patch)) this.editing.set(false);
  }
}
