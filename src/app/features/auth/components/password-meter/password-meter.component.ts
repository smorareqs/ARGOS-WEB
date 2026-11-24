import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PASSWORD_MIN, STRENGTH_LABEL, passwordStrength } from '../../utils/password';

/**
 * Componente · fuerza de la contraseña: tres segmentos y una frase. Solo
 * orienta; la regla que se exige es la del backend (8 caracteres o más).
 */
@Component({
  selector: 'app-password-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-3" aria-live="polite">
      <div class="flex flex-1 gap-1" aria-hidden="true">
        @for (i of [1, 2, 3]; track i) {
          <span class="seg h-1 flex-1 rounded-pill" [class]="i <= score() ? tone() : 'bg-divider'"></span>
        }
      </div>
      <span class="shrink-0 whitespace-nowrap text-right text-[11.5px] text-text-secondary">
        {{ value() ? label() : 'Mínimo ' + min + ' caracteres' }}
      </span>
    </div>
  `,
  styles: `:host { display: block; } .seg { transition: background-color var(--dur-base) var(--ease-standard); }`,
})
export class PasswordMeterComponent {
  readonly value = input<string>('');
  protected readonly min = PASSWORD_MIN;
  protected readonly score = computed(() => passwordStrength(this.value()));
  protected readonly label = computed(() => STRENGTH_LABEL[this.score()]);
  protected readonly tone = computed(() => ['bg-danger', 'bg-warning', 'bg-teal-muted', 'bg-success'][this.score()]);
}
