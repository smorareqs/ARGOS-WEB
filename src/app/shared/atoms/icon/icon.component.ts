import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/** Nombres de iconos disponibles (extraídos 1:1 del design system ARGOS). */
export type IconName =
  | 'home'
  | 'apartments'
  | 'employees'
  | 'logbook'
  | 'inventory'
  | 'itinerary'
  | 'metrics'
  | 'maintenance'
  | 'mail'
  | 'lock'
  | 'arrow-right'
  | 'bell'
  | 'search'
  | 'alert-chat'
  | 'alert-triangle'
  | 'eye'
  | 'eye-off';

/** Cuerpo SVG (sin el <svg> contenedor) por icono. `currentColor` para heredar. */
const ICONS: Record<IconName, string> = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  apartments:
    '<path d="M4 21V8l8-5 8 5v13" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><rect x="9" y="13" width="6" height="8" stroke="currentColor" stroke-width="1.8"/>',
  employees:
    '<circle cx="9" cy="8" r="3.4" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6M16 6.5a3 3 0 010 5.5M17 14c2.4.5 4 2.7 4 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  logbook:
    '<rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  inventory:
    '<path d="M3 8l9-5 9 5-9 5-9-5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M3 8v8l9 5 9-5V8" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  itinerary:
    '<rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  metrics:
    '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  maintenance:
    '<path d="M12 3l9 16H3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16" r="0.7" fill="currentColor" stroke="currentColor"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M4 7l8 6 8-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M8 10.5V8a4 4 0 018 0v2.5" stroke="currentColor" stroke-width="1.7"/>',
  'arrow-right':
    '<path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>',
  bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.5 21a2 2 0 003 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  search:
    '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  'alert-chat':
    '<path d="M2 4h13v11H8l-4 4v-4H2z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="20" cy="6" r="3" fill="#E59A8F"/>',
  'alert-triangle':
    '<path d="M12 3l9 16H3z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="16" r="0.7" fill="currentColor" stroke="currentColor"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/>',
  'eye-off':
    '<path d="M3 3l18 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M10.6 6.2A10 10 0 0112 6c6.5 0 10 7 10 7a17 17 0 01-3 3.7M6.5 6.6A17 17 0 002 13s3.5 7 10 7a10 10 0 004.3-.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 10.6a3 3 0 004 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
};

/**
 * Átomo · icono SVG. Hereda el color vía `currentColor`, así que se controla
 * con utilidades de texto de Tailwind (text-primary, text-white/55, …).
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      [innerHTML]="svg()"
    ></svg>
  `,
  styles: `:host { display: inline-flex; line-height: 0; }`,
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<IconName>();
  readonly size = input<number>(18);

  protected readonly svg = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()]),
  );
}
