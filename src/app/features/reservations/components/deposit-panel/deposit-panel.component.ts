import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReservationsStore } from '../../store/reservations.store';
import { DEPOSIT_STATUS, DepositTxType, PAY_METHOD, PayMethod, ReservationDetail } from '../../models/reservation.model';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { gtq } from '../../../../shared/utils/time';

const TX_LABEL: Record<DepositTxType, string> = { received: 'Recibido', returned: 'Devuelto', retained: 'Retenido' };

/**
 * Depósito de la reserva (W-H3): cuánto se pidió, lo recibido, devuelto y
 * retenido; los movimientos (inmutables) y el registro de uno nuevo. Las reglas
 * las aplica la API: devolver o retener necesita la inspección de salida, y
 * retener, un hallazgo con cargo. Aquí solo se ofrece lo que tiene sentido.
 */
@Component({
  selector: 'app-deposit-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, BadgeComponent, ButtonComponent, IconComponent, InputComponent, SelectComponent, FormFieldComponent, SegmentedComponent],
  template: `
    @let r = reservation();
    @let d = r.deposit;
    @if (!d.available) {
      <p class="rounded-field bg-surface-soft px-3.5 py-3 text-[12.5px] text-text-secondary">Tu rol no ve el depósito de las reservas.</p>
    } @else {
      <div class="flex items-center justify-between">
        <div>
          <div class="text-[11px] uppercase tracking-[1px] text-text-secondary">Depósito</div>
          <div class="tabular font-display text-[24px] font-semibold text-primary">{{ d.amount ? money(d.amount) : 'No aplica' }}</div>
        </div>
        <app-badge [tone]="status(d.status).tone">{{ status(d.status).label }}</app-badge>
      </div>
      @if (d.received) {
        <dl class="mt-4 grid grid-cols-2 gap-2.5 text-[12.5px] sm:grid-cols-4">
          @for (k of figures(); track k.label) {
            <div class="rounded-field bg-surface-soft px-3 py-2.5"><dt class="text-text-secondary">{{ k.label }}</dt><dd class="tabular mt-0.5 font-bold text-primary">{{ money(k.value) }}</dd></div>
          }
        </dl>
      }
      @if (hint(); as h) {
        <p class="mt-4 flex gap-2 rounded-field border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-warning">
          <app-icon name="alert-triangle" [size]="16" class="mt-0.5 shrink-0" /> {{ h }}
        </p>
      }

      @if (store.canDeposits() && kinds().length) {
        <section class="mt-5 rounded-card border border-border-card p-4" aria-label="Registrar movimiento">
          <h3 class="text-[13px] font-bold text-primary">Registrar movimiento</h3>
          <app-segmented class="mt-3 block" [options]="kinds()" [value]="fType()" (valueChange)="setType($event)" ariaLabel="Tipo de movimiento" />
          <div class="mt-3 grid grid-cols-2 gap-3">
            <app-form-field label="Monto (Q)" for="dp-amount" [error]="fieldError('body.amount')">
              <input id="dp-amount" type="number" min="0" step="0.01" class="field-native tabular" [value]="fAmount()" (input)="fAmount.set($any($event.target).value)" />
            </app-form-field>
            <app-form-field label="Forma"><app-select [compact]="true" [options]="methods" [(value)]="fMethod" ariaLabel="Forma de pago" /></app-form-field>
          </div>
          <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <app-input [compact]="true" [maxlength]="128" placeholder="Referencia (boleta, transferencia)" ariaLabel="Referencia" [(value)]="fRef" />
            <app-input [compact]="true" [maxlength]="1000" placeholder="Nota" ariaLabel="Nota" [(value)]="fNotes" />
          </div>
          @if (generalError(); as e) { <p class="mt-2 text-[12.5px] font-bold text-danger">{{ e }}</p> }
          <div class="mt-3 flex items-center justify-between gap-3">
            <span class="text-[12px] text-text-secondary">Le avisamos al huésped por correo.</span>
            <app-button variant="primary" size="sm" [disabled]="!(+fAmount() > 0)" [loading]="store.busy() === 'deposit'" (pressed)="save()">Registrar</app-button>
          </div>
        </section>
      }

      <h3 class="mb-2 mt-6 text-[12px] font-bold uppercase tracking-[1px] text-text-secondary">Movimientos</h3>
      <ul class="divide-y divide-divider rounded-card border border-border-card">
        @for (t of d.transactions; track t.id) {
          <li class="flex items-center gap-3 px-4 py-3 text-[13px]">
            <span class="tx flex h-8 w-8 shrink-0 items-center justify-center rounded-pill" [attr.data-kind]="t.type">
              <app-icon [name]="t.type === 'received' ? 'arrow-down' : t.type === 'returned' ? 'arrow-up' : 'lock'" [size]="15" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="font-bold text-primary">{{ txLabel[t.type] }} · {{ method(t.method) }}</div>
              <div class="truncate text-[12px] text-text-secondary">{{ t.registered_by_name ?? 'ARGOS' }} · {{ t.created_at | date: 'd MMM, HH:mm' }}{{ t.reference ? ' · ' + t.reference : '' }}</div>
            </div>
            <span class="tabular font-bold" [class.text-danger]="t.type === 'retained'">{{ money(t.amount) }}</span>
          </li>
        } @empty {
          <li class="px-4 py-4 text-center text-[12.5px] text-text-secondary">Sin movimientos todavía.</li>
        }
      </ul>
    }
  `,
  styles: `
    .tx { background: var(--color-teal-washed); color: var(--color-teal-muted); }
    .tx[data-kind='returned'] { background: var(--color-success-soft); color: var(--color-success); }
    .tx[data-kind='retained'] { background: var(--color-danger-soft); color: var(--color-danger); }
  `,
})
export class DepositPanelComponent {
  protected readonly store = inject(ReservationsStore);
  readonly reservation = input.required<ReservationDetail>();

  protected readonly txLabel = TX_LABEL;
  protected readonly status = (s: keyof typeof DEPOSIT_STATUS) => DEPOSIT_STATUS[s];
  protected readonly method = (m: PayMethod) => PAY_METHOD[m];
  protected readonly money = (v: number) => gtq(v, 2);
  protected readonly methods = (Object.keys(PAY_METHOD) as PayMethod[]).map((m) => ({ value: m, label: PAY_METHOD[m] }));
  protected readonly fType = signal<string>('received');
  protected readonly fAmount = signal('');
  protected readonly fMethod = signal<PayMethod>('cash');
  protected readonly fRef = signal('');
  protected readonly fNotes = signal('');

  protected readonly figures = computed(() => {
    const d = this.reservation().deposit;
    return [
      { label: 'Recibido', value: d.received },
      { label: 'Devuelto', value: d.returned },
      { label: 'Retenido', value: d.retained },
      { label: 'Saldo', value: d.balance },
    ];
  });

  private readonly closed = computed(() => ['cancelled', 'no_show'].includes(this.reservation().status));

  /** Movimientos posibles ahora. */
  protected readonly kinds = computed(() => {
    const r = this.reservation();
    const d = r.deposit;
    const out: { value: string; label: string }[] = [];
    if (!this.closed() && (d.amount ?? 0) > d.received + 0.001) out.push({ value: 'received', label: 'Recibir' });
    if (d.balance > 0 && (this.closed() || (r.status === 'checked_out' && !d.inspection_required))) {
      if (!this.closed() && d.charges > 0) out.push({ value: 'retained', label: 'Retener' });
      out.push({ value: 'returned', label: 'Devolver' });
    }
    return out;
  });

  protected readonly hint = computed(() => {
    const r = this.reservation();
    const d = r.deposit;
    if (!d.amount || this.closed()) return null;
    if (d.status === 'pending' && r.has_checkin && (r.status === 'pending' || r.status === 'confirmed')) return 'El check-in pide el depósito recibido.';
    if (r.status === 'checked_out' && d.balance > 0 && d.inspection_required) return 'Para devolverlo o retenerlo, primero registra la inspección de salida.';
    if (r.status === 'checked_out' && d.balance > 0 && d.charges > 0 && d.retained === 0) return `La inspección tiene cargos por ${gtq(d.charges, 2)}: registra primero lo que se retiene.`;
    return null;
  });

  protected readonly generalError = computed(() => {
    const e = this.store.saveError();
    return e && !e.errors.some((x) => x.location === 'body.amount') ? e.detail : null;
  });

  constructor() {
    // Cada vez que cambian las opciones, el tipo y el monto sugerido se ajustan.
    effect(() => {
      const kinds = this.kinds();
      const d = this.reservation().deposit;
      void d;
      untracked(() => this.setType(kinds.some((k) => k.value === this.fType()) ? this.fType() : (kinds[0]?.value ?? 'received')));
    });
  }

  /** Elige el tipo y sugiere el monto: lo que falta recibir, los cargos o el saldo. */
  protected setType(type: string): void {
    const d = this.reservation().deposit;
    this.fType.set(type);
    const suggested = type === 'received' ? (d.amount ?? 0) - d.received : type === 'retained' ? Math.min(d.charges, d.balance) : d.balance;
    this.fAmount.set(suggested > 0 ? String(Math.round(suggested * 100) / 100) : '');
  }

  protected fieldError(loc: string): string | null {
    return this.store.saveError()?.errors.find((e) => e.location === loc)?.message ?? null;
  }

  protected async save(): Promise<void> {
    const ok = await this.store.depositTx(this.reservation(), {
      type: this.fType() as DepositTxType, amount: Number(this.fAmount()), method: this.fMethod(),
      reference: this.fRef().trim() || null, notes: this.fNotes().trim() || null,
    });
    if (ok) {
      this.fRef.set('');
      this.fNotes.set('');
    }
  }
}
