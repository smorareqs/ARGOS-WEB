import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { ReservationsStore } from '../../store/reservations.store';
import { CHANNEL_KINDS, Channel, Feed, channelColor } from '../../models/reservation.model';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { CellDefDirective, DataTableComponent, TableColumn } from '../../../../shared/organisms/data-table/data-table.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';
import { gtq } from '../../../../shared/utils/time';
import { plural } from '../../../../shared/utils/plural';

/**
 * W-H6 · Canales e iCal: reglas de cada canal (depósito y check-in) y, por
 * propiedad, las URLs iCal con su última sincronización y el error del canal
 * en palabras.
 */
@Component({
  selector: 'app-channels-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, CellDefDirective, BadgeComponent, ButtonComponent, IconComponent, EmptyStateComponent, RelativeDatePipe],
  template: `
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      @for (c of store.channels(); track c.id; let i = $index) {
        <article class="reveal flex flex-col rounded-card border border-border-card bg-surface p-5 shadow-e1" [class.opacity-60]="!c.is_active" [style.--i]="i">
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-[4px]" [style.background]="color(c)"></span>
            <h3 class="min-w-0 flex-1 truncate text-[15px] font-bold text-primary">{{ c.name }}</h3>
            @if (!c.is_active) { <app-badge tone="muted" size="sm">Inactivo</app-badge> }
          </div>
          <div class="mt-0.5 text-[11.5px] uppercase tracking-[1px] text-text-secondary">{{ kinds[c.kind] }}</div>
          <ul class="mt-4 space-y-2 text-[12.5px]">
            <li class="flex items-center gap-2" [class]="c.requires_deposit ? 'text-primary' : 'text-text-secondary'"><app-icon [name]="c.requires_deposit ? 'check' : 'x'" [size]="15" />{{ c.requires_deposit ? 'Depósito' + (c.default_deposit_amount ? ' de ' + money(c.default_deposit_amount) : '') : 'Sin depósito (lo cubre el canal)' }}</li>
            <li class="flex items-center gap-2" [class]="c.has_checkin ? 'text-primary' : 'text-text-secondary'"><app-icon [name]="c.has_checkin ? 'check' : 'x'" [size]="15" />{{ c.has_checkin ? 'Registro y check-in formal' : 'Entrada y salida automáticas' }}</li>
            <li class="flex items-center gap-2 text-text-secondary"><app-icon name="calendar-check" [size]="15" />{{ c.kind === 'direct' ? 'Se crean desde ARGOS' : plural(c.feeds_count, 'calendario iCal', 'calendarios iCal') }}</li>
          </ul>
          <div class="mt-auto flex items-center justify-between pt-4 text-[12px] text-text-secondary">
            <span>{{ plural(c.upcoming_count, 'reserva viva', 'reservas vivas') }}</span>
            @if (store.canManage()) { <app-button variant="link" size="sm" (pressed)="editChannel.emit(c)">Editar</app-button> }
          </div>
        </article>
      }
    </div>

    <div class="mb-3 mt-8 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-[15px] font-bold text-primary">Calendarios iCal por propiedad</h2>
        <p class="text-[12.5px] text-text-secondary">Se leen cada 30 minutos. Lo que llega sin huésped queda por completar.</p>
      </div>
      @if (store.canManage()) { <app-button variant="secondary" size="sm" (pressed)="newFeed.emit()"><app-icon name="plus" [size]="15" /> Agregar calendario</app-button> }
    </div>
    @if (store.feeds() && !store.feeds()!.length) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="properties" title="Sin calendarios iCal" message="Pega la URL de exportación de Airbnb o Booking.com de cada propiedad para traer sus reservas solas." />
      </div>
    } @else {
      <app-data-table [columns]="cols" [rows]="store.feeds() ?? []" [rowKey]="key" [loading]="!store.feeds()">
        <ng-template appCell="property" let-f><span class="font-mono text-[12px] font-bold text-primary">{{ f.property_code }}</span><div class="truncate text-[11.5px] text-text-secondary">{{ f.property_name }}</div></ng-template>
        <ng-template appCell="channel" let-f><span class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-pill" [style.background]="feedColor(f)"></span>{{ f.channel_name }}</span></ng-template>
        <ng-template appCell="url" let-f><span class="block max-w-[460px] truncate font-mono text-[11.5px] text-text-secondary" [title]="f.url">{{ f.url }}</span></ng-template>
        <ng-template appCell="state" let-f>
          @if (!f.is_active) {
            <span class="text-text-muted">En pausa</span>
          } @else if (f.last_error) {
            <span class="flex items-start gap-1.5 text-danger"><app-icon name="alert-triangle" [size]="15" class="mt-0.5 shrink-0" /><span class="line-clamp-2">{{ f.last_error }}</span></span>
          } @else if (f.last_success_at) {
            <span class="flex items-center gap-1.5 text-success"><app-icon name="check-circle" [size]="15" /> {{ f.last_success_at | relativeDate }}{{ f.events_count !== null ? ' · ' + plural(f.events_count, 'estancia', 'estancias') : '' }}</span>
          } @else {
            <span class="text-text-secondary">Aún no se sincroniza</span>
          }
        </ng-template>
        <ng-template appCell="actions" let-f>
          @if (store.canManage()) {
            <div class="flex justify-end gap-1" (click)="$event.stopPropagation()">
              <app-button variant="icon" size="sm" ariaLabel="Sincronizar este calendario" [loading]="store.busy() === 'sync:' + f.id" [disabled]="!f.is_active" (pressed)="store.sync(f.id)"><app-icon name="refresh" [size]="15" /></app-button>
              <app-button variant="icon" size="sm" [ariaLabel]="f.is_active ? 'Pausar' : 'Reanudar'" (pressed)="store.toggleFeed(f)"><app-icon [name]="f.is_active ? 'pause' : 'play'" [size]="15" /></app-button>
              <app-button variant="icon" size="sm" ariaLabel="Editar la URL" (pressed)="editFeed.emit(f)"><app-icon name="pencil" [size]="15" /></app-button>
              <app-button variant="icon" size="sm" ariaLabel="Quitar el calendario" (pressed)="remove(f)"><app-icon name="trash" [size]="15" /></app-button>
            </div>
          }
        </ng-template>
      </app-data-table>
    }
  `,
})
export class ChannelsPanelComponent {
  protected readonly store = inject(ReservationsStore);
  private readonly confirm = inject(ConfirmService);
  readonly editChannel = output<Channel>();
  readonly newFeed = output<void>();
  readonly editFeed = output<Feed>();

  protected readonly kinds = CHANNEL_KINDS;
  protected readonly plural = plural;
  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly color = (c: Channel) => channelColor(c.kind);
  protected readonly feedColor = (f: Feed) => channelColor(f.channel_kind);
  protected readonly key = (f: Feed) => f.id;
  protected readonly cols: TableColumn<Feed>[] = [
    { key: 'property', label: 'Propiedad', sortable: true, width: '170px', value: (f) => f.property_code },
    { key: 'channel', label: 'Canal', sortable: true, width: '130px', value: (f) => f.channel_name },
    { key: 'url', label: 'URL', priority: 'lg' },
    { key: 'state', label: 'Última lectura', sortable: true, value: (f) => (f.last_error ? 0 : 1) },
    { key: 'actions', label: '', width: '150px' },
  ];

  constructor() {
    void this.store.loadFeeds();
  }

  protected async remove(f: Feed): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Quitar el calendario de ${f.channel_name}`,
      message: `${f.property_code} deja de leerlo. Las reservas que ya importó se quedan.`,
      confirmLabel: 'Quitar', tone: 'danger',
    });
    if (ok) await this.store.deleteFeed(f);
  }
}
