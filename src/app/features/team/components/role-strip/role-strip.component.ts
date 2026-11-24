import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { CountUpComponent } from '../../../../shared/atoms/count-up/count-up.component';
import { RoleKey } from '../../../../core/auth/permissions';
import { Role, roleIcon } from '../../models/team.model';

/**
 * Franja de roles con su conteo de miembros activos. Funciona como filtro
 * (barra de categorías de Airbnb): desplazable en pantallas angostas.
 */
@Component({
  selector: 'app-role-strip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CountUpComponent],
  template: `
    <div class="strip flex gap-3 overflow-x-auto pb-1" role="radiogroup" aria-label="Filtrar por rol">
      @for (r of items(); track r.key; let i = $index) {
        <button
          type="button"
          role="radio"
          class="tile reveal flex min-w-[150px] flex-1 flex-col items-start rounded-card border p-4 text-left"
          [class.is-on]="value() === r.key"
          [style.--i]="i"
          [attr.aria-checked]="value() === r.key"
          (click)="value.set(value() === r.key ? 'all' : r.key)"
        >
          <span class="ico flex h-9 w-9 items-center justify-center rounded-sm">
            <app-icon [name]="r.icon" [size]="18" />
          </span>
          <span class="mt-3 font-display text-[28px] font-semibold leading-none tracking-display">
            <app-count-up [value]="r.count" />
          </span>
          <span class="name mt-1 text-[12px]">{{ r.name }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .strip { scrollbar-width: none; } .strip::-webkit-scrollbar { display: none; }
    .tile { border-color: var(--color-border-card); background: var(--color-surface); color: var(--color-primary);
      box-shadow: var(--shadow-e1);
      transition: background-color var(--dur-base) var(--ease-standard), color var(--dur-base), border-color var(--dur-base),
        transform var(--spring-standard-dur) var(--spring-standard), box-shadow var(--dur-base); }
    .tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-e2); }
    .tile:active { transform: scale(0.98); }
    .ico { background: var(--color-info-soft); color: var(--color-primary); transition: background-color var(--dur-base), color var(--dur-base); }
    .name { color: var(--color-text-body); }
    .tile.is-on { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .tile.is-on .ico { background: rgba(255,255,255,.12); color: var(--color-secondary-light); }
    .tile.is-on .name { color: rgba(255,255,255,.75); }
  `,
})
export class RoleStripComponent {
  readonly roles = input.required<readonly Role[]>();
  readonly counts = input.required<Partial<Record<RoleKey, number>>>();
  readonly value = model<string>('all');

  protected readonly items = computed(() =>
    this.roles().map((r) => ({ key: r.key, name: r.name, icon: roleIcon(r.key), count: this.counts()[r.key] ?? 0 })),
  );
}
