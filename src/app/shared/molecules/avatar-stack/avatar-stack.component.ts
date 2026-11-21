import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AvatarComponent } from '../../atoms/avatar/avatar.component';

export interface StackPerson {
  readonly name: string;
  readonly initials: string;
}

/** Molécula · avatares apilados con "+N" (asignados de una propiedad). */
@Component({
  selector: 'app-avatar-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent],
  template: `
    <div class="flex items-center">
      @for (p of visible(); track p.name; let first = $first) {
        <app-avatar
          [initials]="p.initials"
          [name]="p.name"
          tone="auto"
          [size]="size()"
          [ring]="true"
          [style.margin-left.px]="first ? 0 : -5"
        />
      }
      @if (rest() > 0) {
        <span
          class="-ml-[5px] flex items-center justify-center rounded-pill bg-neutral-soft text-[10.5px] font-bold text-text-body ring-2 ring-surface"
          [style.width.px]="size()"
          [style.height.px]="size()"
          >+{{ rest() }}</span
        >
      }
      @if (people().length === 0) {
        <span class="text-[12px] text-text-muted">Sin asignar</span>
      }
    </div>
  `,
  styles: `:host { display: inline-flex; }`,
})
export class AvatarStackComponent {
  readonly people = input.required<readonly StackPerson[]>();
  readonly max = input<number>(3);
  readonly size = input<number>(28);

  protected readonly visible = computed(() => this.people().slice(0, this.max()));
  protected readonly rest = computed(() => this.people().length - this.max());
}
