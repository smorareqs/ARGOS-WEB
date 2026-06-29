import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';
import { AvatarComponent } from '../../atoms/avatar/avatar.component';
import { SearchBarComponent } from '../../molecules/search-bar/search-bar.component';

/**
 * Organismo · barra superior (68px). Título + fecha, búsqueda, alertas y avatar.
 * Presentacional: todo entra por @Input(). Ref: ArgosTopbar.dc.html.
 */
@Component({
  selector: 'app-topbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AvatarComponent, SearchBarComponent],
  template: `
    <header
      class="flex h-[68px] shrink-0 items-center gap-5 border-b border-[#EAE6DB] bg-surface px-7 font-sans"
    >
      <div>
        <div class="font-display text-[21px] font-semibold text-primary">{{ title() }}</div>
        <div class="mt-px text-[11.5px] text-text-muted">{{ subtitle() }}</div>
      </div>

      <div class="ml-5 w-full max-w-[340px] flex-1">
        <app-search-bar placeholder="Buscar propiedad, empleado…" />
      </div>

      <div class="ml-auto flex items-center gap-4">
        <div class="relative text-text-body">
          <app-icon name="bell" [size]="22" />
          @if (hasAlerts()) {
            <span
              class="absolute -right-0.5 -top-0.5 h-[9px] w-[9px] rounded-pill border-2 border-white bg-danger"
            ></span>
          }
        </div>
        <app-avatar [initials]="userInitials()" tone="primary" [size]="38" />
      </div>
    </header>
  `,
  styles: `:host { display: block; }`,
})
export class TopbarComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly userInitials = input.required<string>();
  readonly hasAlerts = input<boolean>(false);
}
