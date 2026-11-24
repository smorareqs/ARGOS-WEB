import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  TemplateRef,
  computed,
  contentChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

export interface BoardColumn {
  readonly key: string;
  readonly label: string;
  /** Color del punto de estado (token CSS). */
  readonly color: string;
  /** Texto bajo la columna vacía. */
  readonly empty?: string;
}

export interface BoardMove<T> {
  readonly item: T;
  readonly to: string;
}

/** `<ng-template appBoardCard let-item>` define la tarjeta. */
@Directive({ selector: 'ng-template[appBoardCard]' })
export class BoardCardDirective {
  readonly tpl = inject(TemplateRef<{ $implicit: unknown }>);
}

/**
 * Organismo · tablero por estado (kanban-board, ux-ui.md §2.6). Columnas con
 * punto de color y contador en la cabecera, como Linear; las tarjetas solo
 * muestran lo que decide el siguiente paso. Si `canDrag(item)` lo permite, la
 * tarjeta se arrastra a otra columna y se emite `moved`; con teclado se abre
 * la ficha y el cambio se hace desde ahí.
 */
@Component({
  selector: 'app-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    <div class="board -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      @for (col of columns(); track col.key) {
        @let items = grouped()[col.key] ?? [];
        <section
          class="col flex w-[284px] shrink-0 flex-col rounded-card border border-border-card bg-surface-soft lg:w-auto lg:min-w-0 lg:flex-1"
          [class.is-over]="over() === col.key"
          [attr.aria-label]="col.label"
          (dragover)="onOver($event, col.key)"
          (dragleave)="over.set(null)"
          (drop)="onDrop($event, col.key)"
        >
          <header class="flex items-center gap-2 px-4 pb-2 pt-3.5">
            <span class="h-2 w-2 rounded-pill" [style.background]="col.color"></span>
            <h3 class="text-[12.5px] font-bold text-primary">{{ col.label }}</h3>
            <span class="tabular ml-auto rounded-xs bg-teal-washed px-1.5 text-[11px] font-bold text-teal-muted">{{ items.length }}</span>
          </header>
          <div class="flex flex-1 flex-col gap-2.5 px-2.5 pb-3">
            @for (item of items; track keyOf()(item); let i = $index) {
              <div
                class="card reveal-soft"
                [style.--i]="i"
                [attr.draggable]="canDrag()(item)"
                [class.is-dragging]="dragging() === keyOf()(item)"
                (dragstart)="onStart($event, item)"
                (dragend)="dragging.set(null); over.set(null)"
              >
                <ng-container [ngTemplateOutlet]="card()!.tpl" [ngTemplateOutletContext]="{ $implicit: item }" />
              </div>
            } @empty {
              <p class="rounded-field border border-dashed border-border-field px-3 py-5 text-center text-[12px] text-text-muted">
                {{ col.empty ?? 'Nada por aquí' }}
              </p>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .col { transition: background-color var(--dur-fast), border-color var(--dur-fast); }
    .col.is-over { background: rgba(197, 135, 60, 0.07); border-color: var(--color-secondary); }
    .card[draggable='true'] { cursor: grab; }
    .card.is-dragging { opacity: 0.45; }
  `,
})
export class BoardComponent<T extends object> {
  readonly columns = input.required<readonly BoardColumn[]>();
  readonly items = input.required<readonly T[]>();
  readonly columnOf = input.required<(item: T) => string>();
  readonly keyOf = input.required<(item: T) => string>();
  readonly canDrag = input<(item: T) => boolean>(() => false);
  readonly moved = output<BoardMove<T>>();

  protected readonly card = contentChild(BoardCardDirective);
  protected readonly over = signal<string | null>(null);
  protected readonly dragging = signal<string | null>(null);

  protected readonly grouped = computed(() => {
    const out: Partial<Record<string, T[]>> = {};
    for (const it of this.items()) (out[this.columnOf()(it)] ??= []).push(it);
    return out;
  });

  protected onStart(e: DragEvent, item: T): void {
    this.dragging.set(this.keyOf()(item));
    e.dataTransfer?.setData('text/plain', this.keyOf()(item));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  protected onOver(e: DragEvent, key: string): void {
    if (!this.dragging()) return;
    e.preventDefault();
    this.over.set(key);
  }

  protected onDrop(e: DragEvent, key: string): void {
    e.preventDefault();
    const id = this.dragging();
    this.over.set(null);
    this.dragging.set(null);
    const item = this.items().find((x) => this.keyOf()(x) === id);
    if (item && this.columnOf()(item) !== key) this.moved.emit({ item, to: key });
  }
}
