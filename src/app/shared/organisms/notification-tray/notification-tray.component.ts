import { ChangeDetectionStrategy, Component, computed, inject, model } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationsStore } from '../../../core/store/notifications.store';
import { AppNotification } from '../../../core/http/notifications-api';
import { MOCK_MODULES } from '../../../core/tokens/api.tokens';
import { IconComponent, IconName } from '../../atoms/icon/icon.component';
import { RelativeDatePipe } from '../../pipes/relative-date.pipe';

const KIND: Record<string, { icon: IconName; tone: string }> = {
  ticket_created: { icon: 'maintenance', tone: 'danger' },
  ticket_assigned: { icon: 'maintenance', tone: 'gold' },
  ticket_resolved: { icon: 'check-circle', tone: 'success' },
  maintenance_due: { icon: 'calendar-check', tone: 'gold' },
  task_assigned: { icon: 'itinerary', tone: 'primary' },
  task_late: { icon: 'clock', tone: 'danger' },
  task_completed: { icon: 'check-double', tone: 'success' },
  low_stock: { icon: 'inventory', tone: 'gold' },
  discrepancy_open: { icon: 'inventory', tone: 'danger' },
};

/**
 * Organism · bandeja de notificaciones (campana de la topbar, fase 3). Panel
 * flotante con las 30 más recientes en "Sin leer" y "Antes"; tocar una la
 * marca leída y lleva a su pantalla (`data.route`). Los datos vienen de
 * NotificationsStore (API de Persona B).
 */
@Component({
  selector: 'app-notification-tray',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RelativeDatePipe],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[60]" (click)="open.set(false)" aria-hidden="true"></div>
      <section class="tray fixed right-3 top-[62px] z-[61] flex max-h-[min(560px,calc(100dvh-80px))] w-[min(392px,calc(100vw-24px))] flex-col overflow-hidden rounded-sheet border border-border-card bg-surface shadow-e3"
        role="dialog" aria-label="Notificaciones" (keydown.escape)="open.set(false)" animate.enter="tray-in">
        <header class="flex items-center justify-between border-b border-divider px-4 py-3">
          <div class="flex items-center gap-2">
            <h2 class="font-display text-[16px] font-semibold text-primary">Notificaciones</h2>
            @if (simulated) { <span class="rounded-xs bg-warning-soft px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.6px] text-warning">Simulado</span> }
          </div>
          @if (store.hasUnread()) {
            <button type="button" class="link rounded-xs text-[12px] font-bold" (click)="store.markAllRead()">Marcar todo leído</button>
          }
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto">
          @for (g of groups(); track g.label) {
            <h3 class="px-4 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[1.2px] text-text-secondary">{{ g.label }}</h3>
            <ul>
              @for (n of g.items; track n.id) {
                <li>
                  <button type="button" class="item flex w-full gap-3 px-4 py-2.5 text-left" [class.is-unread]="!n.read_at" (click)="go(n)">
                    <span class="ico flex h-9 w-9 shrink-0 items-center justify-center rounded-pill" [attr.data-tone]="kind(n).tone"><app-icon [name]="kind(n).icon" [size]="16" /></span>
                    <span class="min-w-0 flex-1">
                      <span class="flex items-center justify-between gap-2">
                        <span class="truncate text-[13px] font-bold text-primary">{{ n.title }}</span>
                        <span class="shrink-0 text-[11px] text-text-muted">{{ n.created_at | relativeDate }}</span>
                      </span>
                      <span class="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-text-body">{{ n.body }}</span>
                    </span>
                    @if (!n.read_at) { <span class="dot mt-1.5 h-2 w-2 shrink-0 rounded-pill" aria-label="Sin leer"></span> }
                  </button>
                </li>
              }
            </ul>
          } @empty {
            <div class="px-6 py-12 text-center">
              <app-icon name="bell" [size]="28" class="text-text-muted" />
              <p class="mt-3 text-[13px] font-bold text-primary">{{ store.failed() ? 'No pudimos revisar tus avisos' : 'Estás al día' }}</p>
              <p class="mt-1 text-[12.5px] text-text-secondary">{{ store.failed() ? 'Vuelve a intentarlo en un momento.' : 'Aquí llegan incidencias, retrasos y preventivos que te tocan.' }}</p>
            </div>
          }
        </div>
        <footer class="border-t border-divider px-4 py-2.5">
          <button type="button" class="link flex w-full items-center justify-center gap-1.5 rounded-xs py-1 text-[12.5px] font-bold" (click)="toAlerts()">
            Ver panel de alertas <app-icon name="arrow-right" [size]="14" />
          </button>
        </footer>
      </section>
    }
  `,
  styles: `
    .tray-in { animation: argos-pop 200ms var(--ease-enter) both; transform-origin: top right; }
    .link { color: var(--color-action); }
    .link:hover { color: var(--color-primary); }
    .item { transition: background var(--dur-fast); }
    .item:hover { background: var(--color-surface-soft); }
    .item.is-unread { background: color-mix(in srgb, var(--color-secondary) 6%, transparent); }
    .dot { background: var(--color-secondary); }
    .ico { background: var(--color-teal-washed); color: var(--color-teal-muted); }
    .ico[data-tone='danger'] { background: var(--color-danger-soft); color: var(--color-danger); }
    .ico[data-tone='gold'] { background: color-mix(in srgb, var(--color-secondary) 14%, transparent); color: var(--color-secondary); }
    .ico[data-tone='success'] { background: var(--color-success-soft); color: var(--color-success); }
    @media (prefers-reduced-motion: reduce) { .tray-in { animation: none; } .item { transition: none; } }
  `,
})
export class NotificationTrayComponent {
  protected readonly store = inject(NotificationsStore);
  private readonly router = inject(Router);
  readonly open = model(false);

  protected readonly simulated = inject(MOCK_MODULES).notifications;

  protected readonly groups = computed(() => {
    const items = this.store.items();
    return [
      { label: 'Sin leer', items: items.filter((n) => !n.read_at) },
      { label: 'Antes', items: items.filter((n) => !!n.read_at) },
    ].filter((g) => g.items.length);
  });

  protected kind(n: AppNotification): { icon: IconName; tone: string } {
    return KIND[n.type] ?? { icon: 'bell', tone: 'primary' };
  }

  protected go(n: AppNotification): void {
    void this.store.markRead(n);
    this.open.set(false);
    const route = typeof n.data['route'] === 'string' ? (n.data['route'] as string) : null;
    if (route) void this.router.navigateByUrl(route);
  }

  protected toAlerts(): void {
    this.open.set(false);
    void this.router.navigateByUrl('/alertas');
  }
}
