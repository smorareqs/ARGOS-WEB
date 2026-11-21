import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { ConfirmService } from '../../core/services/confirm.service';
import { ButtonComponent } from '../../shared/atoms/button/button.component';

/**
 * Diálogo de confirmación (ux-ui.md §3.5): nombra el objeto y el efecto,
 * botón de acción a la derecha (rojo si es destructivo). Escape cancela.
 */
@Component({
  selector: 'app-confirm-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  template: `
    @if (confirm.current(); as c) {
      <div class="cf-root fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" animate.enter="cf-in" animate.leave="cf-out">
        <div class="cf-scrim absolute inset-0" (click)="confirm.settle(false)"></div>
        <div
          #box
          class="cf-box relative w-full max-w-[440px] rounded-sheet bg-surface p-6 shadow-e3 outline-none"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-label]="c.title"
          tabindex="-1"
        >
          <h2 class="font-display text-[24px] font-semibold leading-tight text-primary">{{ c.title }}</h2>
          <p class="mt-2.5 text-[13.5px] leading-relaxed text-text-body">{{ c.message }}</p>
          <div class="mt-6 flex justify-end gap-2.5">
            <app-button variant="tertiary" (pressed)="confirm.settle(false)">{{ c.cancelLabel ?? 'Cancelar' }}</app-button>
            <app-button [variant]="c.tone === 'danger' ? 'danger' : 'secondary'" (pressed)="confirm.settle(true)">
              {{ c.confirmLabel }}
            </app-button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .cf-scrim { background: var(--overlay); }
    .cf-in { animation: hold var(--spring-bounce-dur) linear; }
    .cf-in .cf-scrim { animation: argos-fade var(--dur-base) both; }
    .cf-in .cf-box { animation: argos-pop var(--spring-bounce-dur) var(--spring-bounce) both; }
    .cf-out { animation: hold 160ms linear both; }
    .cf-out .cf-scrim { animation: argos-fade 160ms var(--ease-exit) reverse both; }
    .cf-out .cf-box { animation: argos-pop 160ms var(--ease-exit) reverse both; }
    @keyframes hold { to { opacity: 1; } }
  `,
})
export class ConfirmOutletComponent {
  protected readonly confirm = inject(ConfirmService);
  private readonly box = viewChild<ElementRef<HTMLElement>>('box');

  constructor() {
    effect(() => {
      if (this.confirm.current()) setTimeout(() => this.box()?.nativeElement.focus(), 20);
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.confirm.current()) this.confirm.settle(false);
  }
}
