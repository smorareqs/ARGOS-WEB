import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { IconComponent, IconName } from '../../atoms/icon/icon.component';

export interface SegmentOption {
  readonly value: string;
  readonly label: string;
  readonly icon?: IconName;
}

/**
 * Molécula · control segmentado (tabs compactos). El indicador blanco se
 * desliza con resorte entre opciones de igual ancho, como el de Apple.
 */
@Component({
  selector: 'app-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="relative grid rounded-field bg-primary/[0.06] p-1"
      [style.grid-template-columns]="'repeat(' + options().length + ', minmax(0, 1fr))'"
      role="radiogroup"
      [attr.aria-label]="ariaLabel()"
    >
      <span
        class="thumb pointer-events-none absolute bottom-1 left-1 top-1 rounded-sm bg-surface shadow-e1"
        [style.width]="'calc((100% - 8px) / ' + options().length + ')'"
        [style.transform]="'translateX(' + index() * 100 + '%)'"
        aria-hidden="true"
      ></span>
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          role="radio"
          class="relative z-[1] flex items-center justify-center gap-1.5 rounded-sm font-bold transition-colors duration-150"
          [class.h-8]="compact()"
          [class.h-9]="!compact()"
          [class.px-3]="!iconOnly()"
          [class.px-2.5]="iconOnly()"
          [class.text-[12px]]="true"
          [class.text-primary]="opt.value === value()"
          [class.text-text-secondary]="opt.value !== value()"
          [attr.aria-checked]="opt.value === value()"
          [attr.aria-label]="iconOnly() ? opt.label : null"
          [attr.title]="iconOnly() ? opt.label : null"
          (click)="value.set(opt.value)"
        >
          @if (opt.icon) {
            <app-icon [name]="opt.icon" [size]="16" />
          }
          @if (!iconOnly()) {
            <span>{{ opt.label }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: inline-block; }
    .thumb { transition: transform var(--spring-standard-dur) var(--spring-standard); }
  `,
})
export class SegmentedComponent {
  readonly options = input.required<readonly SegmentOption[]>();
  readonly value = model.required<string>();
  readonly iconOnly = input<boolean>(false);
  readonly compact = input<boolean>(false);
  readonly ariaLabel = input<string | null>(null);

  protected readonly index = computed(() =>
    Math.max(0, this.options().findIndex((o) => o.value === this.value())),
  );
}
