import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { IconName } from '../icon/icon.component';

export type DimIconName =
  | 'house'
  | 'apartment'
  | 'room'
  | 'building'
  | 'other'
  | 'cleaning'
  | 'clock'
  | 'incident'
  | 'arrivals'
  | 'warning'
  | 'balance'
  | 'box'
  | 'team'
  | 'chart'
  | 'calendar'
  | 'done'
  | 'lock'
  | 'blocked'
  | 'search'
  | 'sun'
  | 'moon'
  | 'bell'
  | 'chat'
  | 'wallet'
  | 'logbook'
  | 'gear'
  | 'pool'
  | 'car'
  | 'linens'
  | 'amenities'
  | 'kitchen'
  | 'key'
  | 'hvac'
  | 'water'
  | 'electrical'
  | 'elevator'
  | 'camera'
  | 'paint'
  | 'appliance'
  | 'plumbing'
  | 'furniture';

/** Ícono de línea de un indicador → su versión con volumen (si existe). */
export const DIM_FROM_LINE: Partial<Record<IconName, DimIconName>> = {
  broom: 'cleaning',
  clock: 'clock',
  maintenance: 'incident',
  door: 'arrivals',
  'alert-triangle': 'warning',
  swap: 'balance',
  inventory: 'box',
  employees: 'team',
  metrics: 'chart',
  itinerary: 'calendar',
  'check-circle': 'done',
  lock: 'lock',
  apartments: 'building',
  ban: 'blocked'
};

/**
 * Átomo · íconos con volumen (ref. la iconografía dimensional de Airbnb 2025):
 * objetos reconocibles de la operación con luz arriba a la izquierda, sombra
 * de contacto y un detalle dorado. Pintan con los degradados globales
 * `#dg-*` de index.html, así no repiten definiciones por instancia.
 *
 * Entran con un pequeño rebote y, al pasar el cursor (sobre el ícono o sobre
 * una tarjeta `.group`/`.lift`), cada uno hace su gesto: las ventanas se
 * encienden, el despertador suena, la maleta salta, la balanza se mece.
 *
 * Úsalos donde un ícono representa algo (indicadores, tipos de propiedad,
 * pines del mapa). En controles y navegación siguen los íconos de línea.
 */
@Component({
  selector: 'app-dim-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dim', '[style.width.px]': 'size()', '[style.height.px]': 'size()', '[class.still]': '!animate()' },
  template: `
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
      @switch (name()) {
        @case ('house') {
          <ellipse cx="24" cy="42.5" rx="18" ry="3.6" fill="url(#dg-shadow)"/>
          <polygon points="29,23.5 41,19.2 41,37 29,40.6" fill="url(#dg-sand-dk)"/>
          <polygon points="7.5,23.5 18.2,14 29,23.5 29,40.6 7.5,40.6" fill="url(#dg-sand)"/>
          <polygon points="18.2,13.2 30.4,8.8 43.2,18.9 30.6,24" fill="url(#dg-roof)"/>
          <path d="M6 24.6 18.2 13.6 30.8 24.4" fill="none" stroke="url(#dg-roof-dk)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M14.4 40.6v-7.6a3.8 3.8 0 0 1 7.6 0v7.6z" fill="url(#dg-teal)"/>
          <circle cx="18.2" cy="23.6" r="2.3" class="di-win" fill="url(#dg-glass)"/>
          <polygon points="32,27 37.6,25.1 37.6,30.6 32,32.5" class="di-win" fill="url(#dg-glass)"/>
          <polygon points="7.5,39 29,39 29,40.6 7.5,40.6" fill="#003841" fill-opacity=".12"/>
          <polygon points="29,39 41,35.4 41,37 29,40.6" fill="#003841" fill-opacity=".16"/>
          <path d="M8.4 25v13.4" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1.1" stroke-linecap="round"/>
          <g class="di-pop"><circle cx="6.4" cy="38.2" r="3.4" fill="url(#dg-leaf)"/><circle cx="9.6" cy="39.3" r="2.5" fill="url(#dg-green)"/></g>
        }
        @case ('apartment') {
          <ellipse cx="24" cy="42.5" rx="14" ry="2.8" fill="url(#dg-shadow)"/>
          <polygon points="27,10.5 36,7.4 36,38.4 27,41.5" fill="url(#dg-white-dk)"/>
          <polygon points="12,10.5 27,10.5 27,41.5 12,41.5" fill="url(#dg-white)"/>
          <polygon points="12,10.5 21,7.4 36,7.4 27,10.5" fill="#F7FAF8"/>
          <rect x="14.2" y="14" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:0ms" fill="url(#dg-glass)"/><rect x="18.6" y="14" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:60ms" fill="url(#dg-glass)"/><rect x="23" y="14" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:120ms" fill="url(#dg-glass)"/><rect x="14.2" y="19.3" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:180ms" fill="url(#dg-glass)"/><rect x="18.6" y="19.3" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:240ms" fill="url(#dg-glass)"/><rect x="23" y="19.3" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:300ms" fill="url(#dg-glass)"/><rect x="14.2" y="24.6" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:360ms" fill="url(#dg-glass)"/><rect x="18.6" y="24.6" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:420ms" fill="url(#dg-glass)"/><rect x="23" y="24.6" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:480ms" fill="url(#dg-glass)"/><rect x="14.2" y="29.9" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:540ms" fill="url(#dg-glass)"/><rect x="18.6" y="29.9" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:600ms" fill="url(#dg-glass)"/><rect x="23" y="29.9" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:660ms" fill="url(#dg-glass)"/>
          <polygon points="29,14.4 33.6,12.8 33.6,16 29,17.6" fill="url(#dg-glass)" opacity=".85"/><polygon points="29,19.7 33.6,18.1 33.6,21.3 29,22.900000000000002" fill="url(#dg-glass)" opacity=".85"/><polygon points="29,25 33.6,23.400000000000002 33.6,26.6 29,28.200000000000003" fill="url(#dg-glass)" opacity=".85"/><polygon points="29,30.299999999999997 33.6,28.7 33.6,31.9 29,33.5" fill="url(#dg-glass)" opacity=".85"/>
          <rect x="16.8" y="35.6" width="5.4" height="5.9" rx="1" fill="url(#dg-teal)"/>
          <rect x="16" y="34.8" width="7" height="1.4" rx=".6" fill="url(#dg-roof)"/>
          <path d="M12.9 12v28.5" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1.1" stroke-linecap="round"/>
          <g class="di-pop"><g class=""><polygon points="25,5.199999999999999 27.6,6.499999999999999 27.6,9.5 25,8.2" fill="url(#dg-gold)"/><polygon points="27.6,6.499999999999999 30.200000000000003,5.199999999999999 30.200000000000003,8.2 27.6,9.5" fill="url(#dg-gold-dk)"/><polygon points="25,5.199999999999999 27.6,3.8999999999999995 30.200000000000003,5.199999999999999 27.6,6.499999999999999" fill="url(#dg-gold)"/></g></g>
        }
        @case ('room') {
          <ellipse cx="24" cy="42.5" rx="19" ry="3.8" fill="url(#dg-shadow)"/>
          <rect x="9" y="11.5" width="30" height="15" rx="3.4" fill="url(#dg-wood)"/>
          <path d="M11.5 13.6h25" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="1.1" stroke-linecap="round"/>
          <polygon points="11,22 37,22 41.6,32.6 6.4,32.6" fill="url(#dg-white)"/>
          <g class="di-pop"><rect x="13" y="18.6" width="9.6" height="5.6" rx="2.7" fill="url(#dg-mint)"/><rect x="25.4" y="18.6" width="9.6" height="5.6" rx="2.7" fill="url(#dg-mint)"/></g>
          <polygon points="8.6,27.2 39.4,27.2 41.6,32.6 6.4,32.6" fill="url(#dg-teal)"/>
          <rect x="6.4" y="32.6" width="35.2" height="5.4" rx="1.6" fill="url(#dg-teal-dk)"/>
          <path d="M9.4 27.4h29.2" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.1" stroke-linecap="round"/>
          <rect x="9" y="38" width="2.6" height="3.4" rx=".8" fill="url(#dg-wood)"/><rect x="36.4" y="38" width="2.6" height="3.4" rx=".8" fill="url(#dg-wood)"/>
          <g class="di-accent"><polygon points="27,24.4 34,24.4 35.6,28.4 28.2,28.4" fill="url(#dg-gold)"/><path d="M28.4 26.4h6.2" stroke="#fff" stroke-opacity=".6" stroke-width=".9"/></g>
        }
        @case ('building') {
          <ellipse cx="24" cy="42.5" rx="18" ry="3.6" fill="url(#dg-shadow)"/>
          <polygon points="31,15 41.5,11.2 41.5,37.6 31,41.4" fill="url(#dg-sand-dk)"/>
          <polygon points="6.5,15 31,15 31,41.4 6.5,41.4" fill="url(#dg-sand)"/>
          <polygon points="6.5,15 17,11.2 41.5,11.2 31,15" fill="url(#dg-sand-lt)"/>
          <rect x="9" y="18" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:0ms" fill="url(#dg-glass)"/><rect x="8.5" y="21.4" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/><rect x="14.2" y="18" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:50ms" fill="url(#dg-glass)"/><rect x="13.7" y="21.4" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/><rect x="19.4" y="18" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:100ms" fill="url(#dg-glass)"/><rect x="18.9" y="21.4" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/><rect x="24.6" y="18" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:150ms" fill="url(#dg-glass)"/><rect x="24.1" y="21.4" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/><rect x="9" y="23.4" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:200ms" fill="url(#dg-glass)"/><rect x="8.5" y="26.799999999999997" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/><rect x="14.2" y="23.4" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:250ms" fill="url(#dg-glass)"/><rect x="13.7" y="26.799999999999997" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/><rect x="19.4" y="23.4" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:300ms" fill="url(#dg-glass)"/><rect x="18.9" y="26.799999999999997" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/><rect x="24.6" y="23.4" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:350ms" fill="url(#dg-glass)"/><rect x="24.1" y="26.799999999999997" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/><rect x="9" y="28.8" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:400ms" fill="url(#dg-glass)"/><rect x="8.5" y="32.2" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/><rect x="14.2" y="28.8" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:450ms" fill="url(#dg-glass)"/><rect x="13.7" y="32.2" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/><rect x="19.4" y="28.8" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:500ms" fill="url(#dg-glass)"/><rect x="18.9" y="32.2" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/><rect x="24.6" y="28.8" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:550ms" fill="url(#dg-glass)"/><rect x="24.1" y="32.2" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/>
          <polygon points="33,18.2 39.5,15.9 39.5,19.3 33,21.6" fill="url(#dg-glass)" opacity=".85"/><polygon points="33,23.599999999999998 39.5,21.299999999999997 39.5,24.7 33,27" fill="url(#dg-glass)" opacity=".85"/><polygon points="33,29 39.5,26.7 39.5,30.1 33,32.4" fill="url(#dg-glass)" opacity=".85"/>
          <rect x="14" y="35" width="10" height="6.4" rx="1" fill="url(#dg-teal)"/>
          <path d="M12.4 35.4h13.2l-1.4-2.4H13.8z" fill="url(#dg-roof)"/>
          <path d="M7.4 16.4v24" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1.1" stroke-linecap="round"/>
          <g class="di-pop"><circle cx="12" cy="11.6" r="2.4" fill="url(#dg-leaf)"/><circle cx="15.4" cy="12.2" r="1.8" fill="url(#dg-green)"/><circle cx="35.6" cy="11" r="2" fill="url(#dg-leaf)"/></g>
        }
        @case ('other') {
          <ellipse cx="24" cy="42.5" rx="14" ry="2.8" fill="url(#dg-shadow)"/>
          <g class="di-swing" style="transform-origin: 15px 17px">
          <path d="M15 8.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM15 13.2a3.8 3.8 0 1 0 0 7.6a3.8 3.8 0 1 0 0-7.6z" fill-rule="evenodd" fill="url(#dg-gold)"/>
          <path d="M9.6 12.6a7 7 0 0 1 4-2.6" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M22.6 15.2h17.6a1.6 1.6 0 0 1 1.6 1.6v1.4a1.6 1.6 0 0 1-1.6 1.6H22.6z" fill="url(#dg-gold)"/>
          <path d="M34 19.8h3v4.6h-3zM38.6 19.8h2.6v3.4h-2.6z" fill="url(#dg-gold-dk)"/>
          </g>
          <path d="M12 24.2 9.6 28.4" stroke="#8A6A45" stroke-width="1.1"/>
          <g class="di-accent"><rect x="3.6" y="27.4" width="11" height="13.6" rx="2.2" transform="rotate(-12 9 34)" fill="url(#dg-sand)"/><circle cx="8.4" cy="29.6" r="1.1" fill="#8A6A45"/><path d="M6.4 34.4l5.6-1.2M6.9 36.8l4.4-.9" stroke="#C1955C" stroke-width="1.2" stroke-linecap="round"/></g>
        }
        @case ('cleaning') {
          <ellipse cx="24" cy="42.5" rx="18" ry="3.6" fill="url(#dg-shadow)"/>
          <path d="M8.6 24.4h18.8l-2.2 15.4a2 2 0 0 1-2 1.7h-10.4a2 2 0 0 1-2-1.7z" fill="url(#dg-teal)"/>
          <ellipse cx="18" cy="24.4" rx="9.4" ry="2.7" fill="url(#dg-teal-dk)"/>
          <ellipse cx="18" cy="24.6" rx="7.8" ry="1.8" fill="#BFE0E3"/>
          <path d="M9.4 24.8C9.4 15 26.6 15 26.6 24.8" fill="none" stroke="url(#dg-steel)" stroke-width="1.6"/>
          <path d="M10.6 27.4l1.6 11.4" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="1.1" stroke-linecap="round"/>
          <g class="di-bubbles"><circle cx="15" cy="21.6" r="2" fill="#fff"/><circle cx="19.4" cy="20.6" r="2.6" fill="#fff"/><circle cx="22.6" cy="22.2" r="1.6" fill="#fff"/></g>
          <rect x="29" y="22" width="11.4" height="19.6" rx="3.2" fill="url(#dg-white)"/>
          <rect x="29" y="30.6" width="11.4" height="11" rx="3.2" fill="#7FB6BC" fill-opacity=".55"/>
          <rect x="30.8" y="25.6" width="7.8" height="6.4" rx="1.2" fill="url(#dg-mint)"/>
          <rect x="31.6" y="16.8" width="6.2" height="5.6" rx="1" fill="url(#dg-white-dk)"/>
          <g class="di-accent"><path d="M30.4 11.6h9.4l1.8 3.6-4.4 1.6h-6.8z" fill="url(#dg-gold)"/><path d="M37.6 16.6l1.4 3.6" stroke="url(#dg-gold-dk)" stroke-width="1.8" stroke-linecap="round"/></g>
          <g class="di-mist"><circle cx="44.2" cy="12.4" r="1.1" fill="#9CCAD0"/><circle cx="45.4" cy="15.6" r=".8" fill="#9CCAD0"/><circle cx="43" cy="9.4" r=".7" fill="#9CCAD0"/></g>
          <path d="M30.2 24v15" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="1.1" stroke-linecap="round"/>
        }
        @case ('clock') {
          <ellipse cx="24" cy="42.5" rx="15" ry="3.0" fill="url(#dg-shadow)"/>
          <path d="M15.6 36.4 12.6 41M32.4 36.4l3 4.6" stroke="url(#dg-teal-dk)" stroke-width="2.8" stroke-linecap="round"/>
          <g class="di-ring">
          <path d="M8.4 14.2a6.4 6.4 0 0 1 10.2-4.4z" fill="url(#dg-gold)"/>
          <path d="M39.6 14.2a6.4 6.4 0 0 0-10.2-4.4z" fill="url(#dg-gold)"/>
          <circle cx="24" cy="25.6" r="14" fill="url(#dg-teal)"/>
          <circle cx="24" cy="25.6" r="10.8" fill="url(#dg-white)"/>
          <rect x="23.3" y="16.2" width="1.4" height="2.4" rx=".7" fill="#003841" fill-opacity=".45" transform="rotate(0 24 25.6)"/><rect x="23.3" y="16.2" width="1.4" height="2.4" rx=".7" fill="#003841" fill-opacity=".45" transform="rotate(90 24 25.6)"/><rect x="23.3" y="16.2" width="1.4" height="2.4" rx=".7" fill="#003841" fill-opacity=".45" transform="rotate(180 24 25.6)"/><rect x="23.3" y="16.2" width="1.4" height="2.4" rx=".7" fill="#003841" fill-opacity=".45" transform="rotate(270 24 25.6)"/>
          <path class="di-hand-h" d="M24 25.6V19.4" stroke="#003841" stroke-width="2.2" stroke-linecap="round"/>
          <path class="di-hand-m" d="M24 25.6l5.4 3" stroke="#003841" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="24" cy="25.6" r="1.6" fill="url(#dg-gold)"/>
          <path d="M13.2 20.4a11.6 11.6 0 0 1 6.2-6.4" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1.6" stroke-linecap="round"/>
          <rect x="22.4" y="9.4" width="3.2" height="3" rx="1" fill="url(#dg-gold-dk)"/>
          </g>
        }
        @case ('incident') {
          <ellipse cx="24" cy="42.5" rx="18" ry="3.6" fill="url(#dg-shadow)"/>
          <g class="di-swing" style="transform-origin: 32px 22px"><g transform="translate(1.6 6) scale(.82)">
          <rect x="30.4" y="3.6" width="4.2" height="19" rx="1.6" transform="rotate(28 32.5 13)" fill="url(#dg-steel)"/>
          <path d="M33.8 1.2a5 5 0 1 1-2 9.6zM35.6 1.4l-1.2 4.4 3.8 1.4 1.6-3.6z" fill-rule="evenodd" fill="url(#dg-steel)"/>
          </g></g>
          <path d="M17 22.6v-4.4a2.2 2.2 0 0 1 2.2-2.2h9.6a2.2 2.2 0 0 1 2.2 2.2v4.4" fill="none" stroke="url(#dg-red-dk)" stroke-width="2.8"/>
          <rect x="7.4" y="21.4" width="33.2" height="19.4" rx="2.6" fill="url(#dg-red)"/>
          <rect x="7.4" y="21.4" width="33.2" height="5.8" rx="2.6" fill="url(#dg-red-dk)"/>
          <rect x="7.4" y="26" width="33.2" height="1.4" fill="#000" fill-opacity=".12"/>
          <g class="di-accent"><rect x="21" y="24.6" width="6" height="5" rx="1.2" fill="url(#dg-gold)"/></g>
          <path d="M9.6 29.4h28.8" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="1.1" stroke-linecap="round"/>
        }
        @case ('arrivals') {
          <ellipse cx="24" cy="42.5" rx="16" ry="3.2" fill="url(#dg-shadow)"/>
          <g class="di-hop">
          <path d="M19 15.6v-3.4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3.4" fill="none" stroke="#3D2A1E" stroke-width="2.4"/>
          <polygon points="34,17 39.6,14.6 39.6,36.4 34,38.8" fill="url(#dg-roof-dk)"/>
          <polygon points="10,17 15.6,14.6 39.6,14.6 34,17" fill="#EE9B72"/>
          <rect x="10" y="17" width="24" height="21.8" rx="2.4" fill="url(#dg-roof)"/>
          <rect x="14.2" y="17" width="2.6" height="21.8" fill="#7A3316" fill-opacity=".35"/>
          <rect x="27.2" y="17" width="2.6" height="21.8" fill="#7A3316" fill-opacity=".35"/>
          <path d="M11.4 19v17.6" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.1" stroke-linecap="round"/>
          <circle cx="14" cy="40.6" r="1.7" fill="#2C2622"/><circle cx="31" cy="40.6" r="1.7" fill="#2C2622"/>
          <g class="di-accent"><path d="M28 13.8l4.4 8.4" stroke="#8A6A45" stroke-width="1"/><rect x="29.6" y="20.6" width="7" height="9.4" rx="1.6" transform="rotate(-18 33 25.3)" fill="url(#dg-gold)"/><circle cx="32.2" cy="22.6" r=".9" fill="#8A561B"/></g>
          </g>
        }
        @case ('warning') {
          <ellipse cx="24" cy="42.5" rx="17" ry="3.4" fill="url(#dg-shadow)"/>
          <path d="M6.8 36.6h34.4l1.4 4H5.4z" fill="url(#dg-orange-dk)"/>
          <path d="M9.4 34.8h29.2l2.6 1.8H6.8z" fill="url(#dg-orange)"/>
          <g class="di-wobble">
          <path d="M22.4 7.4h3.2c.6 0 1 .4 1.2 1l7 26.4H14.2l7-26.4c.2-.6.6-1 1.2-1z" fill="url(#dg-orange)"/>
          <polygon points="20.5,17 27.5,17 28.7,21.4 19.3,21.4" fill="#fff"/>
          <polygon points="17.8,27 30.2,27 31.4,31.4 16.6,31.4" fill="#fff"/>
          <path d="M24 7.4h1.6c.6 0 1 .4 1.2 1l7 26.4H24z" fill="#7E300B" fill-opacity=".18"/>
          <path d="M21.4 10.6l-5 20" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="1.2" stroke-linecap="round"/>
          </g>
        }
        @case ('balance') {
          <ellipse cx="24" cy="42.5" rx="15" ry="3.0" fill="url(#dg-shadow)"/>
          <path d="M15.4 36.4h17.2l2 4.4H13.4z" fill="url(#dg-teal)"/>
          <rect x="22.8" y="12" width="2.4" height="24.6" rx="1" fill="url(#dg-gold)"/>
          <g class="di-rock">
          <path d="M9.4 16.4 38.6 11.2" stroke="url(#dg-gold-dk)" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M9.4 16.4 5.8 26.4M9.4 16.4l3.6 10M38.6 11.2l-3.6 10M38.6 11.2l3.6 10" stroke="#8A6A45" stroke-width=".9"/>
          <path d="M3.4 26.4h12a6 3.2 0 0 1-12 0z" fill="url(#dg-gold)"/>
          <g class=""><polygon points="5.800000000000001,21.4 9.4,23.2 9.4,27.6 5.800000000000001,25.8" fill="url(#dg-sand)"/><polygon points="9.4,23.2 13,21.4 13,25.8 9.4,27.6" fill="url(#dg-sand-dk)"/><polygon points="5.800000000000001,21.4 9.4,19.599999999999998 13,21.4 9.4,23.2" fill="url(#dg-sand-lt)"/></g>
          <path d="M32.6 21.2h12a6 3.2 0 0 1-12 0z" fill="url(#dg-gold)"/>
          <g class="di-accent"><ellipse cx="38.6" cy="20.4" rx="2.6" ry="1.3" fill="url(#dg-gold-dk)"/></g>
          </g>
          <circle cx="24" cy="12" r="2.2" fill="url(#dg-gold)"/>
        }
        @case ('box') {
          <ellipse cx="24" cy="42.5" rx="18" ry="3.6" fill="url(#dg-shadow)"/>
          <g class="di-hop">
          <g class=""><polygon points="8,20 24,28 24,42 8,34" fill="url(#dg-sand)"/><polygon points="24,28 40,20 40,34 24,42" fill="url(#dg-sand-dk)"/><polygon points="8,20 24,12 40,20 24,28" fill="url(#dg-sand-lt)"/></g>
          <polygon points="15,15.5 18,14 34,22 31,23.5" fill="#EAD2A6"/>
          <polygon points="31,23.5 34,22 34,28.6 31,30.1" fill="#C89F68"/>
          <g class="di-accent"><polygon points="12,29.4 19,32.9 19,37.9 12,34.4" fill="#fff" fill-opacity=".9"/><path d="M13.4 31.6l4.2 2.1M13.4 33.6l3 1.5" stroke="#C1955C" stroke-width=".8"/></g>
          <path d="M8.6 21v12.6" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.1" stroke-linecap="round"/>
          </g>
        }
        @case ('team') {
          <ellipse cx="24" cy="42.5" rx="13" ry="2.6" fill="url(#dg-shadow)"/>
          <path d="M16.4 2 24 13.4 31.6 2" fill="none" stroke="url(#dg-teal)" stroke-width="3.4" stroke-linejoin="round"/>
          <g class="di-swing" style="transform-origin: 24px 13px">
          <rect x="21.6" y="12" width="4.8" height="5" rx="1.2" fill="url(#dg-steel)"/>
          <rect x="12.8" y="17.4" width="24.4" height="25" rx="3.6" fill="#AFBDB9"/>
          <rect x="11.6" y="16" width="24.4" height="25" rx="3.6" fill="url(#dg-white)"/>
          <rect x="15.4" y="19.8" width="16.8" height="12.6" rx="2.2" fill="url(#dg-mint)"/>
          <circle cx="23.8" cy="24.6" r="3.2" fill="url(#dg-teal)"/>
          <path d="M17.8 32.4c0-3.6 2.7-5.2 6-5.2s6 1.6 6 5.2z" fill="url(#dg-teal)"/>
          <rect x="15.4" y="34.8" width="16.8" height="1.9" rx=".9" fill="#D3DCD9"/>
          <g class="di-accent"><rect x="18.6" y="38" width="10.4" height="1.8" rx=".9" fill="url(#dg-gold)"/></g>
          <path d="M12.8 19.4v19" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="1.1" stroke-linecap="round"/>
          </g>
        }
        @case ('chart') {
          <ellipse cx="24" cy="42.5" rx="19" ry="3.8" fill="url(#dg-shadow)"/>
          <g class=""><polygon points="6,34.6 24,43.6 24,46 6,37" fill="url(#dg-white-dk)"/><polygon points="24,43.6 42,34.6 42,37 24,46" fill="url(#dg-white-dk)"/><polygon points="6,34.6 24,25.6 42,34.6 24,43.6" fill="url(#dg-white)"/></g>
          <g class="di-bar" style="--d:0ms"><g class=""><polygon points="8.8,26.6 13,28.700000000000003 13,36.7 8.8,34.6" fill="url(#dg-teal)"/><polygon points="13,28.700000000000003 17.2,26.6 17.2,34.6 13,36.7" fill="url(#dg-teal-dk)"/><polygon points="8.8,26.6 13,24.5 17.2,26.6 13,28.700000000000003" fill="url(#dg-mint)"/></g></g>
          <g class="di-bar" style="--d:90ms"><g class=""><polygon points="19.8,20.6 24,22.700000000000003 24,36.7 19.8,34.6" fill="url(#dg-teal)"/><polygon points="24,22.700000000000003 28.2,20.6 28.2,34.6 24,36.7" fill="url(#dg-teal-dk)"/><polygon points="19.8,20.6 24,18.5 28.2,20.6 24,22.700000000000003" fill="url(#dg-mint)"/></g></g>
          <g class="di-bar di-accent" style="--d:180ms"><g class=""><polygon points="30.8,13.600000000000001 35,15.700000000000001 35,36.7 30.8,34.6" fill="url(#dg-gold)"/><polygon points="35,15.700000000000001 39.2,13.600000000000001 39.2,34.6 35,36.7" fill="url(#dg-gold-dk)"/><polygon points="30.8,13.600000000000001 35,11.500000000000002 39.2,13.600000000000001 35,15.700000000000001" fill="url(#dg-gold)"/></g></g>
        }
        @case ('calendar') {
          <ellipse cx="24" cy="42.5" rx="16" ry="3.2" fill="url(#dg-shadow)"/>
          <rect x="10.6" y="13.6" width="28.6" height="28" rx="3.4" fill="#B9C6C2"/>
          <rect x="9.4" y="12" width="28.6" height="28" rx="3.4" fill="url(#dg-white)"/>
          <path d="M9.4 15.4a3.4 3.4 0 0 1 3.4-3.4h21.8a3.4 3.4 0 0 1 3.4 3.4V20H9.4z" fill="url(#dg-roof)"/>
          <rect x="15.2" y="8.4" width="3" height="7" rx="1.5" fill="url(#dg-steel)"/><rect x="29.2" y="8.4" width="3" height="7" rx="1.5" fill="url(#dg-steel)"/>
          <rect x="13.2" y="23.4" width="3.6" height="3.2" rx=".8" fill="#D6DEDB"/><rect x="19" y="23.4" width="3.6" height="3.2" rx=".8" fill="#D6DEDB"/><rect x="24.8" y="23.4" width="3.6" height="3.2" rx=".8" fill="#D6DEDB"/><rect x="30.6" y="23.4" width="3.6" height="3.2" rx=".8" fill="#D6DEDB"/><rect x="13.2" y="28.6" width="3.6" height="3.2" rx=".8" fill="#D6DEDB"/><rect x="19" y="28.6" width="3.6" height="3.2" rx=".8" fill="#D6DEDB"/><rect x="30.6" y="28.6" width="3.6" height="3.2" rx=".8" fill="#D6DEDB"/><rect x="13.2" y="33.8" width="3.6" height="3.2" rx=".8" fill="#D6DEDB"/><rect x="19" y="33.8" width="3.6" height="3.2" rx=".8" fill="#D6DEDB"/><rect x="24.8" y="33.8" width="3.6" height="3.2" rx=".8" fill="#D6DEDB"/><rect x="30.6" y="33.8" width="3.6" height="3.2" rx=".8" fill="#D6DEDB"/>
          <g class="di-accent"><rect x="24.2" y="28" width="4.8" height="4.4" rx="1.1" fill="url(#dg-gold)"/></g>
          <path d="M10.6 21.6v16.6" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="1.1" stroke-linecap="round"/>
        }
        @case ('done') {
          <ellipse cx="24" cy="42.5" rx="14" ry="2.8" fill="url(#dg-shadow)"/>
          <g class="di-flip">
          <circle cx="24" cy="25.6" r="14.6" fill="url(#dg-green-dk)"/>
          <circle cx="24" cy="23.8" r="14.6" fill="url(#dg-green)"/>
          <circle cx="24" cy="23.8" r="11" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>
          <path d="M17.8 24.2l4.4 4.4 8-9" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M13.4 18.4a12 12 0 0 1 6-6" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="1.6" stroke-linecap="round"/>
          </g>
        }
        @case ('lock') {
          <ellipse cx="24" cy="42.5" rx="14" ry="2.8" fill="url(#dg-shadow)"/>
          <path class="di-shackle" d="M16.6 22v-6.2a7.4 7.4 0 0 1 14.8 0V22" fill="none" stroke="url(#dg-steel)" stroke-width="3.8" stroke-linecap="round"/>
          <rect x="11" y="22.4" width="26" height="19" rx="4" fill="url(#dg-gold-dk)"/>
          <rect x="11" y="20.4" width="26" height="19" rx="4" fill="url(#dg-gold)"/>
          <circle cx="24" cy="28.4" r="2.6" fill="#5A3A12"/><path d="M22.8 29.6h2.4l.6 4.8h-3.6z" fill="#5A3A12"/>
          <path d="M13.4 23v13" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="1.3" stroke-linecap="round"/>
        }
        @case ('blocked') {
          <ellipse cx="24" cy="42.5" rx="12" ry="2.4" fill="url(#dg-shadow)"/>
          <rect x="22.6" y="33" width="2.8" height="9" rx="1" fill="url(#dg-steel)"/>
          <g class="di-wobble" style="transform-origin: 24px 40px">
          <polygon points="18.4,10.6 29.6,10.6 37.4,18.4 37.4,29.6 29.6,37.4 18.4,37.4 10.6,29.6 10.6,18.4" fill="url(#dg-red-dk)" transform="translate(0 1.6)"/>
          <polygon points="18.4,10.6 29.6,10.6 37.4,18.4 37.4,29.6 29.6,37.4 18.4,37.4 10.6,29.6 10.6,18.4" fill="url(#dg-red)"/>
          <polygon points="19.3,12.8 28.7,12.8 35.2,19.3 35.2,28.7 28.7,35.2 19.3,35.2 12.8,28.7 12.8,19.3" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.2"/>
          <rect x="16" y="21.6" width="16" height="4.8" rx="1.4" fill="#fff"/>
          <path d="M14.2 17l4.6-4.6" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="1.4" stroke-linecap="round"/>
          </g>
        }
        @case ('search') {
          <ellipse cx="24" cy="42.5" rx="14" ry="2.8" fill="url(#dg-shadow)"/>
          <g class="di-swing" style="transform-origin: 20px 20px">
          <rect x="30.5" y="25.5" width="6.4" height="16" rx="2.8" transform="rotate(-45 33.7 33.5)" fill="url(#dg-teal)"/>
          <rect x="27.6" y="26.6" width="5" height="4.6" rx="1" transform="rotate(-45 30.1 28.9)" fill="url(#dg-teal-dk)"/>
          <circle cx="20" cy="20" r="13" fill="url(#dg-steel)"/>
          <circle cx="20" cy="20" r="10" fill="url(#dg-glass)"/>
          <path d="M13.4 16a8 8 0 0 1 5-4.8" fill="none" stroke="#fff" stroke-opacity="0.9" stroke-width="2" stroke-linecap="round"/>
          <g class="di-accent"><circle cx="24.6" cy="24.2" r="1.7" fill="#fff" fill-opacity=".75"/></g>
          </g>
        }
        @case ('sun') {
          <ellipse cx="24" cy="42.5" rx="13" ry="2.6" fill="url(#dg-shadow)"/>
          <g class="di-spin-slow" style="transform-origin: 22px 21px">
          <rect x="20.6" y="3" width="2.8" height="6" rx="1.4" fill="url(#dg-gold)" transform="rotate(0 22 21)"/><rect x="20.6" y="3" width="2.8" height="6" rx="1.4" fill="url(#dg-gold)" transform="rotate(36 22 21)"/><rect x="20.6" y="3" width="2.8" height="6" rx="1.4" fill="url(#dg-gold)" transform="rotate(72 22 21)"/><rect x="20.6" y="3" width="2.8" height="6" rx="1.4" fill="url(#dg-gold)" transform="rotate(108 22 21)"/><rect x="20.6" y="3" width="2.8" height="6" rx="1.4" fill="url(#dg-gold)" transform="rotate(144 22 21)"/><rect x="20.6" y="3" width="2.8" height="6" rx="1.4" fill="url(#dg-gold)" transform="rotate(180 22 21)"/><rect x="20.6" y="3" width="2.8" height="6" rx="1.4" fill="url(#dg-gold)" transform="rotate(216 22 21)"/><rect x="20.6" y="3" width="2.8" height="6" rx="1.4" fill="url(#dg-gold)" transform="rotate(252 22 21)"/><rect x="20.6" y="3" width="2.8" height="6" rx="1.4" fill="url(#dg-gold)" transform="rotate(288 22 21)"/><rect x="20.6" y="3" width="2.8" height="6" rx="1.4" fill="url(#dg-gold)" transform="rotate(324 22 21)"/>
          </g>
          <circle cx="22" cy="21" r="10.5" fill="url(#dg-gold)"/>
          <path d="M15.4 16.2a8 8 0 0 1 5-3.8" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="1.8" stroke-linecap="round"/>
          <g class="di-pop"><path d="M24 40.5h16.5a5.5 5.5 0 0 0 .6-11a7.5 7.5 0 0 0-14.2-1.6A6.4 6.4 0 0 0 24 40.5z" fill="url(#dg-white)"/><path d="M28.6 29.6a5.6 5.6 0 0 1 4.6-2.4" fill="none" stroke="#fff" stroke-opacity="0.9" stroke-width="1.2" stroke-linecap="round"/></g>
        }
        @case ('moon') {
          <ellipse cx="24" cy="42.5" rx="13" ry="2.6" fill="url(#dg-shadow)"/>
          <path d="M28.6 7.4a15.5 15.5 0 1 0 11 24.4A13 13 0 0 1 28.6 7.4z" fill="url(#dg-gold)"/>
          <path d="M13.6 18.4a12.5 12.5 0 0 1 7-8.4" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="18.6" cy="27" r="2" fill="#B97C33" fill-opacity=".5"/><circle cx="24" cy="33.4" r="1.3" fill="#B97C33" fill-opacity=".45"/>
          <g class="di-twinkle"><path d="M38 9l1.2 2.8 2.8 1.2-2.8 1.2L38 17l-1.2-2.8-2.8-1.2 2.8-1.2z" fill="#F7CF8A"/><path d="M43 21l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill="#F7CF8A"/></g>
        }
        @case ('bell') {
          <ellipse cx="24" cy="42.5" rx="13" ry="2.6" fill="url(#dg-shadow)"/>
          <g class="di-ring" style="transform-origin: 24px 8px">
          <path d="M24 6.6c-1.4 0-2.4 1-2.4 2.3v.9C15.8 11 13 15.8 13 21.4v6.4l-3 4.4v1.8h28v-1.8l-3-4.4v-6.4c0-5.6-2.8-10.4-8.6-11.6v-.9c0-1.3-1-2.3-2.4-2.3z" fill="url(#dg-gold)"/>
          <rect x="9.4" y="32.4" width="29.2" height="3.4" rx="1.7" fill="url(#dg-gold-dk)"/>
          <circle cx="24" cy="38.6" r="3.2" fill="url(#dg-gold-dk)"/>
          <path d="M16.4 26V20.6a8 8 0 0 1 3.6-6.6" fill="none" stroke="#fff" stroke-opacity="0.75" stroke-width="1.6" stroke-linecap="round"/>
          </g>
          <g class="di-accent"><circle cx="34.6" cy="11.6" r="5" fill="#fff"/><circle cx="34.6" cy="11.6" r="3.8" fill="url(#dg-red)"/></g>
        }
        @case ('chat') {
          <ellipse cx="24" cy="42.5" rx="16" ry="3.2" fill="url(#dg-shadow)"/>
          <path d="M12 8h17a7 7 0 0 1 7 7v5a7 7 0 0 1-7 7h-9l-6 5v-5.2A7 7 0 0 1 5 20v-5a7 7 0 0 1 7-7z" fill="url(#dg-teal)"/>
          <path d="M8.4 13.2a4.6 4.6 0 0 1 3.6-2.6" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="1.3" stroke-linecap="round"/>
          <g class="di-pop"><path d="M22 19h15a6.5 6.5 0 0 1 6.5 6.5v5a6.5 6.5 0 0 1-6.5 6.5h-.4v5l-6-5H22a6.5 6.5 0 0 1-6.5-6.5v-5A6.5 6.5 0 0 1 22 19z" fill="url(#dg-white)"/></g>
          <g class="di-dots"><circle cx="23.6" cy="28" r="1.8" fill="#0E4850"/><circle cx="29.4" cy="28" r="1.8" fill="#0E4850"/><circle cx="35.2" cy="28" r="1.8" fill="url(#dg-gold)"/></g>
        }
        @case ('wallet') {
          <ellipse cx="24" cy="42.5" rx="17" ry="3.4" fill="url(#dg-shadow)"/>
          <g class="di-hop">
          <g class="di-accent"><rect x="11" y="9" width="23" height="12" rx="1.6" transform="rotate(-8 22 15)" fill="url(#dg-green)"/><circle cx="22" cy="15" r="2.6" fill="#fff" fill-opacity=".45" transform="rotate(-8 22 15)"/>
          <rect x="14" y="11.4" width="22" height="11" rx="1.6" transform="rotate(5 25 17)" fill="#9CCAA8"/></g>
          <rect x="6" y="18" width="34" height="22" rx="4.4" fill="url(#dg-teal)"/>
          <rect x="6" y="18" width="34" height="5" rx="2.5" fill="#000" fill-opacity=".14"/>
          <path d="M29 25.4h12.6v9.4H29a4.7 4.7 0 0 1 0-9.4z" fill="url(#dg-teal-dk)"/>
          <circle cx="30.2" cy="30.1" r="2.3" fill="url(#dg-gold)"/>
          <path d="M8.6 24v13" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.1" stroke-linecap="round"/>
          </g>
        }
        @case ('logbook') {
          <ellipse cx="24" cy="42.5" rx="15" ry="3.0" fill="url(#dg-shadow)"/>
          <rect x="12.4" y="8.6" width="26" height="32" rx="3" fill="#D9E1DE"/>
          <path d="M36.4 10.6v28" stroke="#fff" stroke-width="1"/><path d="M34.6 10.6v28" stroke="#fff" stroke-width=".8" stroke-opacity=".8"/>
          <rect x="9" y="7" width="26" height="32" rx="3" fill="url(#dg-teal)"/>
          <rect x="9" y="7" width="4.6" height="32" rx="2" fill="#000" fill-opacity=".18"/>
          <rect x="17" y="13" width="13.4" height="8.4" rx="1.6" fill="#fff" fill-opacity=".92"/>
          <path d="M19.4 16h8.6M19.4 18.6h5.6" stroke="#8FB3B6" stroke-width="1.1" stroke-linecap="round"/>
          <g class="di-accent"><path d="M26 37.6v8.2l2.4-2 2.4 2v-8.2z" fill="url(#dg-gold)"/></g>
          <path d="M14.6 9.4v27.4" fill="none" stroke="#fff" stroke-opacity="0.4" stroke-width="1.1" stroke-linecap="round"/>
        }
        @case ('gear') {
          <ellipse cx="24" cy="42.5" rx="15" ry="3.0" fill="url(#dg-shadow)"/>
          <g class="di-spin-gear" style="transform-origin: 24px 23px">
          <polygon points="40.00,24.80 39.76,27.58 35.84,29.11 34.91,31.10 36.26,35.08 34.28,37.06 30.30,35.71 28.31,36.64 26.78,40.56 24.00,40.80 21.81,37.21 19.69,36.64 16.00,38.66 13.72,37.06 14.35,32.90 13.09,31.10 8.96,30.27 8.24,27.58 11.40,24.80 11.59,22.61 8.96,19.33 10.14,16.80 14.35,16.70 15.90,15.15 16.00,10.94 18.53,9.76 21.81,12.39 24.00,12.20 26.78,9.04 29.47,9.76 30.30,13.89 32.10,15.15 36.26,14.52 37.86,16.80 35.84,20.49 36.41,22.61" fill="#7D8E8C"/>
          <polygon points="40.00,23.00 39.76,25.78 35.84,27.31 34.91,29.30 36.26,33.28 34.28,35.26 30.30,33.91 28.31,34.84 26.78,38.76 24.00,39.00 21.81,35.41 19.69,34.84 16.00,36.86 13.72,35.26 14.35,31.10 13.09,29.30 8.96,28.47 8.24,25.78 11.40,23.00 11.59,20.81 8.96,17.53 10.14,15.00 14.35,14.90 15.90,13.35 16.00,9.14 18.53,7.96 21.81,10.59 24.00,10.40 26.78,7.24 29.47,7.96 30.30,12.09 32.10,13.35 36.26,12.72 37.86,15.00 35.84,18.69 36.41,20.81" fill="url(#dg-steel)"/>
          <circle cx="24" cy="23" r="9" fill="#C9D3D1"/>
          <circle cx="24" cy="23" r="5" fill="url(#dg-teal)"/>
          <path d="M15 17.4a11 11 0 0 1 5.4-5" fill="none" stroke="#fff" stroke-opacity="0.8" stroke-width="1.5" stroke-linecap="round"/>
          </g>
          <g class="di-accent"><circle cx="24" cy="23" r="1.8" fill="url(#dg-gold)"/></g>
        }
        @case ('pool') {
          <ellipse cx="24" cy="42.5" rx="19" ry="3.8" fill="url(#dg-shadow)"/>
          <polygon points="4.6,25.6 24,15.8 43.4,25.6 24,35.4" fill="url(#dg-white)"/>
          <polygon points="4.6,25.6 24,35.4 24,39.6 4.6,29.8" fill="url(#dg-white-dk)"/>
          <polygon points="24,35.4 43.4,25.6 43.4,29.8 24,39.6" fill="#C9D3D1"/>
          <polygon points="9,25.6 24,18 39,25.6 24,33.2" fill="url(#dg-glass)"/>
          <path class="di-wave" d="M14 25.4c2-1 4 1 6 0s4 1 6 0M21 29c2-1 4 1 6 0" stroke="#fff" stroke-opacity=".8" stroke-width="1.1" fill="none" stroke-linecap="round"/>
          <path d="M33.6 15v6.6M37.2 16.8v6.6M33.6 18h3.6M33.6 20.6h3.6" stroke="url(#dg-steel)" stroke-width="1.5" stroke-linecap="round"/>
          <g class="di-bob"><ellipse cx="18" cy="24.6" rx="5.2" ry="2.6" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M13 24.4a5.2 2.6 0 0 1 3.6-2.4M19.6 27.1a5.2 2.6 0 0 0 3.6-2.4" fill="none" stroke="#D9573F" stroke-width="2.6"/></g>
        }
        @case ('car') {
          <ellipse cx="24" cy="42.5" rx="19" ry="3.8" fill="url(#dg-shadow)"/>
          <g class="di-hop">
          <path d="M5.4 31.6c0-3.8 2.4-5.6 5.6-6.2l5.6-1 5-5.6c1-1.2 2.4-1.8 3.8-1.8h7.4c1.8 0 3.2.8 4.2 2.2l3.8 5.2c4.2.8 5.6 3 5.6 6.2v3.2a2.2 2.2 0 0 1-2.2 2.2H7.6a2.2 2.2 0 0 1-2.2-2.2z" fill="url(#dg-roof)"/>
          <path d="M18.6 24.4l4-4.4c.6-.6 1.4-1 2.2-1h3.8v5.4zM31.2 19h2.2c1 0 1.8.4 2.4 1.2l3 4.2h-7.6z" fill="url(#dg-glass)"/>
          <path d="M6 30.6h37" stroke="#7A3316" stroke-opacity=".3" stroke-width="1"/>
          <path d="M20 18.4l3.4-3.6" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="1.2" stroke-linecap="round"/>
          <circle cx="14.4" cy="36" r="4.4" fill="#2C2622"/><circle cx="14.4" cy="36" r="2" fill="url(#dg-steel)"/>
          <circle cx="35" cy="36" r="4.4" fill="#2C2622"/><circle cx="35" cy="36" r="2" fill="url(#dg-steel)"/>
          <g class="di-accent"><rect x="40.6" y="27.4" width="2.8" height="2.2" rx=".8" fill="url(#dg-gold)"/></g>
          </g>
        }
        @case ('linens') {
          <ellipse cx="24" cy="42.5" rx="17" ry="3.4" fill="url(#dg-shadow)"/>
          <rect x="7" y="30" width="34" height="9.4" rx="4.2" fill="url(#dg-teal)"/>
          <path d="M7 34.4h34" stroke="#000" stroke-opacity=".14" stroke-width="1"/>
          <rect x="9" y="21.4" width="31" height="9.4" rx="4.2" fill="url(#dg-white)"/>
          <path d="M9 25.6h31" stroke="#9FB2B0" stroke-opacity=".5" stroke-width="1"/>
          <g class="di-pop"><rect x="8" y="12.4" width="31.4" height="9.6" rx="4.4" fill="url(#dg-sand)"/>
          <path d="M12 15.6h8" stroke="#fff" stroke-opacity=".6" stroke-width="1.3" stroke-linecap="round"/>
          <rect x="32" y="12.4" width="3" height="9.6" fill="url(#dg-gold)"/></g>
          <path d="M11 32.6h10" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="1.2" stroke-linecap="round"/>
        }
        @case ('amenities') {
          <ellipse cx="24" cy="42.5" rx="17" ry="3.4" fill="url(#dg-shadow)"/>
          <rect x="22.6" y="6" width="4.2" height="6" rx="1" fill="url(#dg-steel)"/>
          <path d="M26.8 7.4h5.6v2.6h-5.6z" fill="url(#dg-steel)"/>
          <rect x="19.6" y="11.4" width="10.2" height="4" rx="1.2" fill="url(#dg-teal-dk)"/>
          <path d="M17 19a4 4 0 0 1 4-4h7.4a4 4 0 0 1 4 4v18.4a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3z" fill="url(#dg-teal)"/>
          <rect x="19.6" y="23" width="10.2" height="9" rx="1.6" fill="#fff" fill-opacity=".9"/>
          <path d="M21.8 26.4h5.8M21.8 29h3.8" stroke="#8FB3B6" stroke-width="1.1" stroke-linecap="round"/>
          <path d="M19.4 20v15" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.3" stroke-linecap="round"/>
          <rect x="30.6" y="32.4" width="12.4" height="7.6" rx="3.2" fill="url(#dg-sand-lt)"/>
          <path d="M33.4 35h5" stroke="#fff" stroke-opacity=".8" stroke-width="1.2" stroke-linecap="round"/>
          <g class="di-bubbles"><circle cx="36" cy="27.6" r="2.4" fill="#fff" stroke="#BFD6D8" stroke-width=".8"/><circle cx="40.6" cy="24" r="1.5" fill="#fff" stroke="#BFD6D8" stroke-width=".7"/></g>
        }
        @case ('kitchen') {
          <ellipse cx="24" cy="42.5" rx="17" ry="3.4" fill="url(#dg-shadow)"/>
          <ellipse cx="23" cy="37.6" rx="16" ry="3.6" fill="url(#dg-white-dk)"/>
          <ellipse cx="23" cy="36.6" rx="14" ry="2.8" fill="url(#dg-white)"/>
          <path d="M11 19h22v9.4a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8z" fill="url(#dg-roof)"/>
          <path d="M33 21.4h2.4a4.6 4.6 0 0 1 0 9.2H32" fill="none" stroke="url(#dg-roof-dk)" stroke-width="2.6"/>
          <ellipse cx="22" cy="19" rx="11" ry="2.4" fill="#5A3A22"/>
          <ellipse cx="22" cy="18.8" rx="8.6" ry="1.5" fill="#7A5232"/>
          <path d="M13.4 22v6a6 6 0 0 0 2.6 5" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1.3" stroke-linecap="round"/>
          <g class="di-mist"><path d="M17.6 13.6c-1.6-2 1.6-3.4 0-5.6M23 13.4c-1.6-2 1.6-3.4 0-5.6M28.4 13.6c-1.6-2 1.6-3.4 0-5.6" fill="none" stroke="#B9C9C7" stroke-width="1.6" stroke-linecap="round"/></g>
        }
        @case ('key') {
          <ellipse cx="24" cy="42.5" rx="15" ry="3.0" fill="url(#dg-shadow)"/>
          <g class="di-swing" style="transform-origin: 17px 12px">
          <circle cx="17" cy="16" r="9.4" fill="url(#dg-gold)"/>
          <circle cx="17" cy="16" r="3.8" fill="#fff"/>
          <circle cx="17" cy="16" r="3.8" fill="none" stroke="url(#dg-gold-dk)" stroke-width="1"/>
          <path d="M23.4 22.4l14.4 14.4-2.8 2.8-2.4-2.4-2.6 2.6-2.2-2.2 2.6-2.6-3.2-3.2-2.6 2.6-2.2-2.2 2.6-2.6-3.4-3.4z" fill="url(#dg-gold)"/>
          <path d="M23.4 22.4l14.4 14.4" stroke="url(#dg-gold-dk)" stroke-width="1.2"/>
          <path d="M10.6 13.4a7 7 0 0 1 4-4.4" fill="none" stroke="#fff" stroke-opacity="0.75" stroke-width="1.5" stroke-linecap="round"/>
          </g>
          <g class="di-accent"><path d="M30 8.4h9.6a2 2 0 0 1 2 2v6.6a2 2 0 0 1-2 2H30l-4-5.3z" fill="url(#dg-teal)"/><circle cx="29.6" cy="13.7" r="1.3" fill="#fff"/><path d="M33 12.4h5.4M33 15h3.6" stroke="#fff" stroke-opacity=".7" stroke-width="1" stroke-linecap="round"/></g>
        }
        @case ('hvac') {
          <ellipse cx="24" cy="42.5" rx="17" ry="3.4" fill="url(#dg-shadow)"/>
          <rect x="5" y="9" width="38" height="17" rx="4.6" fill="url(#dg-white)"/>
          <rect x="5" y="21" width="38" height="5" rx="2.5" fill="url(#dg-white-dk)"/>
          <path d="M9 23.4h30" stroke="#8FA3A1" stroke-width="1" stroke-linecap="round"/>
          <circle cx="37.4" cy="14" r="1.4" fill="url(#dg-green)"/>
          <path d="M8.6 12.6h14" fill="none" stroke="#fff" stroke-opacity="0.9" stroke-width="1.4" stroke-linecap="round"/>
          <g class="di-wave"><path d="M12 31c2.4-1.6 4.8 1.6 7.2 0M17 36c2.4-1.6 4.8 1.6 7.2 0M24 31c2.4-1.6 4.8 1.6 7.2 0M29 36c2.4-1.6 4.8 1.6 7.2 0" fill="none" stroke="#7CC3D6" stroke-width="2" stroke-linecap="round"/></g>
        }
        @case ('water') {
          <ellipse cx="24" cy="42.5" rx="13" ry="2.6" fill="url(#dg-shadow)"/>
          <ellipse cx="24" cy="39" rx="12" ry="2.6" fill="none" stroke="#7CC3D6" stroke-width="1.4" stroke-opacity=".7"/>
          <g class="di-bob"><path d="M24 5.6C19 13 13.4 19.6 13.4 26.4a10.6 10.6 0 0 0 21.2 0C34.6 19.6 29 13 24 5.6z" fill="url(#dg-glass)"/>
          <path d="M24 5.6C19 13 13.4 19.6 13.4 26.4a10.6 10.6 0 0 0 21.2 0C34.6 19.6 29 13 24 5.6z" fill="none" stroke="#2C7F95" stroke-opacity=".35" stroke-width="1"/>
          <path d="M18 25.4a6.4 6.4 0 0 1 2.6-5.6" fill="none" stroke="#fff" stroke-opacity="0.9" stroke-width="2" stroke-linecap="round"/></g>
        }
        @case ('electrical') {
          <ellipse cx="24" cy="42.5" rx="11" ry="2.2" fill="url(#dg-shadow)"/>
          <g class="di-twinkle"><path d="M24 3.4v3.4M10.4 9.4l2.4 2.4M37.6 9.4l-2.4 2.4M6 21h3.4M42 21h-3.4" stroke="url(#dg-gold)" stroke-width="2" stroke-linecap="round"/></g>
          <path d="M24 9a11.6 11.6 0 0 0-6.8 21c1.4 1 2 2.4 2 3.8h9.6c0-1.4.6-2.8 2-3.8A11.6 11.6 0 0 0 24 9z" fill="url(#dg-gold)"/>
          <path d="M21.4 33.8v-6l2.6-3.6 2.6 3.6v6" fill="none" stroke="#B97C33" stroke-width="1.2" stroke-opacity=".7"/>
          <path d="M16.6 18.6a8 8 0 0 1 4.6-5.2" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="1.8" stroke-linecap="round"/>
          <rect x="19" y="33.6" width="10" height="3.4" rx="1" fill="url(#dg-steel)"/>
          <rect x="19.6" y="37" width="8.8" height="3" rx="1" fill="url(#dg-steel)"/>
        }
        @case ('elevator') {
          <ellipse cx="24" cy="42.5" rx="17" ry="3.4" fill="url(#dg-shadow)"/>
          <rect x="7" y="6" width="34" height="35" rx="3" fill="url(#dg-teal)"/>
          <rect x="10.4" y="13" width="27.2" height="28" rx="1" fill="#0B3A42"/>
          <g class="di-pop"><rect x="11.2" y="13.8" width="12.4" height="27.2" fill="url(#dg-steel)"/><rect x="24.4" y="13.8" width="12.4" height="27.2" fill="url(#dg-steel)"/></g>
          <path d="M24 13.8v27.2" stroke="#5C6E6C" stroke-width=".8"/>
          <g class="di-accent"><rect x="19.4" y="7.6" width="9.2" height="4" rx="1.4" fill="#0B3A42"/><path d="M21.6 10.6l1.2-1.6 1.2 1.6M25.2 9l1.2 1.6 1.2-1.6" fill="none" stroke="url(#dg-gold)" stroke-width="1" stroke-linecap="round"/></g>
          <path d="M13 16v22" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="1.2" stroke-linecap="round"/>
        }
        @case ('camera') {
          <ellipse cx="24" cy="42.5" rx="15" ry="3.0" fill="url(#dg-shadow)"/>
          <rect x="35" y="10" width="7" height="14" rx="2" fill="url(#dg-white-dk)"/>
          <path d="M36 17h-6" stroke="url(#dg-steel)" stroke-width="3" stroke-linecap="round"/>
          <g class="di-rock" style="transform-origin: 34px 17px">
          <path d="M7 14.6l22-4.4a3 3 0 0 1 3.6 2.4l1.4 7.4a3 3 0 0 1-2.4 3.6l-22 4.4z" fill="url(#dg-white)"/>
          <path d="M9 27.8l22-4.4" stroke="#AFC0BE" stroke-width="1"/>
          <ellipse cx="8.4" cy="21.2" rx="3.4" ry="6.6" transform="rotate(-11 8.4 21.2)" fill="url(#dg-teal-dk)"/>
          <ellipse cx="8.2" cy="21.2" rx="1.8" ry="3.6" transform="rotate(-11 8.2 21.2)" fill="url(#dg-glass)"/>
          <path d="M14 15.6l12-2.4" fill="none" stroke="#fff" stroke-opacity="0.9" stroke-width="1.3" stroke-linecap="round"/>
          </g>
          <g class="di-twinkle"><circle cx="27.4" cy="16" r="1.6" fill="url(#dg-red)"/></g>
        }
        @case ('paint') {
          <ellipse cx="24" cy="42.5" rx="16" ry="3.2" fill="url(#dg-shadow)"/>
          <path d="M7 38.4c6-3.4 14-3.4 20 0" fill="none" stroke="url(#dg-roof)" stroke-width="5" stroke-linecap="round" stroke-opacity=".85"/>
          <g class="di-swing" style="transform-origin: 30px 36px">
          <path d="M38.4 13.4h2.4v8H28v4" fill="none" stroke="url(#dg-steel)" stroke-width="2.2" stroke-linejoin="round"/>
          <rect x="25.4" y="24.6" width="5.2" height="13" rx="2.4" fill="url(#dg-wood)"/>
          <rect x="9" y="8" width="30" height="11" rx="5.5" fill="url(#dg-roof)"/>
          <rect x="9" y="14.4" width="30" height="4.6" rx="2.3" fill="#000" fill-opacity=".12"/>
          <path d="M13 11.4h17" fill="none" stroke="#fff" stroke-opacity="0.65" stroke-width="1.5" stroke-linecap="round"/>
          </g>
        }
        @case ('appliance') {
          <ellipse cx="24" cy="42.5" rx="15" ry="3.0" fill="url(#dg-shadow)"/>
          <rect x="9" y="5.6" width="30" height="35" rx="4" fill="url(#dg-white)"/>
          <rect x="9" y="5.6" width="30" height="7.6" rx="4" fill="url(#dg-white-dk)"/>
          <circle cx="15" cy="9.4" r="1.6" fill="url(#dg-gold)"/><rect x="25" y="8.2" width="10" height="2.4" rx="1.2" fill="#0B3A42" fill-opacity=".7"/>
          <circle cx="24" cy="27" r="10" fill="#C9D3D1"/>
          <circle cx="24" cy="27" r="7.8" fill="url(#dg-glass)"/>
          <g class="di-spin-gear" style="transform-origin: 24px 27px"><path d="M18.4 28.6c2.6 2 8.6 2 11.2-1.4" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.6" stroke-linecap="round"/></g>
          <path d="M12 15.6v21" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="1.2" stroke-linecap="round"/>
        }
        @case ('plumbing') {
          <ellipse cx="24" cy="42.5" rx="17" ry="3.4" fill="url(#dg-shadow)"/>
          <rect x="5" y="25" width="38" height="8" rx="2" fill="url(#dg-teal)"/>
          <rect x="5" y="25" width="38" height="3" rx="1.5" fill="#fff" fill-opacity=".22"/>
          <rect x="16" y="23" width="5" height="12" rx="1.2" fill="url(#dg-teal-dk)"/>
          <rect x="29" y="23" width="5" height="12" rx="1.2" fill="url(#dg-teal-dk)"/>
          <g class="di-swing" style="transform-origin: 30px 22px">
          <path d="M34.6 5.4a7 7 0 0 0-8.4 9.2L13.6 27.2a2.6 2.6 0 0 0 3.6 3.6l12.6-12.6a7 7 0 0 0 9.2-8.4l-4 4-3.6-1-1-3.6z" fill="url(#dg-steel)"/>
          <path d="M15.8 27.6l11.6-11.6" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="1.2" stroke-linecap="round"/>
          </g>
          <g class="di-bob"><path d="M10 36.4c-1.2 1.8-2 3-2 4a2 2 0 0 0 4 0c0-1-.8-2.2-2-4z" fill="#7CC3D6"/></g>
        }
        @case ('furniture') {
          <ellipse cx="24" cy="42.5" rx="19" ry="3.8" fill="url(#dg-shadow)"/>
          <rect x="9" y="12" width="30" height="16" rx="5" fill="url(#dg-sand-dk)"/>
          <rect x="5" y="20" width="8" height="15" rx="4" fill="url(#dg-sand)"/>
          <rect x="35" y="20" width="8" height="15" rx="4" fill="url(#dg-sand)"/>
          <rect x="11" y="24" width="26" height="9" rx="3" fill="url(#dg-sand-lt)"/>
          <g class="di-pop"><rect x="13" y="15" width="9.6" height="9" rx="3" fill="url(#dg-teal)"/><rect x="25.4" y="15" width="9.6" height="9" rx="3" fill="url(#dg-gold)"/></g>
          <rect x="9" y="35" width="2.6" height="4" rx="1" fill="url(#dg-wood)"/><rect x="36.4" y="35" width="2.6" height="4" rx="1" fill="url(#dg-wood)"/>
          <path d="M12.6 14.6h10" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="1.3" stroke-linecap="round"/>
        }
      }
    </svg>
  `,
  // Estilos globales en dim-icon.css (importado desde styles.css).
})
export class DimIconComponent {
  readonly name = input.required<DimIconName>();
  readonly size = input<number>(48);
  /** false en listas largas o pines: sin entrada ni gestos. */
  readonly animate = input<boolean>(true);
}
