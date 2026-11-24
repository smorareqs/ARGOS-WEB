import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ReservationsStore } from '../../store/reservations.store';
import { DEPOSIT_STATUS, RES_STATUS, Reservation, channelColor, guestLabel, isLive } from '../../models/reservation.model';
import { OccDay, OccRange, OccupancyCalendarComponent } from '../../components/occupancy-calendar/occupancy-calendar.component';
import { ReservationDetailComponent } from '../../components/reservation-detail/reservation-detail.component';
import { ReservationFormComponent, ReservationPreset } from '../../components/reservation-form/reservation-form.component';
import { GuestDetailComponent, GuestsPanelComponent } from '../../components/guests-panel/guests-panel.component';
import { ChannelsPanelComponent } from '../../components/channels-panel/channels-panel.component';
import { ChannelFormComponent, FeedFormComponent } from '../../components/channels-panel/channel-forms.component';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { TabsComponent } from '../../../../shared/molecules/tabs/tabs.component';
import { FilterChipsComponent } from '../../../../shared/molecules/filter-chips/filter-chips.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { CellDefDirective, DataTableComponent, TableColumn } from '../../../../shared/organisms/data-table/data-table.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { addDays, dayKey, gtq, toDayKey } from '../../../../shared/utils/time';
import { plural } from '../../../../shared/utils/plural';

const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Reservas (W-H1 calendario de ocupación, W-H2 lista, W-H3 ficha, W-H4 nueva
 * reserva, W-H5 huéspedes, W-H6 canales e iCal). Todo el estado de vista va en
 * la URL: ?tab=, ?estado=, ?ver=, ?nueva=, ?editar=, ?huesped=, ?canal=,
 * ?calendario=, ?desde=.
 */
@Component({
  selector: 'app-reservations-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, OccupancyCalendarComponent, ReservationDetailComponent, ReservationFormComponent, GuestsPanelComponent, GuestDetailComponent,
    ChannelsPanelComponent, ChannelFormComponent, FeedFormComponent, PageHeaderComponent, DemoDataNoteComponent, TabsComponent,
    FilterChipsComponent, EmptyStateComponent, DataTableComponent, CellDefDirective, DrawerComponent, ButtonComponent, IconComponent,
    InputComponent, BadgeComponent,
  ],
  providers: [ReservationsStore],
  template: `
    <app-page-header title="Reservas" eyebrow="Operación" [subtitle]="store.loading() ? 'Cargando ocupación…' : subtitle()">
      @if (store.canManage()) {
        <app-button variant="tertiary" [loading]="store.busy() === 'sync'" (pressed)="store.sync()"><app-icon name="refresh" [size]="16" /> Sincronizar iCal</app-button>
        <app-button variant="primary" (pressed)="openCreate(null)"><app-icon name="plus" [size]="17" /> Nueva reserva</app-button>
      }
    </app-page-header>
    <app-demo-data-note module="reservations" label="Reservas" />

    @if (store.error(); as err) {
      <div class="mt-6 rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="error" title="No pudimos cargar las reservas" [message]="err">
          <app-button variant="secondary" (pressed)="store.load()"><app-icon name="refresh" [size]="16" /> Reintentar</app-button>
        </app-empty-state>
      </div>
    } @else {
      @if ((store.today()?.incomplete ?? 0) > 0 && tab() !== 'lista') {
        <button type="button" class="reveal mt-6 flex w-full items-center gap-3 rounded-card border border-warning/30 bg-warning-soft px-4 py-3 text-left text-[13px] text-warning" (click)="go({ tab: 'lista', estado: 'incomplete' })">
          <app-icon name="alert-triangle" [size]="17" />
          <span><b>{{ plural(store.today()!.incomplete, 'reserva importada', 'reservas importadas') }} sin datos del huésped.</b> Complétalas para confirmarlas y mandar las instrucciones.</span>
          <app-icon name="arrow-right" [size]="16" class="ml-auto" />
        </button>
      }
      <app-tabs class="mt-4 block" [options]="tabs()" [value]="tab()" (valueChange)="go({ tab: $event === 'calendario' ? null : $event, estado: null })" ariaLabel="Secciones de reservas" />
      <div class="mt-5">
        @switch (tab()) {
          @case ('calendario') {
            <div class="mb-4 flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-1 rounded-field border border-border-card bg-surface p-1">
                <app-button variant="icon" size="sm" ariaLabel="Semana anterior" (pressed)="shift(-7)"><app-icon name="chevron-left" [size]="17" /></app-button>
                <span class="min-w-[150px] text-center text-[13px] font-bold text-primary">{{ asDate(days()[0].key) | date: 'd MMM' }} – {{ asDate(days()[days().length - 1].key) | date: 'd MMM' }}</span>
                <app-button variant="icon" size="sm" ariaLabel="Semana siguiente" (pressed)="shift(7)"><app-icon name="chevron-right" [size]="17" /></app-button>
              </div>
              @if (offset() !== 0) { <app-button variant="ghost" size="sm" (pressed)="go({ desde: null })">Hoy</app-button> }
              <div class="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-text-body">
                @for (c of store.activeChannels(); track c.id) {
                  <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-[3px]" [style.background]="color(c.kind)"></span>{{ c.name }}</span>
                }
                <span class="flex items-center gap-1.5"><span class="pend-swatch h-2.5 w-4 rounded-[3px]"></span>Por confirmar</span>
              </div>
            </div>
            @if (store.loading()) {
              <div class="skeleton h-[480px] w-full !rounded-card"></div>
            } @else if (!store.properties().length) {
              <div class="rounded-card border border-border-card bg-surface shadow-e1"><app-empty-state kind="properties" title="Sin propiedades activas" message="Da de alta propiedades para ver su ocupación." /></div>
            } @else {
              <app-occupancy-calendar [days]="days()" [rows]="store.properties()" [reservations]="store.reservations()" (open)="go({ ver: $event.id })" (create)="openCreate($event)" />
              <p class="mt-3 text-[12px] text-text-secondary">Pasa el cursor por una estancia para ver huésped y depósito.{{ store.canManage() ? ' Arrastra sobre días libres de una propiedad para crear una reserva directa.' : '' }}</p>
            }
          }
          @case ('lista') {
            <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
              <app-input class="min-w-0 lg:w-[300px]" type="search" icon="search" [compact]="true" placeholder="Código, huésped o propiedad" ariaLabel="Buscar reservas" [(value)]="search" />
              <app-filter-chips [options]="statusChips()" [value]="estado() ?? 'upcoming'" (valueChange)="go({ estado: $event === 'upcoming' ? null : $event })" ariaLabel="Estado" />
            </div>
            <app-data-table [columns]="cols" [rows]="list()" [rowKey]="key" [loading]="store.loading()" [activeKey]="ver() ?? null" (rowClick)="go({ ver: $event.id })">
              <ng-template appCell="guest" let-r>
                <div class="flex items-center gap-2.5">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-pill" [style.background]="color(r.channel_kind)"></span>
                  <div class="min-w-0">
                    <div class="truncate text-[13px] font-bold text-primary" [class.italic]="!r.guest_name">{{ name(r) }}</div>
                    <div class="text-[11px] text-text-secondary"><span class="font-mono">{{ r.code }}</span> · {{ r.channel_name }}</div>
                  </div>
                </div>
              </ng-template>
              <ng-template appCell="property" let-r><span class="font-mono text-[12px] font-bold text-primary">{{ r.property_code }}</span></ng-template>
              <ng-template appCell="dates" let-r><span class="tabular whitespace-nowrap">{{ asDate(r.check_in_date) | date: 'd MMM' }} → {{ asDate(r.check_out_date) | date: 'd MMM' }}</span> <span class="text-text-secondary">· {{ r.nights }} n</span></ng-template>
              <ng-template appCell="status" let-r>
                @if (r.incomplete) {
                  <app-badge tone="warning" size="sm" icon="alert-triangle">Completar</app-badge>
                } @else {
                  <app-badge [tone]="st(r).tone" size="sm">{{ st(r).label }}</app-badge>
                }
              </ng-template>
              <ng-template appCell="deposit" let-r>
                @if (r.deposit_amount) { <span class="tabular">{{ money(r.deposit_amount) }}</span> <span class="block text-[11px] text-text-secondary">{{ dep(r) }}</span> } @else { <span class="text-text-muted">—</span> }
              </ng-template>
            </app-data-table>
          }
          @case ('huespedes') { <app-guests-panel [active]="huesped() ?? null" (opened)="go({ huesped: $event })" /> }
          @default {
            <app-channels-panel (editChannel)="go({ canal: $event.id })" (newFeed)="go({ calendario: 'nuevo' })" (editFeed)="go({ calendario: $event.id })" />
            @if (store.canManage()) { <app-button class="mt-4 block" variant="secondary" size="sm" (pressed)="go({ canal: 'nuevo' })"><app-icon name="plus" [size]="15" /> Nuevo canal</app-button> }
          }
        }
      </div>
    }

    <app-drawer [open]="!!ver()" (openChange)="!$event && go({ ver: null })" label="Reserva" [width]="560">
      @if (store.detail(); as r) {
        <app-reservation-detail [reservation]="r" (edit)="go({ editar: r.id })" />
        @if (actions().length) {
          <div drawer-footer class="material-glass flex flex-wrap justify-end gap-2.5 border-t border-divider px-6 py-4">
            @for (a of actions(); track a.key) {
              <app-button [variant]="a.variant" [loading]="store.busy() === r.id && pending() === a.key" (pressed)="run(a.key)">{{ a.label }}</app-button>
            }
          </div>
        }
      } @else if (ver()) {
        <div class="space-y-3 p-6"><div class="skeleton h-28 !rounded-card"></div><div class="skeleton h-64 !rounded-card"></div></div>
      }
    </app-drawer>

    <app-drawer [open]="creating() || !!editar()" (openChange)="!$event && go({ nueva: null, editar: null })" [label]="editar() ? 'Editar reserva' : 'Nueva reserva'" [width]="540">
      @if (creating()) {
        <app-reservation-form [preset]="preset()" (saved)="go({ nueva: null, ver: $event })" (cancel)="go({ nueva: null })" />
      } @else if (editar() && store.detail()?.id === editar()) {
        <app-reservation-form [editing]="store.detail()" (saved)="go({ editar: null, ver: $event })" (cancel)="go({ editar: null })" />
      }
    </app-drawer>

    <app-drawer [open]="!!huesped()" (openChange)="!$event && go({ huesped: null })" label="Huésped" [width]="500">
      @if (store.guestDetail(); as g) {
        <app-guest-detail [guest]="g" (openReservation)="go({ huesped: null, tab: 'lista', ver: $event })" />
      }
    </app-drawer>

    <app-drawer [open]="!!canal()" (openChange)="!$event && go({ canal: null })" label="Canal" [width]="480">
      @if (canal()) {
        <app-channel-form [channel]="channelToEdit()" (saved)="go({ canal: null })" (cancel)="go({ canal: null })" />
      }
    </app-drawer>

    <app-drawer [open]="!!calendario()" (openChange)="!$event && go({ calendario: null })" label="Calendario iCal" [width]="480">
      @if (calendario()) {
        <app-feed-form [feed]="feedToEdit()" (saved)="go({ calendario: null })" (cancel)="go({ calendario: null })" />
      }
    </app-drawer>
  `,
  styles: `
    .pend-swatch { background: repeating-linear-gradient(135deg, #fff 0 3px, var(--color-text-muted) 3px 4px); border: 1px dashed var(--color-text-muted); }
  `,
})
export class ReservationsComponent {
  protected readonly store = inject(ReservationsStore);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly tab = input<string, string | undefined>('calendario', { transform: (v) => v || 'calendario' });
  readonly estado = input<string | undefined>();
  readonly ver = input<string | undefined>();
  readonly nueva = input<string | undefined>();
  readonly editar = input<string | undefined>();
  readonly huesped = input<string | undefined>();
  readonly canal = input<string | undefined>();
  readonly calendario = input<string | undefined>();
  readonly desde = input<string | undefined>();

  protected readonly today = dayKey();
  protected readonly plural = plural;
  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly color = channelColor;
  protected readonly name = guestLabel;
  protected readonly st = (r: Reservation) => RES_STATUS[r.status];
  protected readonly dep = (r: Reservation) => DEPOSIT_STATUS[r.deposit_status].label;
  protected readonly key = (r: Reservation) => r.id;
  protected readonly search = signal('');
  protected readonly pending = signal<string | null>(null);
  protected readonly preset = signal<ReservationPreset>({ property_id: null, from: null, to: null });

  protected readonly subtitle = computed(() => {
    const t = this.store.today();
    if (!t) return 'Ocupación, huéspedes y canales.';
    return `Hoy: ${plural(t.arrivals, 'llegada', 'llegadas')} · ${plural(t.departures, 'salida', 'salidas')} · ${plural(t.in_house, 'estancia', 'estancias')} en curso`;
  });
  protected readonly tabs = computed(() => [
    { value: 'calendario', label: 'Calendario' },
    { value: 'lista', label: 'Reservas', count: this.store.today()?.incomplete || null, attention: true },
    ...(this.store.canGuests() ? [{ value: 'huespedes', label: 'Huéspedes' }] : []),
    ...(this.store.canManage() ? [{ value: 'canales', label: 'Canales e iCal', count: this.store.badFeeds() || null, attention: true }] : []),
  ]);

  /** Días visibles: 24 como mínimo y más si la pantalla es ancha (46 px por día + 180 de la columna de propiedad). */
  private readonly span = Math.max(24, Math.floor((window.innerWidth - 66 - 180) / 46));
  protected readonly offset = computed(() => Number(this.desde() ?? 0) || 0);
  protected readonly days = computed<OccDay[]>(() => {
    const start = addDays(new Date(), -3 + this.offset());
    return Array.from({ length: this.span }, (_, i) => {
      const d = addDays(start, i);
      const k = toDayKey(d);
      return { key: k, weekday: WD[d.getDay()], day: d.getDate(), today: k === this.today, weekend: d.getDay() === 0 || d.getDay() === 6, monthLabel: i === 0 || d.getDate() === 1 ? MONTHS[d.getMonth()] : null };
    });
  });

  protected readonly statusChips = computed(() => {
    const all = this.store.reservations();
    const c = (fn: (r: Reservation) => boolean) => all.filter(fn).length;
    return [
      { value: 'upcoming', label: 'Próximas', count: c((r) => this.upcoming(r)) },
      { value: 'incomplete', label: 'Por completar', count: c((r) => r.incomplete), dot: 'var(--color-warning)' },
      { value: 'checked_in', label: 'En casa', count: c((r) => r.status === 'checked_in') },
      { value: 'past', label: 'Pasadas', count: c((r) => r.status === 'checked_out' || (isLive(r) && r.check_out_date < this.today)) },
      { value: 'cancelled', label: 'Canceladas', count: c((r) => !isLive(r)) },
    ];
  });

  protected readonly list = computed(() => {
    const e = this.estado() ?? 'upcoming';
    const q = this.search().trim().toLowerCase();
    const match = (r: Reservation) => {
      switch (e) {
        case 'incomplete': return r.incomplete;
        case 'checked_in': return r.status === 'checked_in';
        case 'past': return r.status === 'checked_out' || (isLive(r) && r.check_out_date < this.today);
        case 'cancelled': return !isLive(r);
        default: return this.upcoming(r);
      }
    };
    const text = (r: Reservation) => `${r.code} ${r.guest_name ?? ''} ${r.property_code} ${r.property_name} ${r.external_summary ?? ''}`.toLowerCase();
    return this.store
      .reservations()
      .filter((r) => match(r) && (q.length < 2 || text(r).includes(q)))
      .sort((a, b) => (e === 'past' || e === 'cancelled' ? b.check_in_date.localeCompare(a.check_in_date) : a.check_in_date.localeCompare(b.check_in_date)));
  });

  protected readonly cols: TableColumn<Reservation>[] = [
    { key: 'guest', label: 'Huésped', sortable: true, value: (r) => r.guest_name ?? '' },
    { key: 'property', label: 'Propiedad', sortable: true, priority: 'md', width: '110px', value: (r) => r.property_code },
    { key: 'dates', label: 'Fechas', sortable: true, value: (r) => r.check_in_date },
    { key: 'status', label: 'Estado', sortable: true, width: '140px', value: (r) => r.status },
    { key: 'deposit', label: 'Depósito', align: 'right', priority: 'lg', width: '130px', value: (r) => r.deposit_amount ?? 0 },
  ];

  protected readonly creating = computed(() => this.nueva() !== undefined);
  protected readonly channelToEdit = computed(() => this.store.channels().find((c) => c.id === this.canal()) ?? null);
  protected readonly feedToEdit = computed(() => (this.store.feeds() ?? []).find((f) => f.id === this.calendario()) ?? null);

  /** Acciones del ciclo según estado y permisos (pie del drawer). */
  protected readonly actions = computed(() => {
    const r = this.store.detail();
    if (!r) return [];
    const out: { key: string; label: string; variant: 'primary' | 'secondary' | 'tertiary' | 'ghost' }[] = [];
    const arrived = r.check_in_date <= this.today;
    if (this.store.canManage() && (r.status === 'pending' || r.status === 'confirmed')) out.push({ key: 'cancel', label: 'Cancelar', variant: 'ghost' });
    if (this.store.canManage() && r.status === 'confirmed' && arrived) out.push({ key: 'no-show', label: 'No llegó', variant: 'ghost' });
    if (this.store.canManage() && (r.status === 'confirmed' || r.status === 'checked_in') && r.guest_email) out.push({ key: 'resend', label: 'Reenviar correo', variant: 'tertiary' });
    if (this.store.canManage() && r.status === 'pending') out.push({ key: 'confirm', label: 'Confirmar', variant: 'primary' });
    if (this.store.canCheckin() && r.status === 'confirmed' && arrived) out.push({ key: 'check-in', label: 'Registrar check-in', variant: 'primary' });
    if (this.store.canCheckin() && r.status === 'checked_in') out.push({ key: 'check-out', label: 'Registrar check-out', variant: 'primary' });
    return out;
  });

  constructor() {
    void this.store.load();
    // La ficha, la del huésped y la ventana del calendario siguen a la URL.
    effect(() => {
      const id = this.ver();
      untracked(() => (id ? void this.store.open(id) : this.store.close()));
    });
    effect(() => {
      const id = this.editar();
      untracked(() => {
        if (id && this.store.detail()?.id !== id) void this.store.open(id);
      });
    });
    effect(() => {
      const id = this.huesped();
      untracked(() => {
        if (id) void this.store.openGuest(id);
      });
    });
    effect(() => {
      const d = this.days();
      untracked(() => void this.store.ensureRange(d[0].key, d[d.length - 1].key));
    });
  }

  protected go(params: Record<string, string | null>): void {
    const modal = ['ver', 'nueva', 'editar', 'huesped', 'canal', 'calendario'].some((k) => k in params);
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: !modal });
  }

  protected shift(n: number): void {
    const next = this.offset() + n;
    this.go({ desde: next === 0 ? null : String(next) });
  }

  protected asDate(k: string): Date {
    return new Date(`${k}T12:00:00`);
  }

  private upcoming(r: Reservation): boolean {
    return isLive(r) && r.status !== 'checked_out' && r.check_out_date >= this.today;
  }

  protected openCreate(range: OccRange | null): void {
    if (!this.store.canManage()) return;
    this.preset.set({ property_id: range?.property_id ?? null, from: range?.from ?? null, to: range?.to ?? null });
    this.go({ nueva: '1' });
  }

  protected async run(action: string): Promise<void> {
    const r = this.store.detail();
    if (!r) return;
    this.pending.set(action);
    try {
      switch (action) {
        case 'confirm': await this.confirmIt(); break;
        case 'cancel': await this.stop('cancel'); break;
        case 'no-show': await this.stop('no-show'); break;
        case 'check-out': await this.checkout(); break;
        default: await this.store.move(r, action as 'check-in' | 'resend');
      }
    } finally {
      this.pending.set(null);
    }
  }

  private async confirmIt(): Promise<void> {
    const r = this.store.detail()!;
    if (!r.primary_guest_id) {
      await this.confirm.ask({ title: 'Falta el huésped', message: 'Agrega al huésped principal en la pestaña Huéspedes y vuelve a confirmar.', confirmLabel: 'Entendido' });
      return;
    }
    const ok = await this.confirm.ask({
      title: `Confirmar ${r.code}`,
      message: r.guest_email ? `Le enviamos a ${r.guest_name} el correo con fechas e instrucciones (${r.guest_email}).` : `${r.guest_name} no tiene correo: se confirma sin avisarle.`,
      confirmLabel: 'Confirmar',
    });
    if (ok) await this.store.confirm(r, true);
  }

  private async stop(action: 'cancel' | 'no-show'): Promise<void> {
    const r = this.store.detail()!;
    const reason = await this.confirm.askReason(action === 'cancel'
      ? { title: `Cancelar ${r.code}`, message: `${guestLabel(r)} · ${r.property_code}. Se libera el calendario${r.status === 'confirmed' && r.guest_email ? ' y se avisa al huésped' : ''}.`, confirmLabel: 'Cancelar reserva', tone: 'danger', reasons: ['Lo pidió el huésped', 'Pago no recibido', 'Duplicada'] }
      : { title: `${guestLabel(r)} no llegó`, message: 'Se libera el calendario desde hoy. Si dejó depósito, devuélvelo desde la ficha.', confirmLabel: 'Marcar no llegó', tone: 'danger', reasons: ['No llegó ni avisó', 'Avisó que no vendrá'] });
    if (reason) await this.store.stop(r, action, reason);
  }

  private async checkout(): Promise<void> {
    const r = this.store.detail()!;
    const ok = await this.confirm.ask({
      title: 'Registrar check-out',
      message: `${guestLabel(r)} deja ${r.property_name}.${r.deposit_amount ? ' Después registra la inspección de salida para devolver el depósito.' : ''}`,
      confirmLabel: 'Registrar check-out',
    });
    if (ok) await this.store.move(r, 'check-out');
  }
}
