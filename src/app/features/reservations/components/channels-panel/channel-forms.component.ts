import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { ReservationsStore } from '../../store/reservations.store';
import { CHANNEL_KINDS, Channel, ChannelKind, Feed } from '../../models/reservation.model';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';

/** Alta o edición de un canal de venta (W-H6). */
@Component({
  selector: 'app-channel-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormSheetComponent, FormFieldComponent, CheckboxComponent, InputComponent, SelectComponent],
  template: `
    <app-form-sheet eyebrow="Reservas" [title]="channel() ? 'Editar canal' : 'Nuevo canal'" subtitle="Las reglas valen para las reservas nuevas; las existentes conservan su depósito." spot="arrivals"
      [submitLabel]="channel() ? 'Guardar cambios' : 'Crear canal'" [saving]="store.busy() === 'channel'" [error]="generalError()" (submitted)="submit()" (cancel)="cancel.emit()">
      <app-form-field label="Nombre" for="cf-name" [required]="true" [error]="tried() && fName().trim().length < 2 ? 'Escribe el nombre.' : fieldError('body.name')">
        <app-input inputId="cf-name" [compact]="true" [maxlength]="64" placeholder="Ej.: Agencia Maya Tours" [(value)]="fName" />
      </app-form-field>
      <app-form-field label="Tipo"><app-select [compact]="true" [options]="kindOptions" [(value)]="fKind" ariaLabel="Tipo de canal" /></app-form-field>
      <app-checkbox [(checked)]="fDeposit">Pide depósito</app-checkbox>
      @if (fDeposit()) {
        <app-form-field label="Depósito por defecto (Q)" for="cf-dep" [optional]="true">
          <input id="cf-dep" type="number" min="0" step="50" class="field-native tabular" [value]="fAmount()" (input)="fAmount.set($any($event.target).value)" />
        </app-form-field>
      }
      <app-checkbox [(checked)]="fCheckin">Registro de huéspedes y check-in formal</app-checkbox>
      <p class="-mt-2 pl-7 text-[12px] text-text-secondary">Sin check-in formal, la entrada y la salida se marcan solas a su hora.</p>
      @if (channel()) { <app-checkbox [(checked)]="fActive">Activo (se ofrece en reservas nuevas)</app-checkbox> }
    </app-form-sheet>
  `,
})
export class ChannelFormComponent implements OnInit {
  protected readonly store = inject(ReservationsStore);
  readonly channel = input<Channel | null>(null);
  readonly saved = output<void>();
  readonly cancel = output<void>();

  protected readonly kindOptions = (Object.keys(CHANNEL_KINDS) as ChannelKind[]).map((k) => ({ value: k, label: CHANNEL_KINDS[k] }));
  protected readonly fName = signal('');
  protected readonly fKind = signal<ChannelKind>('agency');
  protected readonly fDeposit = signal(false);
  protected readonly fAmount = signal('');
  protected readonly fCheckin = signal(false);
  protected readonly fActive = signal(true);
  protected readonly tried = signal(false);
  protected readonly generalError = computed(() => {
    const e = this.store.saveError();
    return e && !e.errors.length ? e.detail : null;
  });

  ngOnInit(): void {
    this.store.clearSaveError();
    const c = this.channel();
    if (!c) return;
    this.fName.set(c.name);
    this.fKind.set(c.kind);
    this.fDeposit.set(c.requires_deposit);
    this.fAmount.set(c.default_deposit_amount === null ? '' : String(c.default_deposit_amount));
    this.fCheckin.set(c.has_checkin);
    this.fActive.set(c.is_active);
  }

  protected fieldError(loc: string): string | null {
    return this.store.saveError()?.errors.find((e) => e.location === loc)?.message ?? null;
  }

  protected async submit(): Promise<void> {
    this.tried.set(true);
    if (this.fName().trim().length < 2) return;
    const amount = this.fDeposit() && this.fAmount().trim() ? Math.max(0, Number(this.fAmount()) || 0) : null;
    const ok = await this.store.saveChannel(this.channel()?.id ?? null, {
      name: this.fName().trim(), kind: this.fKind(), requires_deposit: this.fDeposit(), has_checkin: this.fCheckin(),
      default_deposit_amount: amount, ...(this.channel() ? { is_active: this.fActive() } : {}),
    });
    if (ok) this.saved.emit();
  }
}

/** Alta o edición de la URL iCal de una propiedad (W-H6). */
@Component({
  selector: 'app-feed-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormSheetComponent, FormFieldComponent, InputComponent, SelectComponent],
  template: `
    <app-form-sheet eyebrow="Reservas" [title]="feed() ? 'Editar calendario' : 'Agregar calendario iCal'" subtitle="ARGOS lo lee cada 30 minutos y trae las reservas por completar." spot="arrivals"
      [submitLabel]="feed() ? 'Guardar' : 'Agregar'" [saving]="store.busy() === 'feed'" [error]="generalError()" (submitted)="submit()" (cancel)="cancel.emit()">
      @if (!feed()) {
        <app-form-field label="Propiedad" [required]="true" [error]="tried() && !fProp() ? 'Elige una propiedad.' : null">
          <app-select [compact]="true" placeholder="Elige una propiedad" [options]="propOptions()" [(value)]="fProp" ariaLabel="Propiedad" />
        </app-form-field>
        <app-form-field label="Canal" [error]="fieldError('body.channel_id')">
          <app-select [compact]="true" [options]="channelOptions()" [(value)]="fChannel" ariaLabel="Canal" />
        </app-form-field>
      }
      <app-form-field label="URL de exportación" for="ff-url" [required]="true" [error]="fieldError('body.url')">
        <app-input inputId="ff-url" type="text" [compact]="true" [maxlength]="2048" placeholder="https://www.airbnb.com/calendar/ical/…" [(value)]="fUrl" />
      </app-form-field>
      <div class="rounded-field bg-surface-soft px-3.5 py-3 text-[12px] leading-relaxed text-text-body">
        <b class="text-primary">Dónde está la URL</b><br />
        Airbnb: Calendario › Disponibilidad › Conectar calendarios › Exportar.<br />
        Booking.com: Tarifas y disponibilidad › Sincronizar calendarios › Exportar.
      </div>
    </app-form-sheet>
  `,
})
export class FeedFormComponent implements OnInit {
  protected readonly store = inject(ReservationsStore);
  readonly feed = input<Feed | null>(null);
  readonly saved = output<void>();
  readonly cancel = output<void>();

  protected readonly fProp = signal('');
  protected readonly fChannel = signal('');
  protected readonly fUrl = signal('');
  protected readonly tried = signal(false);
  protected readonly propOptions = computed(() => this.store.properties().map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })));
  protected readonly channelOptions = computed(() => this.store.activeChannels().filter((c) => c.kind !== 'direct').map((c) => ({ value: c.id, label: c.name })));
  protected readonly generalError = computed(() => {
    const e = this.store.saveError();
    return e && !e.errors.length ? e.detail : null;
  });

  ngOnInit(): void {
    this.store.clearSaveError();
    const f = this.feed();
    this.fUrl.set(f?.url ?? '');
    if (!f) this.fChannel.set(this.channelOptions()[0]?.value ?? '');
  }

  protected fieldError(loc: string): string | null {
    return this.store.saveError()?.errors.find((e) => e.location === loc)?.message ?? null;
  }

  protected async submit(): Promise<void> {
    this.tried.set(true);
    const f = this.feed();
    if ((!f && !this.fProp()) || !this.fUrl().trim()) return;
    if (await this.store.saveFeed(f?.id ?? null, f?.property_id ?? this.fProp(), f?.channel_id ?? this.fChannel(), this.fUrl().trim())) this.saved.emit();
  }
}
