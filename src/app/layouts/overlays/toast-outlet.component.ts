import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/atoms/icon/icon.component';

/**
 * Pila de toasts abajo a la derecha (ux-ui.md §3.5). Región `polite`: se
 * anuncian a lectores de pantalla sin robar el foco.
 */
@Component({
  selector: 'app-toast-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="pointer-events-none fixed bottom-4 left-4 right-4 z-[70] flex flex-col items-end gap-2.5 sm:bottom-6 sm:left-auto sm:right-6"
      aria-live="polite"
      role="status"
    >
      @for (t of toasts.toasts(); track t.id) {
        <div
          class="toast pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-tile bg-primary py-3 pl-4 pr-2.5 text-white shadow-e3 sm:w-auto sm:min-w-[320px]"
          animate.enter="toast-in"
          animate.leave="toast-out"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill"
            [class.bg-success]="t.tone === 'success'"
            [class.bg-danger]="t.tone === 'danger'"
            [class.bg-white/15]="t.tone === 'neutral'"
          >
            <app-icon [name]="t.tone === 'success' ? 'check' : t.tone === 'danger' ? 'alert' : 'info'" [size]="15" />
          </span>
          <span class="flex-1 text-[13px] leading-snug">{{ t.message }}</span>
          @if (t.action; as action) {
            <button
              type="button"
              class="press shrink-0 rounded-sm px-2.5 py-1.5 text-[12.5px] font-bold text-secondary-light hover:bg-white/10"
              (click)="action.run(); toasts.dismiss(t.id)"
            >
              {{ action.label }}
            </button>
          }
          <button
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-white/55 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar aviso"
            (click)="toasts.dismiss(t.id)"
          >
            <app-icon name="x" [size]="15" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-in { animation: toast-in var(--spring-bounce-dur) var(--spring-bounce) both; }
    .toast-out { animation: toast-out 180ms var(--ease-exit) both; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(14px) scale(0.96); } }
    @keyframes toast-out { to { opacity: 0; transform: translateX(24px); } }
  `,
})
export class ToastOutletComponent {
  protected readonly toasts = inject(ToastService);
}
