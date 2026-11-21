import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';

/**
 * Molécula · barra de búsqueda. Con `shortcut` se enfoca con Ctrl/⌘ + K y
 * muestra la pista de teclado (ux-ui.md §1: atajos para admins).
 */
@Component({
  selector: 'app-search-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="bar flex h-10 items-center gap-2.5 rounded-field border border-transparent bg-primary/[0.05] px-3.5"
      [class.is-focus]="focused()"
    >
      <app-icon name="search" [size]="16" class="text-text-muted" />
      <input
        #field
        class="min-w-0 flex-1 bg-transparent text-[13px] text-primary outline-none placeholder:text-text-muted focus-visible:outline-none"
        type="search"
        [placeholder]="placeholder()"
        [attr.aria-label]="placeholder()"
        [value]="value()"
        (input)="value.set($any($event.target).value)"
        (focus)="focused.set(true)"
        (blur)="focused.set(false)"
      />
      @if (shortcut() && !focused()) {
        <kbd
          class="hidden rounded-xs border border-border-field bg-surface px-1.5 py-px font-sans text-[10.5px] text-text-secondary md:inline"
          >Ctrl K</kbd
        >
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .bar { transition: background-color var(--dur-fast), border-color var(--dur-fast), box-shadow var(--dur-base); }
    .bar.is-focus { background: var(--color-surface); border-color: var(--color-secondary);
      box-shadow: 0 0 0 4px rgba(197, 135, 60, 0.12); }
  `,
})
export class SearchBarComponent {
  readonly value = model<string>('');
  readonly placeholder = input<string>('Buscar…');
  readonly shortcut = input<boolean>(false);

  protected readonly focused = signal(false);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  @HostListener('document:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (this.shortcut() && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.field().nativeElement.focus();
    }
  }
}
