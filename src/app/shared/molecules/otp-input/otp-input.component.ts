import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  model,
  output,
  viewChildren,
} from '@angular/core';

/**
 * Molécula · código de un solo uso (TOTP). Casillas individuales con avance
 * automático, retroceso, flechas y pegado del código completo. Emite
 * `completed` al llenar la última casilla.
 */
@Component({
  selector: 'app-otp-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex justify-between gap-2" role="group" [attr.aria-label]="ariaLabel()">
      @for (i of slots(); track i) {
        <input
          #cell
          class="cell h-14 w-full min-w-0 rounded-field border bg-surface text-center font-mono text-[22px] font-bold text-primary outline-none"
          [class.is-filled]="!!digits()[i]"
          [class.is-invalid]="invalid()"
          [class.gap-after]="i === 2 && length() === 6"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="1"
          [attr.aria-label]="'Dígito ' + (i + 1)"
          [value]="digits()[i] || ''"
          (input)="onInput(i, $event)"
          (keydown)="onKey(i, $event)"
          (paste)="onPaste($event)"
          (focus)="$any($event.target).select()"
        />
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .cell { border-color: var(--color-border-field);
      transition: border-color var(--dur-fast), box-shadow var(--dur-base), transform var(--spring-bounce-dur) var(--spring-bounce); }
    .cell:focus { border-color: var(--color-secondary); box-shadow: 0 0 0 4px rgba(197, 135, 60, 0.14); }
    .cell.is-filled { border-color: var(--color-primary); transform: translateY(-2px); }
    .cell.is-invalid { border-color: var(--color-danger); }
    .gap-after { margin-right: 10px; }
  `,
})
export class OtpInputComponent {
  readonly value = model<string>('');
  readonly length = input<number>(6);
  readonly invalid = input<boolean>(false);
  readonly ariaLabel = input<string>('Código de verificación');
  readonly completed = output<string>();

  private readonly cells = viewChildren<ElementRef<HTMLInputElement>>('cell');

  protected readonly slots = computed(() => Array.from({ length: this.length() }, (_, i) => i));
  protected readonly digits = computed(() => this.value().split(''));

  constructor() {
    afterNextRender(() => this.focus(0));
  }

  focus(i: number): void {
    this.cells()[Math.max(0, Math.min(i, this.length() - 1))]?.nativeElement.focus();
  }

  protected onInput(i: number, e: Event): void {
    const el = e.target as HTMLInputElement;
    const d = el.value.replace(/\D/g, '').slice(-1);
    el.value = d;
    const arr = this.padded();
    arr[i] = d;
    this.commit(arr);
    if (d) this.focus(i + 1);
  }

  protected onKey(i: number, e: KeyboardEvent): void {
    if (e.key === 'Backspace' && !this.digits()[i]) {
      e.preventDefault();
      const arr = this.padded();
      arr[i - 1] = '';
      this.commit(arr);
      this.focus(i - 1);
    } else if (e.key === 'ArrowLeft') {
      this.focus(i - 1);
    } else if (e.key === 'ArrowRight') {
      this.focus(i + 1);
    }
  }

  protected onPaste(e: ClipboardEvent): void {
    const text = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, this.length());
    if (!text) return;
    e.preventDefault();
    this.commit(text.split(''));
    this.focus(text.length);
  }

  private padded(): string[] {
    return Array.from({ length: this.length() }, (_, k) => this.digits()[k] ?? '');
  }

  private commit(arr: string[]): void {
    // Compacta: no deja huecos intermedios.
    const v = arr.join('').slice(0, this.length());
    this.value.set(v);
    if (v.length === this.length()) this.completed.emit(v);
  }
}
