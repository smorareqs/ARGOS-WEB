import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, output, signal, untracked } from '@angular/core';
import { ReservationsStore } from '../../store/reservations.store';
import { Guest, ReservationDetail, isLive, nightsBetween, overlaps } from '../../models/reservation.model';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { addDays, dayKey, gtq, toDayKey } from '../../../../shared/utils/time';
import { plural } from '../../../../shared/utils/plural';

/** Rango que llega al abrir el formulario (arrastre en el calendario). */
export interface ReservationPreset {
  readonly property_id: string | null;
  readonly from: string | null;
  readonly to: string | null;
}

/**
 * Nueva reserva o edición (W-H4): propiedad, canal (dice si pide depósito y
 * check-in), fechas con aviso en vivo si se cruzan, huésped (buscar por
 * nombre o documento, crear uno nuevo o dejarla por completar), personas,
 * monto, depósito, notas y el correo de confirmación.
 */
@Component({
  selector: 'app-reservation-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormSheetComponent, FormFieldComponent, SegmentedComponent, BadgeComponent, CheckboxComponent, InputComponent, SelectComponent],
  template: `
    <app-form-sheet eyebrow="Reservas" [title]="editing() ? 'Editar ' + editing()!.code : 'Nueva reserva'"
      [subtitle]="editing() ? 'Cambiar fechas avisa a seguridad y a limpieza.' : 'Para ventas directas o reservas que no llegan por iCal.'" spot="arrivals"
      [submitLabel]="editing() ? 'Guardar cambios' : 'Crear reserva'" [saving]="store.busy() === 'create' || store.busy() === 'edit'" [error]="generalError()"
      (submitted)="submit()" (cancel)="cancel.emit()">
      @if (!editing()) {
        <app-form-field label="Propiedad" [required]="true" [error]="tried() && !fProp() ? 'Elige una propiedad.' : null">
          <app-select [compact]="true" placeholder="Elige una propiedad" [options]="propOptions()" [(value)]="fProp" ariaLabel="Propiedad" />
        </app-form-field>
      }
      <app-form-field label="Canal" [hint]="channelHint()" [error]="tried() && !fChannel() ? 'Elige un canal.' : fieldError('body.channel_id')">
        <app-select [compact]="true" [options]="channelOptions()" [value]="fChannel()" (changed)="pickChannel($event)" ariaLabel="Canal" />
      </app-form-field>
      <div class="grid grid-cols-2 gap-3">
        <app-form-field label="Entrada" for="rf-in" [required]="true" [error]="clash()">
          <input id="rf-in" type="date" class="field-native" [disabled]="inLocked()" [attr.aria-invalid]="!!clash()" [value]="fIn()" (input)="fIn.set($any($event.target).value)" />
        </app-form-field>
        <app-form-field label="Salida" for="rf-out" [required]="true" [error]="fOut() <= fIn() ? 'Debe ser después de la entrada.' : fieldError('body.check_out_date')" [hint]="fOut() > fIn() ? plural(nights(), 'noche', 'noches') : null">
          <input id="rf-out" type="date" class="field-native" [value]="fOut()" (input)="fOut.set($any($event.target).value)" />
        </app-form-field>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <app-form-field label="Llega desde" for="rf-tin" [optional]="true"><input id="rf-tin" type="time" class="field-native" [value]="fTimeIn()" (input)="fTimeIn.set($any($event.target).value)" /></app-form-field>
        <app-form-field label="Sale hasta" for="rf-tout" [optional]="true"><input id="rf-tout" type="time" class="field-native" [value]="fTimeOut()" (input)="fTimeOut.set($any($event.target).value)" /></app-form-field>
      </div>

      @if (!editing()) {
        <fieldset>
          <legend class="mb-1.5 text-[12.5px] font-bold text-primary">Huésped principal</legend>
          <app-segmented [options]="guestModes()" [(value)]="fMode" ariaLabel="Huésped" />
          @switch (fMode()) {
            @case ('buscar') {
              @if (picked(); as g) {
                <div class="mt-3 flex items-center gap-3 rounded-field border border-border-card px-3.5 py-2.5">
                  <div class="min-w-0 flex-1"><div class="truncate text-[13px] font-bold text-primary">{{ g.full_name }}</div><div class="truncate text-[11.5px] text-text-secondary">{{ g.document_number ?? g.email ?? '' }}</div></div>
                  <button type="button" class="text-[12px] font-bold text-action" (click)="picked.set(null)">Cambiar</button>
                </div>
              } @else {
                <app-input class="mt-3 block" type="search" icon="search" [compact]="true" placeholder="Nombre, correo o documento" ariaLabel="Buscar huésped" [value]="query()" (valueChange)="search($event)" />
                <ul class="mt-2 divide-y divide-divider rounded-field border border-border-card" [class.hidden]="!results().length">
                  @for (g of results(); track g.id) {
                    <li><button type="button" class="pick flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px]" [disabled]="g.blacklisted" (click)="picked.set(g)">
                      <span class="min-w-0 flex-1 truncate font-bold text-primary">{{ g.full_name }}</span>
                      <span class="truncate text-[11.5px] text-text-secondary">{{ g.document_number ?? g.email ?? '' }}</span>
                      @if (g.blacklisted) { <app-badge tone="danger" size="sm" icon="ban">Lista negra</app-badge> }
                      @else if (g.stays) { <app-badge tone="validated" size="sm">{{ plural(g.stays, 'estancia', 'estancias') }}</app-badge> }
                    </button></li>
                  }
                </ul>
              }
              @if (tried() && !picked()) { <p class="mt-1.5 text-[12px] font-bold text-danger">Elige un huésped o crea uno nuevo.</p> }
            }
            @case ('nuevo') {
              <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <app-form-field label="Nombre" for="rf-name" [required]="true" [error]="tried() && fName().trim().length < 2 ? 'Escribe el nombre.' : fieldError('body.guest.full_name')">
                  <app-input inputId="rf-name" [compact]="true" placeholder="Nombre completo" [(value)]="fName" />
                </app-form-field>
                <app-form-field label="Correo" for="rf-mail" [hint]="'Para el correo de confirmación'" [error]="tried() && fMail().trim() && !mailOk() ? 'Escribe un correo válido.' : fieldError('body.guest.email')">
                  <app-input inputId="rf-mail" type="email" [compact]="true" placeholder="nombre@correo.com" [(value)]="fMail" />
                </app-form-field>
                <app-form-field label="Teléfono" for="rf-tel" [optional]="true"><app-input inputId="rf-tel" type="tel" [compact]="true" [(value)]="fPhone" /></app-form-field>
                <app-form-field label="Documento" for="rf-doc" [optional]="true" [error]="fieldError('body.guest.document_number')">
                  <div class="flex gap-2">
                    <app-select class="w-[110px] shrink-0" [compact]="true" [options]="docTypes" [(value)]="fDocType" ariaLabel="Tipo de documento" />
                    <app-input class="min-w-0 flex-1" inputId="rf-doc" [compact]="true" [maxlength]="32" placeholder="Número" [(value)]="fDoc" />
                  </div>
                </app-form-field>
              </div>
            }
            @default {
              <p class="mt-2 text-[12.5px] text-text-secondary">Queda por confirmar. Agrega al huésped desde la ficha cuando lo tengas.</p>
            }
          }
        </fieldset>
      }

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <app-form-field label="Adultos" for="rf-ad"><input id="rf-ad" type="number" min="0" max="50" class="field-native tabular" [value]="fAdults()" (input)="fAdults.set($any($event.target).value)" /></app-form-field>
        <app-form-field label="Niños" for="rf-ch"><input id="rf-ch" type="number" min="0" max="50" class="field-native tabular" [value]="fKids()" (input)="fKids.set($any($event.target).value)" /></app-form-field>
        <app-form-field label="Monto (Q)" for="rf-amt" [optional]="true"><input id="rf-amt" type="number" min="0" step="50" class="field-native tabular" [value]="fAmount()" (input)="fAmount.set($any($event.target).value)" /></app-form-field>
        <app-form-field label="Depósito (Q)" for="rf-dep" [optional]="true"><input id="rf-dep" type="number" min="0" step="50" class="field-native tabular" [value]="fDeposit()" (input)="fDeposit.set($any($event.target).value)" /></app-form-field>
      </div>
      <app-form-field label="Notas" for="rf-notes" [optional]="true">
        <textarea id="rf-notes" rows="2" class="field-native" maxlength="4000" placeholder="Hora de llegada, mascotas, cuna…" [value]="fNotes()" (input)="fNotes.set($any($event.target).value)"></textarea>
      </app-form-field>
      @if (!editing() && fMode() !== 'sin') {
        <app-checkbox [(checked)]="fEmail">Enviar correo de confirmación con instrucciones</app-checkbox>
      }
    </app-form-sheet>
  `,
  styles: `
    .pick { transition: background var(--dur-fast); }
    .pick:hover:not(:disabled) { background: var(--color-surface-soft); }
    .pick:disabled { opacity: 0.6; cursor: not-allowed; }
  `,
})
export class ReservationFormComponent implements OnInit {
  protected readonly store = inject(ReservationsStore);
  readonly preset = input<ReservationPreset>({ property_id: null, from: null, to: null });
  readonly editing = input<ReservationDetail | null>(null);
  readonly saved = output<string>();
  readonly cancel = output<void>();

  protected readonly plural = plural;
  protected readonly docTypes = [{ value: 'dpi', label: 'DPI' }, { value: 'passport', label: 'Pasaporte' }];
  protected readonly fProp = signal('');
  protected readonly fChannel = signal('');
  protected readonly fIn = signal(dayKey(1));
  protected readonly fOut = signal(dayKey(4));
  protected readonly fTimeIn = signal('');
  protected readonly fTimeOut = signal('');
  protected readonly fMode = signal('nuevo');
  protected readonly fName = signal('');
  protected readonly fMail = signal('');
  protected readonly fPhone = signal('');
  protected readonly fDocType = signal('dpi');
  protected readonly fDoc = signal('');
  protected readonly fAdults = signal('2');
  protected readonly fKids = signal('0');
  protected readonly fAmount = signal('');
  protected readonly fDeposit = signal('');
  protected readonly fNotes = signal('');
  protected readonly fEmail = signal(true);
  protected readonly tried = signal(false);
  protected readonly query = signal('');
  protected readonly results = signal<readonly Guest[]>([]);
  protected readonly picked = signal<Guest | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly guestModes = computed(() => [
    ...(this.store.canGuests() ? [{ value: 'buscar', label: 'Buscar' }] : []),
    { value: 'nuevo', label: 'Nuevo' },
    { value: 'sin', label: 'Por completar' },
  ]);
  protected readonly propOptions = computed(() => this.store.properties().map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })));
  protected readonly channelOptions = computed(() => this.store.activeChannels().map((c) => ({ value: c.id, label: c.name })));
  protected readonly channel = computed(() => this.store.channels().find((c) => c.id === this.fChannel()) ?? null);
  protected readonly channelHint = computed(() => {
    const c = this.channel();
    if (!c) return null;
    const dep = c.requires_deposit ? `pide depósito${c.default_deposit_amount ? ` de ${gtq(c.default_deposit_amount, 0)}` : ''}` : 'sin depósito';
    return `${dep[0].toUpperCase()}${dep.slice(1)} · ${c.has_checkin ? 'registro de huéspedes en el check-in' : 'sin check-in formal'}`;
  });
  protected readonly nights = computed(() => nightsBetween(this.fIn(), this.fOut()));
  protected readonly mailOk = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.fMail().trim()));
  /** La entrada no cambia con el huésped en casa. */
  protected readonly inLocked = computed(() => this.editing()?.status === 'checked_in');

  /** Aviso de cruce en vivo con la ventana cargada; la API tiene la última palabra. */
  protected readonly clash = computed(() => {
    const server = this.fieldError('body.check_in_date');
    if (server) return server;
    const prop = this.editing()?.property_id ?? this.fProp();
    if (!prop || this.fOut() <= this.fIn()) return null;
    const me = this.editing()?.id;
    const hit = this.store.reservations().find((r) => r.id !== me && r.property_id === prop && isLive(r)
      && overlaps(r, { check_in_date: this.fIn(), check_out_date: this.fOut() }));
    return hit ? `Se cruza con ${hit.code}${hit.guest_name ? ` de ${hit.guest_name}` : ''}.` : null;
  });

  protected readonly generalError = computed(() => {
    const e = this.store.saveError();
    return e && !e.errors.length ? e.detail : null;
  });

  ngOnInit(): void {
    this.store.clearSaveError();
    const r = this.editing();
    if (r) {
      this.fChannel.set(r.channel_id);
      this.fIn.set(r.check_in_date);
      this.fOut.set(r.check_out_date);
      this.fTimeIn.set(r.check_in_time);
      this.fTimeOut.set(r.check_out_time);
      this.fAdults.set(String(r.adults));
      this.fKids.set(String(r.children));
      this.fAmount.set(r.total_amount === null ? '' : String(r.total_amount));
      this.fDeposit.set(r.deposit_amount === null ? '' : String(r.deposit_amount));
      this.fNotes.set(r.notes ?? '');
      return;
    }
    const p = this.preset();
    if (p.property_id) this.fProp.set(p.property_id);
    if (p.from) {
      this.fIn.set(p.from);
      this.fOut.set(p.to && p.to > p.from ? p.to : toDayKey(addDays(new Date(`${p.from}T12:00:00`), 1)));
    }
  }

  constructor() {
    // Canal por defecto (Directo) en cuanto llegan los canales: al abrir el
    // formulario por enlace (?nueva=1) todavía no están cargados en ngOnInit.
    effect(() => {
      const list = this.store.activeChannels();
      if (this.editing() || !list.length || untracked(() => this.fChannel())) return;
      const direct = list.find((c) => c.kind === 'direct') ?? list[0];
      untracked(() => this.pickChannel(direct.id));
    });
  }

  protected fieldError(loc: string): string | null {
    return this.store.saveError()?.errors.find((e) => e.location === loc)?.message ?? null;
  }

  protected pickChannel(id: string): void {
    this.fChannel.set(id);
    const c = this.store.channels().find((x) => x.id === id);
    if (c && !this.editing()) this.fDeposit.set(c.requires_deposit && c.default_deposit_amount ? String(c.default_deposit_amount) : '');
  }

  protected search(q: string): void {
    this.query.set(q);
    clearTimeout(this.timer);
    if (q.trim().length < 2) {
      this.results.set([]);
      return;
    }
    this.timer = setTimeout(async () => this.results.set((await this.store.searchGuests(q.trim())).slice(0, 6)), 250);
  }

  protected async submit(): Promise<void> {
    this.tried.set(true);
    if (this.fOut() <= this.fIn() || this.clash() || !this.fChannel()) return;
    const num = (v: string) => (v.trim() === '' ? null : Math.max(0, Number(v) || 0));
    const common = {
      channel_id: this.fChannel(), check_in_date: this.fIn(), check_out_date: this.fOut(),
      check_in_time: this.fTimeIn() || undefined, check_out_time: this.fTimeOut() || undefined,
      adults: Math.max(0, Number(this.fAdults()) || 0), children: Math.max(0, Number(this.fKids()) || 0),
      total_amount: num(this.fAmount()), deposit_amount: num(this.fDeposit()), notes: this.fNotes().trim() || null,
    };
    const r = this.editing();
    if (r) {
      const out = await this.store.update(r.id, common);
      if (out) this.saved.emit(out.id);
      return;
    }
    if (!this.fProp() || !this.guestReady()) return;
    const doc = this.fDoc().trim();
    const out = await this.store.create({
      ...common, property_id: this.fProp(), send_email: this.fEmail() && this.fMode() !== 'sin',
      primary_guest_id: this.fMode() === 'buscar' ? (this.picked()?.id ?? null) : null,
      guest: this.fMode() === 'nuevo'
        ? {
            full_name: this.fName().trim(), email: this.fMail().trim() || null, phone: this.fPhone().trim() || null,
            document_type: doc ? (this.fDocType() as 'dpi' | 'passport') : null, document_number: doc || null,
          }
        : null,
    });
    if (out) this.saved.emit(out.id);
  }

  private guestReady(): boolean {
    switch (this.fMode()) {
      case 'buscar': return !!this.picked();
      case 'nuevo': return this.fName().trim().length >= 2 && (!this.fMail().trim() || this.mailOk());
      default: return true;
    }
  }
}
