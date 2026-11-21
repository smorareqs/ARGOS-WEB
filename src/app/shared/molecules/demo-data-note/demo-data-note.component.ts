import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MOCK_MODULES, MockModule } from '../../../core/tokens/api.tokens';
import { IconComponent } from '../../atoms/icon/icon.component';

/**
 * Molecule · aviso de datos simulados. Se muestra solo si el módulo indicado
 * sigue usando su mock (su endpoint aún no existe en la API): así queda claro
 * qué pantalla muestra datos reales y cuál no.
 */
@Component({
  selector: 'app-demo-data-note',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (visible()) {
      <p class="mb-6 flex items-start gap-2.5 rounded-field border border-border-card bg-surface px-4 py-3 text-[12.5px] leading-relaxed text-text-body" role="note">
        <span class="mt-px shrink-0 rounded-xs bg-warning-soft px-1.5 py-px text-[10.5px] font-bold uppercase tracking-[0.6px] text-warning">Simulado</span>
        <span>
          <b class="text-primary">{{ label() }}</b> todavía no está conectado a la API: estos datos son de demostración y lo que
          cambies se guarda solo en este navegador.
        </span>
        <app-icon name="info" [size]="15" class="ml-auto mt-0.5 shrink-0 text-text-muted" />
      </p>
    }
  `,
})
export class DemoDataNoteComponent {
  readonly module = input.required<MockModule>();
  readonly label = input.required<string>();

  private readonly mocks = inject(MOCK_MODULES);
  protected readonly visible = computed(() => this.mocks[this.module()]);
}
