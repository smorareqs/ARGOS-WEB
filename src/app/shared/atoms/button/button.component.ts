import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SpinnerComponent } from '../spinner/spinner.component';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'ghost'
  | 'danger'
  | 'pill'
  | 'link'
  | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Átomo · botón. Un solo color sólido por pantalla: la acción principal.
 * - primary   → CTA terracota (--color-action, 4.8:1) con brillo interno
 * - secondary → teal lavado con texto teal: acompaña sin competir
 * - tertiary  → blanco con borde · ghost → solo texto
 * - danger    → rojo para acciones destructivas · pill / link / icon
 * Respuesta al presionar en < 100 ms (escala .97). `loading` muestra spinner
 * interno y bloquea el botón durante la petición (§3.3).
 */
@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent],
  host: { '[class.w-full]': 'full()', class: 'inline-flex' },
  template: `
    <button
      [type]="type()"
      [class]="classes()"
      [disabled]="disabled() || loading()"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-busy]="loading() || null"
      (click)="pressed.emit($event)"
    >
      @if (loading()) {
        <app-spinner [size]="size() === 'sm' ? 14 : 16" />
      }
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit'>('button');
  readonly full = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly ariaLabel = input<string | null>(null);

  readonly pressed = output<MouseEvent>();

  private static readonly BASE =
    'press inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap select-none transition-[background-color,box-shadow,opacity,filter] duration-150 disabled:opacity-55';

  private static readonly SIZES: Record<ButtonSize, string> = {
    sm: 'h-9 rounded-sm px-3.5 text-[12.5px]',
    md: 'h-11 rounded-field px-5 text-[13.5px]',
    lg: 'h-[54px] rounded-field px-6 text-[15px] tracking-[0.2px]',
  };

  private static readonly VARIANTS: Record<ButtonVariant, string> = {
    primary:
      'bg-action text-on-action shadow-[var(--shadow-edge),var(--shadow-cta)] hover:brightness-[1.07] active:brightness-95',
    secondary: 'bg-teal-washed text-primary shadow-[inset_0_0_0_1px_rgba(0,56,65,0.08)] hover:brightness-[0.96] active:brightness-[0.93]',
    tertiary: 'border border-border-field bg-surface text-primary shadow-e1 hover:bg-surface-soft hover:border-disabled/60',
    ghost: 'text-primary hover:bg-primary/[0.06]',
    danger: 'bg-danger text-white shadow-[var(--shadow-edge)] hover:brightness-110',
    pill: '!h-auto rounded-sm bg-secondary px-3.5 py-[7px] text-[11.5px] text-primary hover:brightness-105',
    link: '!h-auto !px-0 text-[12.5px] text-action hover:opacity-80',
    icon: '!w-10 !px-0 text-text-body hover:bg-primary/[0.06] hover:text-primary',
  };

  protected readonly classes = computed(() => {
    const parts = [
      ButtonComponent.BASE,
      ButtonComponent.SIZES[this.size()],
      ButtonComponent.VARIANTS[this.variant()],
    ];
    if (this.full()) parts.push('w-full');
    return parts.join(' ');
  });
}
