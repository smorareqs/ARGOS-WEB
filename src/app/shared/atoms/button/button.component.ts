import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'pill' | 'link';

/**
 * Átomo · botón. Variantes alineadas al design system (§03 Botones):
 * - primary   → CTA dorado con glow (Iniciar sesión)
 * - secondary → teal sólido
 * - tertiary  → blanco con borde
 * - pill       → píldora dorada compacta (Asignar / Programar)
 * - link       → texto dorado (Ver tablero →)
 */
@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [type]="type()" [class]="classes()" (click)="pressed.emit($event)">
      <ng-content />
    </button>
  `,
  styles: `:host { display: contents; }`,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit'>('button');
  /** El botón ocupa todo el ancho disponible. */
  readonly full = input<boolean>(false);

  readonly pressed = output<MouseEvent>();

  private static readonly BASE: Record<ButtonVariant, string> = {
    primary:
      'inline-flex h-[54px] items-center justify-center gap-2.5 rounded-field bg-secondary px-6 text-[15px] font-bold tracking-[0.3px] text-white shadow-cta transition hover:brightness-105',
    secondary:
      'inline-flex h-[46px] items-center justify-center rounded-[11px] bg-primary px-5 text-[13px] font-bold text-white transition hover:brightness-110',
    tertiary:
      'inline-flex h-[46px] items-center justify-center rounded-[11px] border border-border-field bg-surface px-5 text-[13px] font-bold text-primary transition hover:bg-divider',
    pill: 'inline-flex items-center justify-center rounded-pill bg-secondary px-3.5 py-[7px] text-[11.5px] font-bold text-primary transition hover:brightness-105',
    link: 'inline-flex items-center gap-1 text-[12px] font-bold text-secondary transition hover:opacity-80',
  };

  protected readonly classes = computed(() => {
    const base = ButtonComponent.BASE[this.variant()];
    return this.full() ? `${base} w-full` : base;
  });
}
