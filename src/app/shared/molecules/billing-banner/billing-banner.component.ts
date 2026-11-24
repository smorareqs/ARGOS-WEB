import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '../../../core/store/session.store';
import { IconComponent } from '../../atoms/icon/icon.component';

/**
 * Aviso de facturación arriba del contenido (fase 6): pago vencido (ámbar) o
 * empresa en solo lectura (rojo, toda escritura responde 402). Lleva a
 * Facturación a quien puede pagar; al resto le dice a quién acudir.
 */
@Component({
  selector: 'app-billing-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    @if (state(); as s) {
      <div role="status" class="mb-5 flex flex-wrap items-center gap-3 rounded-card border px-4 py-3 text-[13px]" [class]="s.readOnly ? 'border-danger/30 bg-danger-soft' : 'border-warning/30 bg-warning-soft'">
        <app-icon [name]="s.readOnly ? 'lock' : 'alert-triangle'" [size]="18" [class]="s.readOnly ? 'text-danger' : 'text-warning'" />
        <p class="min-w-0 flex-1 text-text-body"><b class="text-primary">{{ s.title }}</b> {{ s.body }}</p>
        @if (canPay()) {
          <a routerLink="/configuracion" [queryParams]="{ tab: 'facturacion' }" class="rounded-[8px] bg-action px-3 py-1.5 text-[12.5px] font-bold text-on-action">Ir a Facturación</a>
        }
      </div>
    }
  `,
})
export class BillingBannerComponent {
  private readonly session = inject(SessionStore);
  protected readonly canPay = computed(() => this.session.can('tenant.billing'));
  protected readonly state = computed(() => {
    const t = this.session.tenant();
    const who = this.canPay() ? '' : ' Pide a quien administra la cuenta que se ponga al día.';
    switch (t?.billing_status) {
      case 'suspended':
        return { readOnly: true, title: 'Solo lectura.', body: `Hay una factura sin pagar: puedes consultar todo, pero no crear ni cambiar nada hasta pagarla.${who}` };
      case 'cancelled':
        return { readOnly: true, title: 'Solo lectura.', body: `La suscripción terminó: elige un plan para volver a operar.${who}` };
      case 'past_due':
        return { readOnly: false, title: 'Pago vencido.', body: `Si no se paga en los próximos días, la empresa queda en solo lectura.${who}` };
      default:
        return null;
    }
  });
}
