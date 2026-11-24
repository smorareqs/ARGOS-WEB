import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
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
          @if (c.reasons) {
            <fieldset class="mt-4">
              <legend class="mb-2 text-[12px] font-bold text-primary">Motivo <span class="font-normal text-text-secondary">(queda en la bitácora)</span></legend>
              <div class="flex flex-wrap gap-2">
                @for (r of c.reasons; track r) {
                  <button type="button" class="reason" [class.is-on]="reason() === r" [attr.aria-pressed]="reason() === r" (click)="reason.set(r)">{{ r }}</button>
                }
                <button type="button" class="reason" [class.is-on]="reason() === other" [attr.aria-pressed]="reason() === other" (click)="reason.set(other)">Otro</button>
              </div>
              @if (reason() === other) {
                <input class="mt-2.5 h-10 w-full rounded-field border border-border-field px-3 text-[13.5px] text-primary" placeholder="Escribe el motivo" aria-label="Otro motivo" [value]="otherText()" (input)="otherText.set($any($event.target).value)" />
              }
            </fieldset>
          }
          <div class="mt-6 flex justify-end gap-2.5">
            <app-button variant="tertiary" (pressed)="confirm.settle(false)">{{ c.cancelLabel ?? 'Cancelar' }}</app-button>
            <app-button [variant]="c.tone === 'danger' ? 'danger' : 'primary'" [disabled]="!!c.reasons && !finalReason()" (pressed)="confirm.settle(true, finalReason() ?? undefined)">
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
    .reason { height: 32px; padding: 0 12px; border-radius: var(--radius-field); border: 1px solid var(--color-border-field); font-size: 12.5px; color: var(--color-text-body); background: var(--color-surface); }
    .reason:hover { border-color: var(--color-teal-muted); }
    .reason.is-on { background: var(--color-primary); border-color: var(--color-primary); color: #fff; font-weight: 700; }
  `,
})
export class ConfirmOutletComponent {
  protected readonly confirm = inject(ConfirmService);
  private readonly box = viewChild<ElementRef<HTMLElement>>('box');
  protected readonly other = '__otro__';
  protected readonly reason = signal<string | null>(null);
  protected readonly otherText = signal('');
  protected readonly finalReason = computed(() => {
    const r = this.reason();
    if (r === this.other) return this.otherText().trim() || null;
    return r;
  });

  constructor() {
    effect(() => {
      if (this.confirm.current()) {
        untracked(() => {
          this.reason.set(null);
          this.otherText.set('');
        });
        setTimeout(() => this.box()?.nativeElement.focus(), 20);
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.confirm.current()) this.confirm.settle(false);
  }
}
