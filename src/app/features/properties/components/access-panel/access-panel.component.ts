import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';
import { AccessInfo } from '../../models/property.model';

/**
 * Información de acceso cifrada (llaves, códigos, wifi): oculta hasta que se
 * pide con "Mostrar". Cada consulta queda en la bitácora (fase02.md §3); el
 * panel lo dice antes de mostrarla, como recomiendan los productos de
 * operación (Breezeway separa el acceso del resto de la ficha).
 */
@Component({
  selector: 'app-access-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ButtonComponent, RelativeDatePipe],
  template: `
    <div class="rounded-tile border border-border-card bg-surface p-4">
      @if (access(); as a) {
        <div class="flex items-center gap-2 text-[11px] uppercase tracking-[1px] text-text-secondary">
          <app-icon name="key" [size]="14" /> Información de acceso
        </div>
        <pre class="reveal-soft mt-3 whitespace-pre-wrap rounded-sm bg-background p-3.5 font-mono text-[12.5px] leading-relaxed text-primary">{{ a.text }}</pre>
        <p class="mt-3 flex items-center gap-1.5 text-[11.5px] text-text-secondary">
          <app-icon name="logbook" [size]="13" /> Consultada {{ a.viewed_at | relativeDate }} · quedó registrado en la bitácora.
        </p>
      } @else if (hasInfo()) {
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-sm bg-info-soft text-primary"><app-icon name="lock" [size]="18" /></span>
          <div class="flex-1">
            <div class="text-[13px] font-bold text-primary">Llaves, códigos y wifi</div>
            <div class="font-mono text-[13px] tracking-[3px] text-text-muted">•••• •••• ••••</div>
          </div>
          <app-button variant="secondary" size="sm" [loading]="loading()" (pressed)="reveal.emit()">
            @if (!loading()) {
              <app-icon name="eye" [size]="15" />
            }
            Mostrar
          </app-button>
        </div>
        <p class="mt-3 text-[11.5px] leading-snug text-text-secondary">Está cifrada. Al mostrarla queda registrado quién la vio y cuándo.</p>
        @if (error()) {
          <p class="mt-2 text-[12px] text-danger">{{ error() }}</p>
        }
      } @else {
        <p class="text-[13px] text-text-body">Esta propiedad aún no tiene información de acceso.</p>
      }
    </div>
  `,
  styles: `:host { display: block; }`,
})
export class AccessPanelComponent {
  readonly hasInfo = input<boolean>(false);
  readonly access = input<AccessInfo | null>(null);
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly reveal = output<void>();
}
