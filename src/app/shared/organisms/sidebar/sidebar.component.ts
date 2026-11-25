import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent, IconName } from '../../atoms/icon/icon.component';
import { AvatarComponent } from '../../atoms/avatar/avatar.component';
import { DimIconComponent, DimIconName } from '../../atoms/dim-icon/dim-icon.component';

export interface SidebarItem {
  readonly label: string;
  readonly icon: IconName;
  /** Ícono con volumen y color de fondo de la sección. */
  readonly dim?: DimIconName;
  readonly tint?: string;
  readonly route: string;
  /** Contador opcional (ej. mantenimiento · 3). */
  readonly badge?: number;
  /** Sección planificada pero aún no construida (muestra "Pronto"). */
  readonly soon?: boolean;
}

export interface SidebarSection {
  readonly label: string | null;
  readonly items: readonly SidebarItem[];
}

export interface SidebarUser {
  readonly nombre: string;
  readonly iniciales: string;
  readonly rol: string;
}

/**
 * Organismo · navegación principal como panel flotante que sale del botón de
 * menú de la topbar (como la bandeja de notificaciones, pero a la izquierda).
 * No ocupa columna: el contenido usa siempre el 100 % del ancho. Lo abre y
 * cierra el layout (clic, o al pasar el cursor sobre el botón en escritorio).
 * Presentacional: recibe secciones ya filtradas por permisos.
 *
 * Cada sección es un mosaico de su color con su ícono con volumen (como la
 * biblioteca de apps de iOS), agrupados por área; la activa lleva borde.
 */
@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, IconComponent, AvatarComponent, DimIconComponent],
  host: {
    class: 'sidebar-host',
    '[class.is-open]': 'open()',
    '(pointerenter)': 'hover.emit(true)',
    '(pointerleave)': 'hover.emit(false)',
  },
  template: `
    <nav id="argos-nav" class="side flex max-h-full flex-col rounded-sheet pb-3 pt-3 font-sans" aria-label="Navegación principal">
      <div class="list min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3">
        @for (section of sections(); track $index; let firstSection = $first) {
          @if (section.label) {
            <div class="px-1 pb-2 pt-3 text-[10.5px] font-bold uppercase tracking-[1.4px] text-text-secondary" [class.!pt-0]="firstSection">{{ section.label }}</div>
          }
          <div class="grid grid-cols-3 gap-2" [class.mt-1]="!section.label && !firstSection">
            @for (item of section.items; track item.route; let i = $index) {
              <a
                [routerLink]="item.route"
                routerLinkActive="is-active"
                [routerLinkActiveOptions]="{ exact: false }"
                class="tile group"
                [style.--tint]="item.tint ?? '#e6eeec'"
                [style.--i]="i"
                (click)="navigate.emit()"
              >
                @if (item.dim) {
                  <app-dim-icon [name]="item.dim" [size]="38" />
                } @else {
                  <app-icon [name]="item.icon" [size]="22" class="text-primary" />
                }
                <span class="tile-label">{{ item.label }}</span>
                @if (item.badge) {
                  <span class="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-pill bg-danger px-1.5 text-[11px] font-bold text-white">{{ item.badge }}</span>
                }
              </a>
            }
          </div>
        }
      </div>

      <div class="mx-3 mt-3 flex items-center gap-[11px] border-t border-divider px-1 pt-3">
        <app-avatar [initials]="user().iniciales" [name]="user().nombre" tone="secondary" [size]="32" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-[12.5px] font-bold text-primary">{{ user().nombre }}</div>
          <div class="truncate text-[10.5px] text-text-secondary">{{ user().rol }} · {{ tenant() }}</div>
        </div>
      </div>
    </nav>
  `,
  styles: `
    :host { position: fixed; z-index: 50; top: calc(var(--topbar-h) - 2px); left: 12px; width: 344px;
      max-height: calc(100dvh - var(--topbar-h) - 8px); display: flex; flex-direction: column;
      visibility: hidden; opacity: 0; transform: translateY(-6px) scale(0.98); transform-origin: 20px 0;
      transition: opacity 140ms var(--ease-exit), transform 180ms var(--ease-exit), visibility 0s linear 180ms; }
    :host(.is-open) { visibility: visible; opacity: 1; transform: none;
      transition: opacity var(--dur-fast) var(--ease-standard), transform var(--spring-snappy-dur) var(--spring-snappy), visibility 0s; }
    @media (max-width: 639px) { :host { left: 8px; width: min(344px, calc(100vw - 16px)); } }
    @media (prefers-reduced-motion: reduce) { :host, :host(.is-open) { transform: none; } .tile { animation: none !important; } }
    .side { background: var(--color-surface); box-shadow: 0 0 0 1px rgba(0, 56, 65, .06), 0 18px 48px rgba(0, 56, 65, .22); }
    .list { scrollbar-width: none; }
    .tile { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px 9px;
      border-radius: 14px; background: color-mix(in srgb, var(--tint) 55%, #fff); transition: transform var(--spring-snappy-dur) var(--spring-snappy), background var(--dur-fast), box-shadow var(--dur-fast); }
    :host(.is-open) .tile { animation: tile-in 380ms var(--spring-standard) backwards; animation-delay: calc(var(--i) * 30ms); }
    @keyframes tile-in { from { opacity: 0; transform: translateY(8px) scale(.94); } }
    .tile:hover { background: var(--tint); transform: translateY(-2px); }
    .tile.is-active { background: var(--tint); box-shadow: inset 0 0 0 2px var(--color-primary); }
    .tile-label { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; font-weight: 700; color: var(--color-primary); }
  `,
})
export class SidebarComponent {
  readonly sections = input.required<readonly SidebarSection[]>();
  readonly user = input.required<SidebarUser>();
  readonly tenant = input<string>('');
  readonly open = input<boolean>(false);

  readonly navigate = output<void>();
  /** El cursor entra (true) o sale (false) del panel: el layout cierra el vistazo. */
  readonly hover = output<boolean>();
}
