import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { AvatarComponent } from '../../atoms/avatar/avatar.component';
import { IconComponent } from '../../atoms/icon/icon.component';

export interface PickerPerson {
  readonly id: string;
  readonly name: string;
  /** Segunda línea: rol, correo o disponibilidad. */
  readonly detail?: string | null;
  /** Se muestra apagado (suspendido, sin el rol adecuado). */
  readonly muted?: boolean;
  /** Etiqueta corta en lugar del avatar (p. ej. el código de una propiedad). */
  readonly tag?: string;
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Molécula · user-picker (ux-ui.md §1.3): buscador de personas con avatar (o de
 * cosas con una etiqueta corta, como propiedades con su código) y
 * selección múltiple (o una sola con `single`). Las elegidas van primero y la
 * lista se filtra por nombre o detalle mientras se escribe. Lo usan la ficha de
 * propiedad (asignados, propietarios) y las altas que piden a alguien.
 */
@Component({
  selector: 'app-user-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, IconComponent],
  template: `
    <div class="rounded-tile border border-border-field bg-surface">
      <label class="flex items-center gap-2 border-b border-divider px-3">
        <app-icon name="search" [size]="16" class="text-text-muted" />
        <input
          type="search"
          class="h-11 min-w-0 flex-1 bg-transparent text-[13px] text-primary outline-none placeholder:text-text-muted"
          [placeholder]="placeholder()"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
          [attr.aria-label]="placeholder()"
        />
        @if (selected().length) {
          <span class="tabular shrink-0 rounded-xs bg-teal-washed px-1.5 py-px text-[11px] font-bold text-teal-muted">{{ selected().length }}</span>
        }
      </label>
      <ul class="list max-h-[340px] overflow-y-auto py-1" role="listbox" [attr.aria-multiselectable]="!single()">
        @for (p of visible(); track p.id) {
          @let on = isOn(p.id);
          <li role="option" [attr.aria-selected]="on">
            <button type="button" class="row flex w-full items-center gap-3 px-3 py-2 text-left" [class.is-on]="on" [class.is-muted]="p.muted" (click)="toggle(p.id)">
              @if (p.tag) {
                <span class="w-[64px] shrink-0 truncate rounded-xs bg-info-soft px-1.5 py-1 text-center font-mono text-[11px] font-bold text-primary">{{ p.tag }}</span>
              } @else {
                <app-avatar [initials]="ini(p.name)" [name]="p.name" [size]="32" />
              }
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px] font-bold text-primary">{{ p.name }}</span>
                @if (p.detail) {
                  <span class="block truncate text-[11.5px] text-text-secondary">{{ p.detail }}</span>
                }
              </span>
              <span class="check flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2">
                @if (on) {
                  <app-icon name="check" [size]="13" />
                }
              </span>
            </button>
          </li>
        } @empty {
          <li class="px-3 py-6 text-center text-[12.5px] text-text-secondary">{{ query() ? 'Nadie coincide con la búsqueda.' : empty() }}</li>
        }
      </ul>
    </div>
  `,
  styles: `
    :host { display: block; }
    .row { transition: background-color var(--dur-fast); }
    .row:hover { background: var(--color-surface-soft); }
    .row.is-on { background: color-mix(in srgb, var(--color-teal-washed) 70%, white); }
    .row.is-muted { opacity: 0.6; }
    .check { border-color: var(--color-border-field); color: white; transition: all var(--dur-fast); }
    .row.is-on .check { background: var(--color-primary); border-color: var(--color-primary); }
  `,
})
export class UserPickerComponent {
  readonly people = input.required<readonly PickerPerson[]>();
  readonly selected = model<readonly string[]>([]);
  readonly single = input<boolean>(false);
  readonly placeholder = input<string>('Buscar persona');
  readonly empty = input<string>('No hay personas para elegir.');

  protected readonly query = signal('');
  protected readonly ini = (name: string) =>
    name.split(/s+/).filter(Boolean).map((w, i, all) => (i === 0 || i === all.length - 1 ? w[0] : '')).join('').toUpperCase();

  /** Elegidas primero; luego el resto, filtrado por la búsqueda. */
  protected readonly visible = computed(() => {
    const q = norm(this.query().trim());
    const sel = new Set(this.selected());
    return this.people()
      .filter((p) => !q || norm(`${p.tag ?? ''} ${p.name} ${p.detail ?? ''}`).includes(q))
      .sort((a, b) => Number(sel.has(b.id)) - Number(sel.has(a.id)) || a.name.localeCompare(b.name));
  });

  protected isOn(id: string): boolean {
    return this.selected().includes(id);
  }

  protected toggle(id: string): void {
    const cur = this.selected();
    if (this.single()) {
      this.selected.set(cur[0] === id ? [] : [id]);
      return;
    }
    this.selected.set(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }
}
