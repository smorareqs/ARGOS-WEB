import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReservationsStore } from '../../store/reservations.store';
import { DocumentType, Guest, MISSING_LABEL, ReservationDetail, ReservationGuest } from '../../models/reservation.model';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';

/**
 * Huéspedes de la reserva (W-H3): estado del registro de cada uno (correo,
 * documento y fotos de frente y reverso), registro en el check-in, "Ver
 * documento" solo con guests.documents (queda en la bitácora) y agregar
 * acompañantes buscando por nombre o documento.
 */
@Component({
  selector: 'app-reservation-guests',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, AvatarComponent, BadgeComponent, ButtonComponent, IconComponent, InputComponent, SelectComponent, FormFieldComponent],
  template: `
    @let r = reservation();
    @if (r.has_checkin && (r.status === 'pending' || r.status === 'confirmed')) {
      <p class="mb-4 flex gap-2 rounded-field bg-surface-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-text-body">
        <app-icon name="shield" [size]="16" class="mt-0.5 shrink-0 text-teal-muted" />
        Para el check-in cada huésped necesita correo, documento y fotos de frente y reverso. Las fotos se borran solas 90 días después de la salida.
      </p>
    }
    <ul class="space-y-3">
      @for (g of r.guests; track g.id) {
        <li class="rounded-card border border-border-card bg-surface p-4">
          <div class="flex items-start gap-3">
            <app-avatar [initials]="g.full_name.slice(0, 1)" [name]="g.full_name" [size]="40" />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-[14.5px] font-bold text-primary">{{ g.full_name }}</span>
                @if (g.is_primary) { <app-badge tone="info" size="sm">Principal</app-badge> }
                @if (g.blacklisted) { <app-badge tone="danger" size="sm" icon="ban">Lista negra</app-badge> }
              </div>
              @if (g.registered) {
                <div class="mt-1 flex items-center gap-1.5 text-[12.5px] font-bold text-success"><app-icon name="check-circle" [size]="14" /> Registro completo</div>
              } @else if (r.has_checkin && store.canGuests()) {
                <div class="mt-1 text-[12.5px] text-warning">Falta {{ missing(g) }}</div>
              }
            </div>
            @if (store.canRegister() && editing() !== g.id && open()) {
              <app-button variant="link" size="sm" (pressed)="edit(g)">{{ g.registered ? 'Editar' : 'Registrar' }}</app-button>
            }
          </div>
          @if (editing() === g.id) {
            <div class="mt-4 grid gap-3 border-t border-divider pt-4">
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <app-form-field label="Correo" [for]="'rg-mail-' + g.id"><app-input [inputId]="'rg-mail-' + g.id" type="email" [compact]="true" [(value)]="fEmail" /></app-form-field>
                <app-form-field label="Teléfono" [for]="'rg-tel-' + g.id" [optional]="true"><app-input [inputId]="'rg-tel-' + g.id" type="tel" [compact]="true" [(value)]="fPhone" /></app-form-field>
              </div>
              <div class="grid grid-cols-[1fr_1.4fr_0.7fr] gap-3">
                <app-form-field label="Documento"><app-select [compact]="true" [options]="docTypes" [(value)]="fDocType" ariaLabel="Tipo de documento" /></app-form-field>
                <app-form-field label="Número" [for]="'rg-doc-' + g.id" [error]="fieldError('body.document_number')"><app-input [inputId]="'rg-doc-' + g.id" [compact]="true" [maxlength]="32" [placeholder]="fDocType() === 'dpi' ? '13 dígitos' : 'Pasaporte'" [(value)]="fDoc" /></app-form-field>
                <app-form-field label="País" [for]="'rg-nat-' + g.id" [optional]="true"><app-input [inputId]="'rg-nat-' + g.id" [compact]="true" [maxlength]="2" placeholder="GT" [(value)]="fNat" /></app-form-field>
              </div>
              <div class="grid grid-cols-2 gap-3">
                @for (side of sides; track side.kind) {
                  <label class="upload flex cursor-pointer flex-col items-center justify-center gap-1 rounded-field px-3 py-4 text-center text-[12px]" [class.has-file]="!!pick(side.kind)">
                    <app-icon [name]="pick(side.kind) ? 'check-circle' : 'camera'" [size]="18" />
                    <span class="font-bold">{{ side.label }}</span>
                    <span class="max-w-full truncate text-text-secondary">{{ pick(side.kind)?.name ?? (has(g, side.kind) ? 'Ya está; elige otra para reemplazarla' : 'JPG, PNG o WebP') }}</span>
                    <input type="file" class="sr-only" accept="image/png,image/jpeg,image/webp" (change)="choose(side.kind, $event)" />
                  </label>
                }
              </div>
              @if (generalError(); as e) { <p class="text-[12.5px] font-bold text-danger">{{ e }}</p> }
              <div class="flex justify-end gap-2">
                <app-button variant="tertiary" size="sm" (pressed)="editing.set(null)">Cancelar</app-button>
                <app-button variant="primary" size="sm" [loading]="store.busy() === 'guest:' + g.id" (pressed)="save(g)">Guardar registro</app-button>
              </div>
            </div>
          } @else if (store.canGuests() && (g.email || g.document_number || g.phone)) {
            <dl class="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
              @if (g.email) { <div class="flex gap-2"><dt class="text-text-secondary">Correo</dt><dd class="truncate text-primary">{{ g.email }}</dd></div> }
              @if (g.phone) { <div class="flex gap-2"><dt class="text-text-secondary">Teléfono</dt><dd class="tabular text-primary">{{ g.phone }}</dd></div> }
              @if (g.document_number) {
                <div class="flex gap-2"><dt class="text-text-secondary">{{ g.document_type === 'dpi' ? 'DPI' : 'Pasaporte' }}</dt><dd class="font-mono text-primary">{{ g.document_number }}</dd></div>
              }
              @if (g.nationality) { <div class="flex gap-2"><dt class="text-text-secondary">País</dt><dd class="text-primary">{{ g.nationality }}</dd></div> }
            </dl>
          }
          @if (g.documents.length && editing() !== g.id) {
            <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-divider pt-3 text-[12px] text-text-secondary">
              @if (store.canDocuments()) {
                @for (d of g.documents; track d.file_id) {
                  <app-button variant="secondary" size="sm" [loading]="store.busy() === 'doc:' + d.file_id" (pressed)="store.viewDocument(g.id, d.file_id)"><app-icon name="eye" [size]="14" /> {{ d.kind === 'id_front' ? 'Frente' : 'Reverso' }}</app-button>
                }
              } @else {
                <span>Fotos del documento guardadas.</span>
              }
              @if (expires(g); as e) { <span class="ml-auto">Se borran el {{ e | date: 'd MMM y' }}</span> }
            </div>
          }
          @if (!g.is_primary && store.canRegister() && open() && editing() !== g.id) {
            <div class="mt-2 text-right"><app-button variant="link" size="sm" (pressed)="store.removeGuest(r, g.id)">Quitar acompañante</app-button></div>
          }
        </li>
      } @empty {
        <li class="rounded-card border border-dashed border-border-card px-4 py-6 text-center text-[13px] text-text-secondary">
          Llegó por iCal sin datos del huésped. Agrégalo para confirmar la reserva.
        </li>
      }
    </ul>

    @if (store.canRegister() && open()) {
      @if (adding()) {
        <section class="mt-4 rounded-card border border-border-card p-4" aria-label="Agregar huésped">
          <h3 class="text-[13px] font-bold text-primary">{{ r.primary_guest_id ? 'Agregar acompañante' : 'Huésped principal' }}</h3>
          @if (store.canGuests()) {
            <app-input class="mt-3 block" type="search" icon="search" [compact]="true" placeholder="Buscar por nombre, correo o documento" ariaLabel="Buscar huésped" [value]="query()" (valueChange)="search($event)" />
            @if (results().length) {
              <ul class="mt-2 divide-y divide-divider rounded-field border border-border-card">
                @for (x of results(); track x.id) {
                  <li><button type="button" class="pick flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px]" [disabled]="x.blacklisted" (click)="link(x)">
                    <span class="min-w-0 flex-1 truncate font-bold text-primary">{{ x.full_name }}</span>
                    <span class="truncate text-[11.5px] text-text-secondary">{{ x.document_number ?? x.email ?? '' }}</span>
                    @if (x.blacklisted) { <app-badge tone="danger" size="sm">Lista negra</app-badge> }
                  </button></li>
                }
              </ul>
            }
          }
          <p class="mt-3 text-[12px] text-text-secondary">¿No está? Créalo con su nombre y correo; el documento se registra después.</p>
          <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <app-input [compact]="true" placeholder="Nombre completo" ariaLabel="Nombre del huésped" [(value)]="nName" />
            <app-input type="email" [compact]="true" placeholder="correo@ejemplo.com" ariaLabel="Correo del huésped" [(value)]="nEmail" />
          </div>
          @if (generalError(); as e) { <p class="mt-2 text-[12.5px] font-bold text-danger">{{ e }}</p> }
          <div class="mt-3 flex justify-end gap-2">
            <app-button variant="tertiary" size="sm" (pressed)="adding.set(false)">Cancelar</app-button>
            <app-button variant="primary" size="sm" [disabled]="nName().trim().length < 2" [loading]="store.busy() === r.id" (pressed)="createAndLink()">Agregar</app-button>
          </div>
        </section>
      } @else {
        <app-button class="mt-4 block" variant="secondary" size="sm" (pressed)="startAdd()"><app-icon name="user-plus" [size]="15" /> {{ r.primary_guest_id ? 'Agregar acompañante' : 'Agregar huésped' }}</app-button>
      }
    }
  `,
  styles: `
    .upload { border: 1px dashed var(--color-border-field); color: var(--color-primary); background: var(--color-surface); transition: border-color var(--dur-fast), background var(--dur-fast); }
    .upload:hover { border-color: var(--color-secondary); }
    .upload.has-file { border-style: solid; border-color: var(--color-success); background: var(--color-success-soft); }
    .pick { transition: background var(--dur-fast); }
    .pick:hover:not(:disabled) { background: var(--color-surface-soft); }
    .pick:disabled { opacity: 0.6; cursor: not-allowed; }
  `,
})
export class ReservationGuestsComponent {
  protected readonly store = inject(ReservationsStore);
  readonly reservation = input.required<ReservationDetail>();

  protected readonly sides = [{ kind: 'id_front' as const, label: 'Foto del frente' }, { kind: 'id_back' as const, label: 'Foto del reverso' }];
  protected readonly docTypes = [{ value: 'dpi', label: 'DPI' }, { value: 'passport', label: 'Pasaporte' }];
  protected readonly editing = signal<string | null>(null);
  protected readonly fEmail = signal('');
  protected readonly fPhone = signal('');
  protected readonly fDocType = signal<DocumentType>('dpi');
  protected readonly fDoc = signal('');
  protected readonly fNat = signal('');
  private readonly files = signal<{ id_front: File | null; id_back: File | null }>({ id_front: null, id_back: null });

  protected readonly adding = signal(false);
  protected readonly query = signal('');
  protected readonly results = signal<readonly Guest[]>([]);
  protected readonly nName = signal('');
  protected readonly nEmail = signal('');
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  /** Se registran huéspedes mientras la reserva no termina. */
  protected readonly open = computed(() => ['pending', 'confirmed', 'checked_in'].includes(this.reservation().status));
  protected readonly generalError = computed(() => {
    const e = this.store.saveError();
    return e ? (e.errors.length ? e.errors.map((x) => x.message).join(' ') : e.detail) : null;
  });

  protected missing(g: ReservationGuest): string {
    const parts = g.missing.map((m) => MISSING_LABEL[m]);
    return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}` : parts[0];
  }
  protected has(g: ReservationGuest, kind: 'id_front' | 'id_back'): boolean {
    return !g.missing.includes(kind);
  }
  protected expires(g: ReservationGuest): string | null {
    return g.documents.map((d) => d.expires_at).filter((d): d is string => !!d).sort()[0] ?? null;
  }
  protected pick(kind: 'id_front' | 'id_back'): File | null {
    return this.files()[kind];
  }
  protected fieldError(loc: string): string | null {
    return this.store.saveError()?.errors.find((e) => e.location === loc)?.message ?? null;
  }

  protected edit(g: ReservationGuest): void {
    this.store.clearSaveError();
    this.fEmail.set(g.email ?? '');
    this.fPhone.set(g.phone ?? '');
    this.fDocType.set(g.document_type ?? 'dpi');
    this.fDoc.set(g.document_number ?? '');
    this.fNat.set(g.nationality ?? '');
    this.files.set({ id_front: null, id_back: null });
    this.editing.set(g.id);
  }

  protected choose(kind: 'id_front' | 'id_back', e: Event): void {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    input.value = '';
    this.files.update((x) => ({ ...x, [kind]: f }));
  }

  protected async save(g: ReservationGuest): Promise<void> {
    const patch: Record<string, string | null> = {};
    const set = (key: string, now: string, before: string | null) => {
      const v = now.trim();
      if (v !== (before ?? '')) patch[key] = v || null;
    };
    set('email', this.fEmail(), g.email);
    set('phone', this.fPhone(), g.phone);
    set('nationality', this.fNat().toUpperCase(), g.nationality);
    const doc = this.fDoc().trim();
    if (doc !== (g.document_number ?? '') || (doc && this.fDocType() !== g.document_type)) {
      patch['document_type'] = doc ? this.fDocType() : null;
      patch['document_number'] = doc || null;
    }
    const { id_front, id_back } = this.files();
    if (await this.store.register(this.reservation(), g.id, patch, id_front, id_back)) this.editing.set(null);
  }

  protected startAdd(): void {
    this.store.clearSaveError();
    this.query.set('');
    this.results.set([]);
    this.nName.set('');
    this.nEmail.set('');
    this.adding.set(true);
  }

  protected search(q: string): void {
    this.query.set(q);
    clearTimeout(this.searchTimer);
    if (q.trim().length < 2) {
      this.results.set([]);
      return;
    }
    this.searchTimer = setTimeout(async () => this.results.set((await this.store.searchGuests(q.trim())).slice(0, 6)), 250);
  }

  protected async link(g: Guest): Promise<void> {
    if (await this.store.addGuest(this.reservation(), { guest_id: g.id, is_primary: !this.reservation().primary_guest_id })) this.adding.set(false);
  }

  protected async createAndLink(): Promise<void> {
    const email = this.nEmail().trim();
    const ok = await this.store.addGuest(this.reservation(), {
      guest: { full_name: this.nName().trim(), email: email || null },
      is_primary: !this.reservation().primary_guest_id,
    });
    if (ok) this.adding.set(false);
  }
}
