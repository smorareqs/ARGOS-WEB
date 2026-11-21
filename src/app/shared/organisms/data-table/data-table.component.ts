import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  TemplateRef,
  computed,
  contentChildren,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';

export interface TableColumn<T> {
  readonly key: string;
  readonly label: string;
  readonly sortable?: boolean;
  readonly align?: 'left' | 'right' | 'center';
  readonly width?: string;
  /** Columna secundaria: se oculta en pantallas angostas (ux-ui.md §2.5). */
  readonly priority?: 'md' | 'lg';
  /** Valor para ordenar (y para la celda por defecto). */
  readonly value?: (row: T) => string | number;
}

/** `<ng-template appCell="clave" let-row>` define la celda de una columna. */
@Directive({ selector: 'ng-template[appCell]' })
export class CellDefDirective {
  readonly appCell = input.required<string>();
  readonly tpl = inject(TemplateRef<{ $implicit: unknown }>);
}

/**
 * Organismo · tabla de datos (ux-ui.md §2.5): filas de 52 px, columnas
 * ordenables con indicador, columnas prioritarias, fila activa, teclado
 * (Enter abre), esqueleto de filas mientras carga y entrada escalonada.
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, IconComponent],
  template: `
    <div class="overflow-x-auto rounded-card border border-border-card bg-surface shadow-e1">
      <table class="w-full border-collapse text-left">
        <thead>
          <tr class="border-b border-divider">
            @for (c of columns(); track c.key) {
              <th
                scope="col"
                class="h-11 whitespace-nowrap px-4 text-[10.5px] font-normal uppercase tracking-[1px] text-text-secondary first:pl-5 last:pr-5"
                [class]="colClass(c)"
                [style.width]="c.width ?? null"
                [attr.aria-sort]="sort().key === c.key ? (sort().dir === 1 ? 'ascending' : 'descending') : null"
              >
                @if (c.sortable) {
                  <button type="button" class="group inline-flex items-center gap-1 rounded-xs uppercase hover:text-primary" (click)="toggleSort(c.key)">
                    {{ c.label }}
                    <app-icon
                      name="chevron-down"
                      [size]="13"
                      class="sort-ico"
                      [class.opacity-0]="sort().key !== c.key"
                      [class.group-hover:opacity-50]="sort().key !== c.key"
                      [class.is-up]="sort().key === c.key && sort().dir === 1"
                    />
                  </button>
                } @else {
                  {{ c.label }}
                }
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            @for (i of skeleton; track i) {
              <tr class="border-b border-divider last:border-0">
                @for (c of columns(); track c.key; let ci = $index) {
                  <td class="h-[52px] px-4 first:pl-5 last:pr-5" [class]="colClass(c)">
                    <span class="skeleton block h-3" [style.width.%]="ci === 0 ? 70 : 40 + ((i * 7 + ci * 13) % 45)"></span>
                  </td>
                }
              </tr>
            }
          } @else {
            @for (row of sorted(); track rowKey()(row); let i = $index) {
              <tr
                class="row reveal-soft cursor-pointer border-b border-divider last:border-0"
                [class.is-active]="activeKey() !== null && rowKey()(row) === activeKey()"
                [style.--i]="i"
                tabindex="0"
                (click)="rowClick.emit(row)"
                (keydown.enter)="rowClick.emit(row)"
              >
                @for (c of columns(); track c.key) {
                  <td class="h-[52px] px-4 text-[13px] text-text-body first:pl-5 last:pr-5" [class]="colClass(c)">
                    @if (cellTpl(c.key); as tpl) {
                      <ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="{ $implicit: row }" />
                    } @else {
                      {{ c.value ? c.value(row) : '' }}
                    }
                  </td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    :host { display: block; }
    .row { transition: background-color var(--dur-fast) var(--ease-standard); }
    .row:hover { background: var(--color-surface-soft); }
    .row.is-active { background: rgba(197, 135, 60, 0.07); box-shadow: inset 3px 0 0 var(--color-secondary); }
    .row:focus-visible { outline-offset: -2px; }
    .sort-ico { transition: transform var(--spring-snappy-dur) var(--spring-snappy), opacity var(--dur-fast); }
    .sort-ico.is-up { transform: rotate(180deg); }
  `,
})
export class DataTableComponent<T extends object> {
  readonly columns = input.required<readonly TableColumn<T>[]>();
  readonly rows = input.required<readonly T[]>();
  readonly rowKey = input.required<(row: T) => string>();
  readonly loading = input<boolean>(false);
  readonly activeKey = input<string | null>(null);
  readonly rowClick = output<T>();

  private readonly cells = contentChildren(CellDefDirective);
  protected readonly skeleton = [0, 1, 2, 3, 4, 5];
  protected readonly sort = signal<{ key: string | null; dir: 1 | -1 }>({ key: null, dir: 1 });

  protected readonly sorted = computed(() => {
    const { key, dir } = this.sort();
    const col = this.columns().find((c) => c.key === key);
    if (!col?.value) return this.rows();
    const get = col.value;
    return [...this.rows()].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')) * dir;
    });
  });

  protected cellTpl(key: string): TemplateRef<unknown> | null {
    return this.cells().find((c) => c.appCell() === key)?.tpl ?? null;
  }

  protected toggleSort(key: string): void {
    const s = this.sort();
    this.sort.set(s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 });
  }

  protected colClass(c: TableColumn<T>): string {
    const align = c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : '';
    const prio = c.priority === 'lg' ? 'hidden lg:table-cell' : c.priority === 'md' ? 'hidden md:table-cell' : '';
    return `${align} ${prio}`;
  }
}
