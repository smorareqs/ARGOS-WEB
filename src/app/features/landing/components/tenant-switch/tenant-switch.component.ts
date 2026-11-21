import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { PhotoComponent } from '../../../../shared/atoms/photo/photo.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InViewDirective } from '../../../../shared/directives/in-view.directive';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { TenantMarkComponent } from '../../../../shared/atoms/tenant-mark/tenant-mark.component';
import { PHOTOS } from '../../../../shared/media/photos';
import { DEMO_LOGOS } from '../../../../shared/media/demo-brands';

interface TenantRow {
  readonly logo: string;
  readonly name: string;
  readonly detail: string;
}

/**
 * Visual de "Multiempresa": el selector de empresas de ARGOS sobre una calle
 * de Antigua. Mientras está en pantalla, la selección pasa de una empresa a
 * otra (como lo hace quien trabaja para varias) sin cerrar sesión.
 */
@Component({
  selector: 'app-tenant-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhotoComponent, IconComponent, InViewDirective, AvatarComponent, TenantMarkComponent],
  template: `
    <div class="relative" appInView (entered)="start()">
      <app-photo
        class="aspect-[4/3.4] rounded-hero sm:aspect-[5/4]"
        [photo]="photo"
        sizes="(min-width: 1024px) 600px, 100vw"
      />
      <span class="caption absolute right-3 top-3 flex items-center gap-1.5 rounded-xs px-2 py-1 text-[11px] text-white">
        <app-icon name="map-pin" [size]="12" /> Antigua Guatemala
      </span>

      <div
        class="card absolute bottom-3 left-3 w-[min(330px,calc(100%-24px))] p-2 sm:bottom-8 sm:left-8"
        role="img"
        aria-label="Selector de empresas de ARGOS con tres empresas; la selección cambia de una a otra."
      >
        <p class="px-2.5 pb-1.5 pt-1.5 text-[10.5px] uppercase tracking-[1px] text-text-muted">Tus empresas</p>
        <div class="relative">
          <span class="hl absolute inset-x-0 top-0 h-14 rounded-sm bg-teal-washed" [style.--k]="active()"></span>
          @for (t of tenants; track t.name; let i = $index) {
            <div class="relative flex h-14 items-center gap-3 px-2.5">
              <app-tenant-mark [name]="t.name" [logo]="t.logo" [size]="38" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px] font-bold text-primary">{{ t.name }}</span>
                <span class="block truncate text-[11.5px] text-text-secondary">{{ t.detail }}</span>
              </span>
              <span class="check text-primary" [class.on]="active() === i"><app-icon name="check" [size]="17" /></span>
            </div>
          }
        </div>
        <div class="mt-1.5 flex items-center gap-2.5 border-t border-divider px-2.5 pb-1 pt-2.5">
          <app-avatar initials="CR" name="Carlos Ruiz" [size]="28" />
          <span class="text-[12px] text-text-body"><b class="text-primary">Carlos Ruiz</b> · un solo acceso</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .card { background: #fff; border-radius: var(--radius-tile); box-shadow: var(--shadow-e3); }
    .caption { background: rgba(0, 29, 35, 0.45); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
    .hl { transform: translateY(calc(var(--k) * 3.5rem)); transition: transform var(--spring-standard-dur) var(--spring-standard); }
    .check { opacity: 0; transform: scale(0.6); transition: opacity 200ms var(--ease-standard), transform var(--spring-bounce-dur) var(--spring-bounce); }
    .check.on { opacity: 1; transform: none; }
    @media (prefers-reduced-motion: reduce) { .hl, .check { transition: none; } }
  `,
})
export class TenantSwitchComponent {
  protected readonly photo = PHOTOS.antiguaStreet;
  protected readonly active = signal(0);
  protected readonly tenants: readonly TenantRow[] = [
    { logo: DEMO_LOGOS.garrent, name: 'Garrent Propiedades', detail: '48 propiedades · Administración' },
    { logo: DEMO_LOGOS.costaLimpia, name: 'Costa Limpia', detail: '22 propiedades · Supervisión' },
    { logo: DEMO_LOGOS.lagoStays, name: 'Lago Stays', detail: '12 propiedades · Limpieza' },
  ];

  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  protected start(): void {
    if (this.timer || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.timer = setInterval(() => this.active.update((i) => (i + 1) % this.tenants.length), 2600);
  }
}
