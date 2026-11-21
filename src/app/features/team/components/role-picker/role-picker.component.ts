import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { SpinnerComponent } from '../../../../shared/atoms/spinner/spinner.component';
import { ROLE_ICON, Role } from '../../models/team.model';

/** Lista de roles como tarjetas de opción única con su descripción. */
@Component({
  selector: 'app-role-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SpinnerComponent],
  template: `
    <div class="flex flex-col gap-2" role="radiogroup" [attr.aria-label]="label()">
      @for (r of roles(); track r.key) {
        <button
          type="button"
          role="radio"
          class="opt press flex items-center gap-3 rounded-tile border px-3.5 py-3 text-left"
          [class.is-on]="value() === r.key"
          [attr.aria-checked]="value() === r.key"
          [disabled]="disabled()"
          (click)="value.set(r.key)"
        >
          <span class="ico flex h-9 w-9 shrink-0 items-center justify-center rounded-sm">
            <app-icon [name]="icon[r.key]" [size]="17" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-[13px] font-bold text-primary">{{ r.name }}</span>
            <span class="block text-[11.5px] leading-snug text-text-body">{{ r.description }}</span>
          </span>
          @if (pending() && value() === r.key) {
            <app-spinner class="text-secondary" [size]="16" />
          } @else {
            <span class="radio flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border-2"><span class="dot rounded-pill"></span></span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .opt { border-color: var(--color-border-card); background: var(--color-surface);
      transition: border-color var(--dur-fast), background-color var(--dur-fast), box-shadow var(--dur-base); }
    .opt:hover:not(:disabled) { border-color: var(--color-disabled); }
    .opt.is-on { border-color: var(--color-secondary); background: rgba(197,135,60,.05); box-shadow: 0 0 0 3px rgba(197,135,60,.12); }
    .ico { background: var(--color-info-soft); color: var(--color-primary); }
    .radio { border-color: var(--color-border-field); transition: border-color var(--dur-fast); }
    .dot { width: 0; height: 0; background: var(--color-secondary); transition: width var(--spring-bounce-dur) var(--spring-bounce), height var(--spring-bounce-dur) var(--spring-bounce); }
    .opt.is-on .radio { border-color: var(--color-secondary); }
    .opt.is-on .dot { width: 9px; height: 9px; }
  `,
})
export class RolePickerComponent {
  readonly roles = input.required<readonly Role[]>();
  readonly value = model<string>('');
  readonly disabled = input<boolean>(false);
  readonly pending = input<boolean>(false);
  readonly label = input<string>('Rol');

  protected readonly icon = ROLE_ICON;
}
