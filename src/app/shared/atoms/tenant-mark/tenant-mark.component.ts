import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { DEMO_TENANT_LOGOS } from '../../../core/tokens/api.tokens';
import { demoLogo } from '../../media/demo-brands';
import { companyArt } from '../../media/generated-art';

/**
 * Átomo · marca de una empresa (tenant): su logo, como en los selectores de
 * espacio de trabajo de Slack o Linear. Si la empresa aún no subió logo, una
 * marca abstracta estable generada a partir del nombre (no una inicial).
 */
@Component({
  selector: 'app-tenant-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="mark flex shrink-0 overflow-hidden"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.border-radius.px]="radius()"
      [attr.title]="name()"
      [attr.aria-label]="name()"
      role="img"
    >
      @if (src(); as s) {
        <img [src]="s" alt="" class="h-full w-full object-cover" (error)="logoFailed.set(true)" />
      }
    </span>
  `,
  styles: `
    :host { display: inline-flex; }
    .mark { background: var(--color-teal-washed, #e3eeea); box-shadow: inset 0 0 0 1px rgba(0, 56, 65, 0.08); }
    .mark img { animation: mark-in 240ms var(--ease-enter) both; }
    @keyframes mark-in { from { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .mark img { animation: none; } }
  `,
})
export class TenantMarkComponent {
  readonly name = input.required<string>();
  /** URL del logo que subió la empresa. */
  readonly logo = input<string | null>(null);
  readonly size = input<number>(40);

  private readonly demoLogos = inject(DEMO_TENANT_LOGOS);
  protected readonly logoFailed = signal(false);
  private readonly art = signal<string | null>(null);

  protected readonly radius = computed(() => Math.round(this.size() * 0.26));
  private readonly logoUrl = computed(
    () => this.logo() ?? (this.demoLogos ? demoLogo(this.name()) : null),
  );
  protected readonly src = computed(() =>
    this.logoUrl() && !this.logoFailed() ? this.logoUrl() : this.art(),
  );

  constructor() {
    effect((onCleanup) => {
      const name = this.name();
      if (this.logoUrl() && !this.logoFailed()) return;
      let live = true;
      onCleanup(() => (live = false));
      companyArt(name).then(
        (uri) => live && this.art.set(uri),
        () => undefined,
      );
    });
  }
}
