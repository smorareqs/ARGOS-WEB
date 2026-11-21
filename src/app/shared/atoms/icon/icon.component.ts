import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

const S = 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

/**
 * Catálogo de iconos (trazo redondeado de 1.8 sobre 24 px, mismo lenguaje que
 * Material Symbols Rounded para compartir nombres con la app, ux-ui.md §2.4).
 * `currentColor` para heredar el color del texto. Nunca emoji.
 */
const ICONS = {
  home: `<path d="M3.5 10.8L12 4l8.5 6.8V19a1.5 1.5 0 01-1.5 1.5h-4.2v-5.8H9.2v5.8H5A1.5 1.5 0 013.5 19z" ${S}/>`,
  apartments: `<path d="M4 21V8l8-5 8 5v13" ${S}/><rect x="9" y="13" width="6" height="8" ${S}/>`,
  building: `<path d="M4.5 20.5V5.5A1.5 1.5 0 016 4h7.5A1.5 1.5 0 0115 5.5v15M15 9.5h3.5A1.5 1.5 0 0120 11v9.5M3 20.5h18M8 8h3.5M8 12h3.5M8 16h3.5" ${S}/>`,
  employees: `<circle cx="9" cy="8" r="3.4" ${S}/><path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6M16 5a3 3 0 010 6M17.5 14c2.2.6 3.5 2.9 3.5 6" ${S}/>`,
  'user-plus': `<circle cx="10" cy="8" r="3.5" ${S}/><path d="M3.5 20c0-3.6 2.9-6.5 6.5-6.5 1.6 0 3 .5 4.1 1.4M18.5 14.5v6M15.5 17.5h6" ${S}/>`,
  logbook: `<rect x="4" y="3" width="16" height="18" rx="2.5" ${S}/><path d="M8 8h8M8 12h8M8 16h5" ${S}/>`,
  inventory: `<path d="M3 8l9-5 9 5-9 5-9-5z" ${S}/><path d="M3 8v8l9 5 9-5V8M12 13v8" ${S}/>`,
  itinerary: `<rect x="3" y="5" width="18" height="16" rx="2.5" ${S}/><path d="M3 9.5h18M8 3v4M16 3v4" ${S}/>`,
  'calendar-check': `<rect x="3" y="5" width="18" height="16" rx="2.5" ${S}/><path d="M3 9.5h18M8 3v4M16 3v4M9 15l2 2 4-4" ${S}/>`,
  metrics: `<path d="M4 20V11M10 20V5M16 20v-6M2.5 20.5h19" ${S}/>`,
  maintenance: `<path d="M14.6 5.4a4 4 0 00-5.2 5.1l-5.6 5.6a1.8 1.8 0 002.5 2.5l5.6-5.6a4 4 0 005.1-5.2l-2.6 2.6-2.4-.5-.5-2.4z" ${S}/>`,
  broom: `<path d="M16.5 3l-4 7.5M6.8 10.5h8.4l2 10H4.8zM9 15v5.5M12 15v5.5M15 15v5.5" ${S}/>`,
  alert: `<path d="M12 4.2l8.6 15.1a1 1 0 01-.9 1.5H4.3a1 1 0 01-.9-1.5z" ${S}/><path d="M12 10v4.2" ${S}/><circle cx="12" cy="17.2" r=".9" fill="currentColor"/>`,
  'alert-triangle': `<path d="M12 4.2l8.6 15.1a1 1 0 01-.9 1.5H4.3a1 1 0 01-.9-1.5z" ${S}/><path d="M12 10v4.2" ${S}/><circle cx="12" cy="17.2" r=".9" fill="currentColor"/>`,
  'alert-chat': `<path d="M3 5.5A1.5 1.5 0 014.5 4h11A1.5 1.5 0 0117 5.5v8a1.5 1.5 0 01-1.5 1.5H9l-4 4v-4h-.5A1.5 1.5 0 013 13.5z" ${S}/><circle cx="20" cy="6" r="2.6" fill="currentColor"/>`,
  chat: `<path d="M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v9a1.5 1.5 0 01-1.5 1.5H9.5L5 20v-4h.5A1.5 1.5 0 014 14.5z" ${S}/>`,
  bell: `<path d="M18 9a6 6 0 10-12 0c0 6.5-2.5 8-2.5 8h17S18 15.5 18 9" ${S}/><path d="M10.3 20.5a2 2 0 003.4 0" ${S}/>`,
  mail: `<rect x="3" y="5" width="18" height="14" rx="2.5" ${S}/><path d="M4 7.5l8 5.5 8-5.5" ${S}/>`,
  lock: `<rect x="4.5" y="10.5" width="15" height="10" rx="2.5" ${S}/><path d="M8 10.5V8a4 4 0 018 0v2.5" ${S}/>`,
  key: `<circle cx="8" cy="15" r="4" ${S}/><path d="M11 12l8.5-8.5M16.5 6.5L19 9M14 9.5l1.8 1.8" ${S}/>`,
  shield: `<path d="M12 3.2l7.5 2.9v5.6c0 4.5-3.1 8.2-7.5 9.5-4.4-1.3-7.5-5-7.5-9.5V6.1z" ${S}/><path d="M9 12l2.2 2.2L15.5 10" ${S}/>`,
  search: `<circle cx="11" cy="11" r="6.8" ${S}/><path d="M16.2 16.2L21 21" ${S}/>`,
  'arrow-right': `<path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`,
  'arrow-left': `<path d="M19 12H6M11 6l-6 6 6 6" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`,
  'arrow-up-right': `<path d="M7 17L17 7M8.5 7H17v8.5" ${S}/>`,
  'chevron-right': `<path d="M9.5 6l6 6-6 6" ${S}/>`,
  'chevron-left': `<path d="M14.5 6l-6 6 6 6" ${S}/>`,
  'chevron-down': `<path d="M6 9.5l6 6 6-6" ${S}/>`,
  'chevron-up-down': `<path d="M8 9.5l4-4 4 4M8 14.5l4 4 4-4" ${S}/>`,
  plus: `<path d="M12 5v14M5 12h14" ${S}/>`,
  x: `<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ${S}/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5" ${S}/>`,
  'check-double': `<path d="M2.5 12.5L7 17l9.5-9.5M12.5 16l1 1L23 7.5" ${S}/>`,
  'check-circle': `<circle cx="12" cy="12" r="8.8" ${S}/><path d="M8.3 12.3l2.5 2.5 4.9-5" ${S}/>`,
  clock: `<circle cx="12" cy="12" r="8.8" ${S}/><path d="M12 7.5V12l3 2" ${S}/>`,
  play: `<path d="M8 5.5v13l10.5-6.5z" ${S}/>`,
  pause: `<path d="M9 5.5v13M15 5.5v13" ${S}/>`,
  grid: `<rect x="4" y="4" width="7" height="7" rx="2" ${S}/><rect x="13" y="4" width="7" height="7" rx="2" ${S}/><rect x="4" y="13" width="7" height="7" rx="2" ${S}/><rect x="13" y="13" width="7" height="7" rx="2" ${S}/>`,
  list: `<path d="M9 6.5h11M9 12h11M9 17.5h11" ${S}/><circle cx="4.5" cy="6.5" r="1.1" fill="currentColor"/><circle cx="4.5" cy="12" r="1.1" fill="currentColor"/><circle cx="4.5" cy="17.5" r="1.1" fill="currentColor"/>`,
  filter: `<path d="M4 7h9M17 7h3M4 17h3M11 17h9" ${S}/><circle cx="15" cy="7" r="2" ${S}/><circle cx="9" cy="17" r="2" ${S}/>`,
  more: `<circle cx="5.5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor"/>`,
  'map-pin': `<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" ${S}/><circle cx="12" cy="10" r="2.4" ${S}/>`,
  bed: `<path d="M3 18.5v-7A1.5 1.5 0 014.5 10h15a1.5 1.5 0 011.5 1.5v7M3 15h18M3 18.5V20M21 18.5V20M6 10V7.5A1.5 1.5 0 017.5 6h9A1.5 1.5 0 0118 7.5V10" ${S}/>`,
  bath: `<path d="M4 12h16v2a5 5 0 01-5 5H9a5 5 0 01-5-5zM6.5 12V6.5a2 2 0 013.7-1M7.5 19l-1 1.8M16.5 19l1 1.8" ${S}/>`,
  guests: `<circle cx="9" cy="8" r="3.4" ${S}/><path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6M16 5a3 3 0 010 6M17.5 14c2.2.6 3.5 2.9 3.5 6" ${S}/>`,
  logout: `<path d="M9.5 20.5H6A1.5 1.5 0 014.5 19V5A1.5 1.5 0 016 3.5h3.5M15 8l4 4-4 4M19 12H9.5" ${S}/>`,
  settings: `<circle cx="12" cy="12" r="3" ${S}/><path d="M12 2.8l1.7 2.3 2.8-.4.9 2.7 2.6 1.1-.6 2.8L21.2 12l-1.8 2.2.6 2.8-2.6 1.1-.9 2.7-2.8-.4L12 21.2l-1.7-2.3-2.8.4-.9-2.7-2.6-1.1.6-2.8L2.8 12l1.8-2.2L4 7l2.6-1.1.9-2.7 2.8.4z" ${S}/>`,
  globe: `<circle cx="12" cy="12" r="8.8" ${S}/><path d="M3.5 12h17M12 3.2c2.4 2.5 3.6 5.4 3.6 8.8s-1.2 6.3-3.6 8.8c-2.4-2.5-3.6-5.4-3.6-8.8S9.6 5.7 12 3.2z" ${S}/>`,
  menu: `<path d="M4 7h16M4 12h16M4 17h10" ${S}/>`,
  sidebar: `<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" ${S}/><path d="M9.5 4.5v15" ${S}/>`,
  refresh: `<path d="M19.5 12.5a7.5 7.5 0 11-2.2-5.8M19.5 4.5v4.5H15" ${S}/>`,
  send: `<path d="M4.5 12L20 4.5 15 20l-3-6.5z" ${S}/><path d="M12 13.5l8-9" ${S}/>`,
  trash: `<path d="M5 7h14M10 7V5h4v2M7 7l.9 12.5A1.5 1.5 0 009.4 21h5.2a1.5 1.5 0 001.5-1.5L17 7" ${S}/>`,
  undo: `<path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11" ${S}/>`,
  info: `<circle cx="12" cy="12" r="8.8" ${S}/><path d="M12 11v5.5" ${S}/><circle cx="12" cy="7.8" r="1" fill="currentColor"/>`,
  ban: `<circle cx="12" cy="12" r="8.8" ${S}/><path d="M5.8 18.2L18.2 5.8" ${S}/>`,
  copy: `<rect x="8.5" y="8.5" width="12" height="12" rx="2.5" ${S}/><path d="M15.5 8.5V6A1.5 1.5 0 0014 4.5H6A1.5 1.5 0 004.5 6v8A1.5 1.5 0 006 15.5h2.5" ${S}/>`,
  swap: `<path d="M7 7.5h12.5l-3.5-3.5M17 16.5H4.5L8 20" ${S}/>`,
  star: `<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" ${S}/>`,
  eye: `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" ${S}/><circle cx="12" cy="12" r="3" ${S}/>`,
  'eye-off': `<path d="M3 3l18 18M10.6 6.2A10 10 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-3 3.7M6.5 6.6A17 17 0 002 12s3.5 7 10 7a10 10 0 004.3-.9M9.5 10.6a3 3 0 004 4" ${S}/>`,
  door: `<path d="M6 20.5V4.5A1.5 1.5 0 017.5 3h9A1.5 1.5 0 0118 4.5v16M4 20.5h16" ${S}/><circle cx="14.5" cy="12.5" r="1" fill="currentColor"/>`,
  car: `<path d="M5 16.5V12l1.8-4.5A1.5 1.5 0 018.2 6.5h7.6a1.5 1.5 0 011.4 1L19 12v4.5zM5 16.5V19M19 16.5V19M5 12h14" ${S}/><circle cx="8.3" cy="14.3" r=".9" fill="currentColor"/><circle cx="15.7" cy="14.3" r=".9" fill="currentColor"/>`,
  umbrella: `<path d="M12 4a8 8 0 018 8H4a8 8 0 018-8zM12 12v6.5a2 2 0 01-4 0" ${S}/>`,
  badge: `<rect x="3.5" y="5" width="17" height="14" rx="2.5" ${S}/><circle cx="9" cy="11" r="2" ${S}/><path d="M6.3 16c.5-1.4 1.5-2.1 2.7-2.1s2.2.7 2.7 2.1M14 10h3.5M14 13.5h3.5" ${S}/>`,
  phone: `<path d="M5.5 4h3l1.6 4.4-2 1.4a11 11 0 005.1 5.1l1.4-2L19 14.5v3A1.5 1.5 0 0117.5 19C10.6 19 5 13.4 5 6.5A1.5 1.5 0 015.5 4z" ${S}/>`,
  wifi: `<path d="M2.5 9a14 14 0 0119 0M5.5 12.3a9.5 9.5 0 0113 0M8.5 15.5a5 5 0 017 0" ${S}/><circle cx="12" cy="18.6" r="1.1" fill="currentColor"/>`,
  sun: `<circle cx="12" cy="12" r="4" ${S}/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" ${S}/>`,
  moon: `<path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z" ${S}/>`,
} as const;

export type IconName = keyof typeof ICONS;

/**
 * Átomo · icono SVG. Hereda el color vía `currentColor`. Si comunica algo por
 * sí solo, pasar `label` (aria-label); si acompaña a un texto, queda oculto
 * para lectores de pantalla.
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
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label()"
      [attr.aria-hidden]="label() ? null : 'true'"
      [innerHTML]="svg()"
    ></svg>
  `,
  styles: `:host { display: inline-flex; line-height: 0; flex-shrink: 0; }`,
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<IconName>();
  readonly size = input<number>(18);
  readonly label = input<string | null>(null);

  protected readonly svg = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()]),
  );
}
