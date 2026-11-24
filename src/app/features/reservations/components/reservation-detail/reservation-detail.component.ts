import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReservationsStore } from '../../store/reservations.store';
import { DEPOSIT_STATUS, RES_STATUS, ResEvent, ReservationDetail, channelColor, guestLabel } from '../../models/reservation.model';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { TabsComponent } from '../../../../shared/molecules/tabs/tabs.component';
import { ReservationGuestsComponent } from '../reservation-guests/reservation-guests.component';
import { DepositPanelComponent } from '../deposit-panel/deposit-panel.component';
import { InspectionsPanelComponent } from '../inspections-panel/inspections-panel.component';
import { gtq } from '../../../../shared/utils/time';

const KIND_LABEL: Record<string, string> = { pre_arrival: 'antes de la llegada', post_departure: 'después de la salida' };
const FIELD_LABEL: Record<string, string> = {
  dates: 'las fechas', times: 'las horas', channel_id: 'el canal', adults: 'los adultos', children: 'los niños',
  total_amount: 'el monto', deposit_amount: 'el depósito', notes: 'las notas',
};

/**
 * Ficha de reserva en el drawer (W-H3): canal, código, huésped, propiedad,
 * fechas y estado; pestañas de huéspedes (registro), depósito, inspecciones
 * e historial. Las acciones del ciclo van fijas abajo (las pone la página).
 * Parqueo, áreas comunes, alarmas y chat llegan con los módulos de Persona B.
 */
@Component({
  selector: 'app-reservation-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, BadgeComponent, ButtonComponent, IconComponent, TabsComponent, ReservationGuestsComponent, DepositPanelComponent, InspectionsPanelComponent],
  template: `
    @let r = reservation();
    <header class="border-b border-divider bg-surface px-6 pb-5 pt-6">
      <div class="pr-10">
        <div class="flex items-center gap-2 text-[12px] font-bold" [style.color]="color()"><span class="h-2.5 w-2.5 rounded-pill" [style.background]="color()"></span>{{ r.channel_name }}<span class="font-mono font-normal text-text-secondary">· {{ r.code }}</span></div>
        <h2 class="mt-1 font-display text-[24px] font-semibold leading-tight text-primary">{{ name() }}</h2>
        <p class="mt-0.5 text-[13px] text-text-body"><span class="font-mono font-bold">{{ r.property_code }}</span> · {{ r.property_name }}</p>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <app-badge [tone]="status().tone">{{ status().label }}</app-badge>
        @if (r.deposit_amount) { <app-badge [tone]="deposit().tone" icon="wallet">Depósito {{ deposit().label.toLowerCase() }}</app-badge> }
        @if (r.source === 'ical') { <app-badge tone="neutral" icon="calendar-check">iCal</app-badge> }
        @if (store.canManage() && editable()) { <app-button class="ml-auto" variant="link" size="sm" (pressed)="edit.emit()"><app-icon name="pencil" [size]="14" /> Editar</app-button> }
      </div>
      <dl class="mt-5 grid grid-cols-3 gap-3 text-[12.5px]">
        <div class="rounded-field bg-surface-soft px-3 py-2.5"><dt class="text-text-secondary">Entrada</dt><dd class="mt-0.5 font-bold capitalize text-primary">{{ asDate(r.check_in_date) | date: 'EEE d MMM' }}</dd><dd class="tabular text-[11.5px] text-text-secondary">desde {{ r.check_in_time }}</dd></div>
        <div class="rounded-field bg-surface-soft px-3 py-2.5"><dt class="text-text-secondary">Salida</dt><dd class="mt-0.5 font-bold capitalize text-primary">{{ asDate(r.check_out_date) | date: 'EEE d MMM' }}</dd><dd class="tabular text-[11.5px] text-text-secondary">hasta {{ r.check_out_time }}</dd></div>
        <div class="rounded-field bg-surface-soft px-3 py-2.5"><dt class="text-text-secondary">Estancia</dt><dd class="tabular mt-0.5 font-bold text-primary">{{ r.nights }} {{ r.nights === 1 ? 'noche' : 'noches' }}</dd><dd class="tabular text-[11.5px] text-text-secondary">{{ r.adults + r.children }} pers.{{ r.total_amount ? ' · ' + money(r.total_amount) : '' }}</dd></div>
      </dl>
      @if (r.incomplete) {
        <p class="mt-4 flex gap-2 rounded-field border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-[12.5px] text-warning">
          <app-icon name="alert-triangle" [size]="16" class="mt-0.5 shrink-0" />
          Llegó de {{ r.channel_name }} sin datos del huésped{{ r.external_summary ? ' (' + r.external_summary + ')' : '' }}. Agrégalo en Huéspedes y confírmala.
        </p>
      }
      @if (r.notes) { <p class="mt-3 whitespace-pre-line rounded-field bg-surface-soft px-3.5 py-2.5 text-[12.5px] text-text-body"><b>Notas:</b> {{ r.notes }}</p> }
      @if (r.cancel_reason) { <p class="mt-3 text-[12.5px] text-text-secondary">Motivo: {{ r.cancel_reason }}</p> }
    </header>
    <div class="px-6"><app-tabs class="mt-2" [options]="tabs()" [(value)]="tab" ariaLabel="Secciones de la reserva" /></div>
    <div class="px-6 py-5">
      @switch (tab()) {
        @case ('deposito') { <app-deposit-panel [reservation]="r" /> }
        @case ('inspecciones') { <app-inspections-panel [reservation]="r" /> }
        @case ('historial') {
          <ol class="relative ml-1.5 border-l border-divider pl-5">
            @for (e of r.events; track e.id) {
              <li class="relative pb-4 last:pb-0">
                <span class="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-pill" [style.background]="dot(e)"></span>
                <div class="text-[13px] text-text-body"><b class="text-primary">{{ e.actor_name ?? 'ARGOS' }}</b> {{ phrase(e) }}</div>
                <div class="mt-0.5 text-[11.5px] text-text-muted">{{ e.created_at | date: 'd MMM, HH:mm' }}</div>
              </li>
            }
          </ol>
        }
        @default { <app-reservation-guests [reservation]="r" /> }
      }
    </div>
  `,
})
export class ReservationDetailComponent {
  protected readonly store = inject(ReservationsStore);
  readonly reservation = input.required<ReservationDetail>();
  readonly edit = output<void>();

  protected readonly tab = signal('huespedes');
  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly color = computed(() => channelColor(this.reservation().channel_kind));
  protected readonly name = computed(() => guestLabel(this.reservation()));
  protected readonly status = computed(() => RES_STATUS[this.reservation().status]);
  protected readonly deposit = computed(() => DEPOSIT_STATUS[this.reservation().deposit_status]);
  protected readonly editable = computed(() => !['cancelled', 'no_show'].includes(this.reservation().status));

  protected readonly tabs = computed(() => {
    const r = this.reservation();
    const pending = r.has_checkin ? r.guests_pending + (r.guests_count ? 0 : 1) : 0;
    const out = [{ value: 'huespedes', label: 'Huéspedes', count: (pending || r.guests_count) || null, attention: pending > 0 }];
    if (r.deposit.available && (r.deposit_amount || r.deposit.transactions.length)) out.push({ value: 'deposito', label: 'Depósito', count: null, attention: false });
    out.push({ value: 'inspecciones', label: 'Inspecciones', count: r.inspections.length || null, attention: false });
    out.push({ value: 'historial', label: 'Historial', count: null, attention: false });
    return out;
  });

  constructor() {
    // Al cambiar de reserva se vuelve a Huéspedes; si la pestaña ya no aplica, también.
    let last = '';
    effect(() => {
      const r = this.reservation();
      const tabs = this.tabs();
      untracked(() => {
        if (r.id !== last || !tabs.some((t) => t.value === this.tab())) this.tab.set('huespedes');
        last = r.id;
      });
    });
  }

  protected asDate(k: string): Date {
    return new Date(`${k}T12:00:00`);
  }

  protected dot(e: ResEvent): string {
    if (e.type === 'cancelled' || e.type === 'no_show' || e.type === 'deposit_retained') return 'var(--color-danger)';
    if (e.type === 'checked_in' || e.type === 'deposit_returned' || e.type === 'confirmed') return 'var(--color-success)';
    if (e.type === 'imported' || e.type === 'synced') return 'var(--color-secondary)';
    return 'var(--color-teal-muted)';
  }

  protected phrase(e: ResEvent): string {
    const d = e.data;
    const s = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : '');
    const amount = typeof d['amount'] === 'number' ? gtq(d['amount'] as number, 2) : '';
    switch (e.type) {
      case 'created': return 'creó la reserva';
      case 'imported': return `la importó del calendario de ${s('channel')}`;
      case 'confirmed': return d['email_sent'] ? 'confirmó la reserva y le enviamos el correo al huésped' : 'confirmó la reserva';
      case 'updated': return `corrigió ${((d['fields'] as string[]) ?? []).map((f) => FIELD_LABEL[f] ?? f).join(', ')}`;
      case 'synced': return `movió las fechas desde ${s('channel')}`;
      case 'guest_added': return `agregó a ${s('guest_name')}${d['primary'] ? ' como huésped principal' : ''}`;
      case 'guest_removed': return `quitó a ${s('guest_name')}`;
      case 'checked_in': return d['auto'] ? 'marcó la entrada a la hora de llegada' : 'registró el check-in';
      case 'checked_out': return d['auto'] ? 'marcó la salida a la hora de salida' : 'registró el check-out';
      case 'cancelled': return `canceló la reserva${s('reason') ? `: ${s('reason')}` : ''}`;
      case 'no_show': return 'marcó que el huésped no llegó';
      case 'email_sent': return d['template'] === 'reminder' ? 'le recordó al huésped su llegada de mañana' : 'reenvió el correo de confirmación';
      case 'deposit_received': return `registró ${amount} de depósito recibido`;
      case 'deposit_returned': return `devolvió ${amount} del depósito`;
      case 'deposit_retained': return `retuvo ${amount} del depósito`;
      case 'inspection': return `registró la inspección ${KIND_LABEL[s('kind')] ?? ''}`;
      case 'finding': return `anotó un hallazgo en ${s('area')}${d['ticket'] ? ' y abrió su incidencia' : ''}`;
      case 'finding_removed': return `quitó el hallazgo de ${s('area')}`;
      default: return e.type;
    }
  }
}
