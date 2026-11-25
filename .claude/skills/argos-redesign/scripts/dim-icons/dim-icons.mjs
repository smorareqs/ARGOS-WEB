// Íconos con volumen de ARGOS (fuente para generar app-dim-icon y el tablero).
// Lienzo 48×48. Luz arriba a la izquierda. Los colores salen de los degradados
// globales #dg-* (index.html). Clases di-*: piezas que se animan.

const G = (n) => `url(#dg-${n})`;
const f = (n) => `fill="${G(n)}"`;
const pts = (a) => a.map((p) => p.join(',')).join(' ');

/** Prisma isométrico: base centrada en (cx, cy), medio ancho w, alto h. */
function prism(cx, cy, w, h, top, left, right, cls = '') {
  const t = [[cx - w, cy - h], [cx, cy - h - w / 2], [cx + w, cy - h], [cx, cy - h + w / 2]];
  const l = [[cx - w, cy - h], [cx, cy - h + w / 2], [cx, cy + w / 2], [cx - w, cy]];
  const r = [[cx, cy - h + w / 2], [cx + w, cy - h], [cx + w, cy], [cx, cy + w / 2]];
  return `<g class="${cls}"><polygon points="${pts(l)}" ${f(left)}/><polygon points="${pts(r)}" ${f(right)}/><polygon points="${pts(t)}" ${f(top)}/></g>`;
}

const shadow = (rx = 16, cy = 42.5) => `<ellipse cx="24" cy="${cy}" rx="${rx}" ry="${(rx / 5).toFixed(1)}" fill="url(#dg-shadow)"/>`;
const shine = (d, o = 0.55, w = 1.1) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;

import { MORE } from './more-icons.mjs';
import { ITEMS } from './item-icons.mjs';
import { ASSETS } from './asset-icons.mjs';

export const DEFS = `
<linearGradient id="dg-sand" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#FCF0DD"/><stop offset="1" stop-color="#E7CA9D"/></linearGradient>
<linearGradient id="dg-sand-dk" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#E0BE8B"/><stop offset="1" stop-color="#C1955C"/></linearGradient>
<linearGradient id="dg-sand-lt" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#FFF9EF"/><stop offset="1" stop-color="#F1DFC2"/></linearGradient>
<linearGradient id="dg-roof" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#E3865A"/><stop offset="1" stop-color="#AE512A"/></linearGradient>
<linearGradient id="dg-roof-dk" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#A84F2A"/><stop offset="1" stop-color="#7A3316"/></linearGradient>
<linearGradient id="dg-teal" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#4A8A8F"/><stop offset="1" stop-color="#0E4850"/></linearGradient>
<linearGradient id="dg-teal-dk" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#1A5058"/><stop offset="1" stop-color="#00262C"/></linearGradient>
<linearGradient id="dg-white" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E3E9E6"/></linearGradient>
<linearGradient id="dg-white-dk" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#D9E1DE"/><stop offset="1" stop-color="#AFBDB9"/></linearGradient>
<linearGradient id="dg-mint" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#F2F9F6"/><stop offset="1" stop-color="#C3DCD4"/></linearGradient>
<linearGradient id="dg-glass" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#DDEFF2"/><stop offset="1" stop-color="#86B3BC"/></linearGradient>
<linearGradient id="dg-gold" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#F7CF8A"/><stop offset="1" stop-color="#C5873C"/></linearGradient>
<linearGradient id="dg-gold-dk" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#B97C33"/><stop offset="1" stop-color="#8A561B"/></linearGradient>
<linearGradient id="dg-red" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#DC7466"/><stop offset="1" stop-color="#9A3227"/></linearGradient>
<linearGradient id="dg-red-dk" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#8E2F25"/><stop offset="1" stop-color="#641B14"/></linearGradient>
<linearGradient id="dg-orange" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#F4A465"/><stop offset="1" stop-color="#C9561F"/></linearGradient>
<linearGradient id="dg-orange-dk" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#B34A17"/><stop offset="1" stop-color="#7E300B"/></linearGradient>
<linearGradient id="dg-green" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#8FC4A0"/><stop offset="1" stop-color="#4A7C5C"/></linearGradient>
<linearGradient id="dg-green-dk" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#3F6C50"/><stop offset="1" stop-color="#284A35"/></linearGradient>
<linearGradient id="dg-leaf" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#A7CDB0"/><stop offset="1" stop-color="#4F8360"/></linearGradient>
<linearGradient id="dg-steel" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#F1F4F3"/><stop offset="1" stop-color="#93A3A1"/></linearGradient>
<linearGradient id="dg-wood" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#CF9C66"/><stop offset="1" stop-color="#875A31"/></linearGradient>
<radialGradient id="dg-shadow"><stop offset="0" stop-color="#003841" stop-opacity=".3"/><stop offset="1" stop-color="#003841" stop-opacity="0"/></radialGradient>`;

export const ICONS = {
  /* ── Tipos de propiedad ───────────────────────────── */
  house: `${shadow(18)}
    <polygon points="29,23.5 41,19.2 41,37 29,40.6" ${f('sand-dk')}/>
    <polygon points="7.5,23.5 18.2,14 29,23.5 29,40.6 7.5,40.6" ${f('sand')}/>
    <polygon points="18.2,13.2 30.4,8.8 43.2,18.9 30.6,24" ${f('roof')}/>
    <path d="M6 24.6 18.2 13.6 30.8 24.4" fill="none" stroke="url(#dg-roof-dk)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14.4 40.6v-7.6a3.8 3.8 0 0 1 7.6 0v7.6z" ${f('teal')}/>
    <circle cx="18.2" cy="23.6" r="2.3" class="di-win" ${f('glass')}/>
    <polygon points="32,27 37.6,25.1 37.6,30.6 32,32.5" class="di-win" ${f('glass')}/>
    <polygon points="7.5,39 29,39 29,40.6 7.5,40.6" fill="#003841" fill-opacity=".12"/>
    <polygon points="29,39 41,35.4 41,37 29,40.6" fill="#003841" fill-opacity=".16"/>
    ${shine('M8.4 25v13.4')}
    <g class="di-pop"><circle cx="6.4" cy="38.2" r="3.4" ${f('leaf')}/><circle cx="9.6" cy="39.3" r="2.5" ${f('green')}/></g>`,

  apartment: `${shadow(14)}
    <polygon points="27,10.5 36,7.4 36,38.4 27,41.5" ${f('white-dk')}/>
    <polygon points="12,10.5 27,10.5 27,41.5 12,41.5" ${f('white')}/>
    <polygon points="12,10.5 21,7.4 36,7.4 27,10.5" fill="#F7FAF8"/>
    ${[14, 19.3, 24.6, 29.9].map((y, r) => [14.2, 18.6, 23].map((x, c) => `<rect x="${x}" y="${y}" width="2.8" height="3.1" rx=".6" class="di-win" style="--d:${(r * 3 + c) * 60}ms" ${f('glass')}/>`).join('')).join('')}
    ${[14, 19.3, 24.6, 29.9].map((y) => `<polygon points="29,${y + 0.4} 33.6,${y - 1.2} 33.6,${y + 2} 29,${y + 3.6}" ${f('glass')} opacity=".85"/>`).join('')}
    <rect x="16.8" y="35.6" width="5.4" height="5.9" rx="1" ${f('teal')}/>
    <rect x="16" y="34.8" width="7" height="1.4" rx=".6" ${f('roof')}/>
    ${shine('M12.9 12v28.5')}
    <g class="di-pop">${prism(27.6, 8.2, 2.6, 3, 'gold', 'gold', 'gold-dk')}</g>`,

  room: `${shadow(19)}
    <rect x="9" y="11.5" width="30" height="15" rx="3.4" ${f('wood')}/>
    ${shine('M11.5 13.6h25', 0.45)}
    <polygon points="11,22 37,22 41.6,32.6 6.4,32.6" ${f('white')}/>
    <g class="di-pop"><rect x="13" y="18.6" width="9.6" height="5.6" rx="2.7" ${f('mint')}/><rect x="25.4" y="18.6" width="9.6" height="5.6" rx="2.7" ${f('mint')}/></g>
    <polygon points="8.6,27.2 39.4,27.2 41.6,32.6 6.4,32.6" ${f('teal')}/>
    <rect x="6.4" y="32.6" width="35.2" height="5.4" rx="1.6" ${f('teal-dk')}/>
    ${shine('M9.4 27.4h29.2', 0.5)}
    <rect x="9" y="38" width="2.6" height="3.4" rx=".8" ${f('wood')}/><rect x="36.4" y="38" width="2.6" height="3.4" rx=".8" ${f('wood')}/>
    <g class="di-accent"><polygon points="27,24.4 34,24.4 35.6,28.4 28.2,28.4" ${f('gold')}/><path d="M28.4 26.4h6.2" stroke="#fff" stroke-opacity=".6" stroke-width=".9"/></g>`,

  building: `${shadow(18)}
    <polygon points="31,15 41.5,11.2 41.5,37.6 31,41.4" ${f('sand-dk')}/>
    <polygon points="6.5,15 31,15 31,41.4 6.5,41.4" ${f('sand')}/>
    <polygon points="6.5,15 17,11.2 41.5,11.2 31,15" ${f('sand-lt')}/>
    ${[18, 23.4, 28.8].map((y, r) => [9, 14.2, 19.4, 24.6].map((x, c) => `<rect x="${x}" y="${y}" width="3.6" height="3.4" rx=".6" class="di-win" style="--d:${(r * 4 + c) * 50}ms" ${f('glass')}/><rect x="${x - 0.5}" y="${y + 3.4}" width="4.6" height=".9" fill="#003841" fill-opacity=".18"/>`).join('')).join('')}
    ${[18, 23.4, 28.8].map((y) => `<polygon points="33,${y + 0.2} 39.5,${y - 2.1} 39.5,${y + 1.3} 33,${y + 3.6}" ${f('glass')} opacity=".85"/>`).join('')}
    <rect x="14" y="35" width="10" height="6.4" rx="1" ${f('teal')}/>
    <path d="M12.4 35.4h13.2l-1.4-2.4H13.8z" ${f('roof')}/>
    ${shine('M7.4 16.4v24')}
    <g class="di-pop"><circle cx="12" cy="11.6" r="2.4" ${f('leaf')}/><circle cx="15.4" cy="12.2" r="1.8" ${f('green')}/><circle cx="35.6" cy="11" r="2" ${f('leaf')}/></g>`,

  other: `${shadow(14)}
    <g class="di-swing" style="transform-origin: 15px 17px">
      <path d="M15 8.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17zM15 13.2a3.8 3.8 0 1 0 0 7.6a3.8 3.8 0 1 0 0-7.6z" fill-rule="evenodd" ${f('gold')}/>
      ${shine('M9.6 12.6a7 7 0 0 1 4-2.6', 0.7, 1.4)}
      <path d="M22.6 15.2h17.6a1.6 1.6 0 0 1 1.6 1.6v1.4a1.6 1.6 0 0 1-1.6 1.6H22.6z" ${f('gold')}/>
      <path d="M34 19.8h3v4.6h-3zM38.6 19.8h2.6v3.4h-2.6z" ${f('gold-dk')}/>
    </g>
    <path d="M12 24.2 9.6 28.4" stroke="#8A6A45" stroke-width="1.1"/>
    <g class="di-accent"><rect x="3.6" y="27.4" width="11" height="13.6" rx="2.2" transform="rotate(-12 9 34)" ${f('sand')}/><circle cx="8.4" cy="29.6" r="1.1" fill="#8A6A45"/><path d="M6.4 34.4l5.6-1.2M6.9 36.8l4.4-.9" stroke="#C1955C" stroke-width="1.2" stroke-linecap="round"/></g>`,

  /* ── Operación ───────────────────────────────────── */
  cleaning: `${shadow(18)}
    <path d="M8.6 24.4h18.8l-2.2 15.4a2 2 0 0 1-2 1.7h-10.4a2 2 0 0 1-2-1.7z" ${f('teal')}/>
    <ellipse cx="18" cy="24.4" rx="9.4" ry="2.7" ${f('teal-dk')}/>
    <ellipse cx="18" cy="24.6" rx="7.8" ry="1.8" fill="#BFE0E3"/>
    <path d="M9.4 24.8C9.4 15 26.6 15 26.6 24.8" fill="none" stroke="url(#dg-steel)" stroke-width="1.6"/>
    ${shine('M10.6 27.4l1.6 11.4', 0.45)}
    <g class="di-bubbles"><circle cx="15" cy="21.6" r="2" fill="#fff"/><circle cx="19.4" cy="20.6" r="2.6" fill="#fff"/><circle cx="22.6" cy="22.2" r="1.6" fill="#fff"/></g>
    <rect x="29" y="22" width="11.4" height="19.6" rx="3.2" ${f('white')}/>
    <rect x="29" y="30.6" width="11.4" height="11" rx="3.2" fill="#7FB6BC" fill-opacity=".55"/>
    <rect x="30.8" y="25.6" width="7.8" height="6.4" rx="1.2" ${f('mint')}/>
    <rect x="31.6" y="16.8" width="6.2" height="5.6" rx="1" ${f('white-dk')}/>
    <g class="di-accent"><path d="M30.4 11.6h9.4l1.8 3.6-4.4 1.6h-6.8z" ${f('gold')}/><path d="M37.6 16.6l1.4 3.6" stroke="url(#dg-gold-dk)" stroke-width="1.8" stroke-linecap="round"/></g>
    <g class="di-mist"><circle cx="44.2" cy="12.4" r="1.1" fill="#9CCAD0"/><circle cx="45.4" cy="15.6" r=".8" fill="#9CCAD0"/><circle cx="43" cy="9.4" r=".7" fill="#9CCAD0"/></g>
    ${shine('M30.2 24v15', 0.6)}`,

  clock: `${shadow(15)}
    <path d="M15.6 36.4 12.6 41M32.4 36.4l3 4.6" stroke="url(#dg-teal-dk)" stroke-width="2.8" stroke-linecap="round"/>
    <g class="di-ring">
      <path d="M8.4 14.2a6.4 6.4 0 0 1 10.2-4.4z" ${f('gold')}/>
      <path d="M39.6 14.2a6.4 6.4 0 0 0-10.2-4.4z" ${f('gold')}/>
      <circle cx="24" cy="25.6" r="14" ${f('teal')}/>
      <circle cx="24" cy="25.6" r="10.8" ${f('white')}/>
      ${[0, 90, 180, 270].map((a) => `<rect x="23.3" y="16.2" width="1.4" height="2.4" rx=".7" fill="#003841" fill-opacity=".45" transform="rotate(${a} 24 25.6)"/>`).join('')}
      <path class="di-hand-h" d="M24 25.6V19.4" stroke="#003841" stroke-width="2.2" stroke-linecap="round"/>
      <path class="di-hand-m" d="M24 25.6l5.4 3" stroke="#003841" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="24" cy="25.6" r="1.6" ${f('gold')}/>
      ${shine('M13.2 20.4a11.6 11.6 0 0 1 6.2-6.4', 0.55, 1.6)}
      <rect x="22.4" y="9.4" width="3.2" height="3" rx="1" ${f('gold-dk')}/>
    </g>`,

  incident: `${shadow(18)}
    <g class="di-swing" style="transform-origin: 32px 22px"><g transform="translate(1.6 6) scale(.82)">
      <rect x="30.4" y="3.6" width="4.2" height="19" rx="1.6" transform="rotate(28 32.5 13)" ${f('steel')}/>
      <path d="M33.8 1.2a5 5 0 1 1-2 9.6zM35.6 1.4l-1.2 4.4 3.8 1.4 1.6-3.6z" fill-rule="evenodd" ${f('steel')}/>
    </g></g>
    <path d="M17 22.6v-4.4a2.2 2.2 0 0 1 2.2-2.2h9.6a2.2 2.2 0 0 1 2.2 2.2v4.4" fill="none" stroke="url(#dg-red-dk)" stroke-width="2.8"/>
    <rect x="7.4" y="21.4" width="33.2" height="19.4" rx="2.6" ${f('red')}/>
    <rect x="7.4" y="21.4" width="33.2" height="5.8" rx="2.6" ${f('red-dk')}/>
    <rect x="7.4" y="26" width="33.2" height="1.4" fill="#000" fill-opacity=".12"/>
    <g class="di-accent"><rect x="21" y="24.6" width="6" height="5" rx="1.2" ${f('gold')}/></g>
    ${shine('M9.6 29.4h28.8', 0.35)}`,

  arrivals: `${shadow(16)}
    <g class="di-hop">
      <path d="M19 15.6v-3.4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3.4" fill="none" stroke="#3D2A1E" stroke-width="2.4"/>
      <polygon points="34,17 39.6,14.6 39.6,36.4 34,38.8" ${f('roof-dk')}/>
      <polygon points="10,17 15.6,14.6 39.6,14.6 34,17" fill="#EE9B72"/>
      <rect x="10" y="17" width="24" height="21.8" rx="2.4" ${f('roof')}/>
      <rect x="14.2" y="17" width="2.6" height="21.8" fill="#7A3316" fill-opacity=".35"/>
      <rect x="27.2" y="17" width="2.6" height="21.8" fill="#7A3316" fill-opacity=".35"/>
      ${shine('M11.4 19v17.6', 0.5)}
      <circle cx="14" cy="40.6" r="1.7" fill="#2C2622"/><circle cx="31" cy="40.6" r="1.7" fill="#2C2622"/>
      <g class="di-accent"><path d="M28 13.8l4.4 8.4" stroke="#8A6A45" stroke-width="1"/><rect x="29.6" y="20.6" width="7" height="9.4" rx="1.6" transform="rotate(-18 33 25.3)" ${f('gold')}/><circle cx="32.2" cy="22.6" r=".9" fill="#8A561B"/></g>
    </g>`,

  warning: `${shadow(17)}
    <path d="M6.8 36.6h34.4l1.4 4H5.4z" ${f('orange-dk')}/>
    <path d="M9.4 34.8h29.2l2.6 1.8H6.8z" ${f('orange')}/>
    <g class="di-wobble">
      <path d="M22.4 7.4h3.2c.6 0 1 .4 1.2 1l7 26.4H14.2l7-26.4c.2-.6.6-1 1.2-1z" ${f('orange')}/>
      <polygon points="20.5,17 27.5,17 28.7,21.4 19.3,21.4" fill="#fff"/>
      <polygon points="17.8,27 30.2,27 31.4,31.4 16.6,31.4" fill="#fff"/>
      <path d="M24 7.4h1.6c.6 0 1 .4 1.2 1l7 26.4H24z" fill="#7E300B" fill-opacity=".18"/>
      ${shine('M21.4 10.6l-5 20', 0.6, 1.2)}
    </g>`,

  balance: `${shadow(15)}
    <path d="M15.4 36.4h17.2l2 4.4H13.4z" ${f('teal')}/>
    <rect x="22.8" y="12" width="2.4" height="24.6" rx="1" ${f('gold')}/>
    <g class="di-rock">
      <path d="M9.4 16.4 38.6 11.2" stroke="url(#dg-gold-dk)" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M9.4 16.4 5.8 26.4M9.4 16.4l3.6 10M38.6 11.2l-3.6 10M38.6 11.2l3.6 10" stroke="#8A6A45" stroke-width=".9"/>
      <path d="M3.4 26.4h12a6 3.2 0 0 1-12 0z" ${f('gold')}/>
      ${prism(9.4, 25.8, 3.6, 4.4, 'sand-lt', 'sand', 'sand-dk')}
      <path d="M32.6 21.2h12a6 3.2 0 0 1-12 0z" ${f('gold')}/>
      <g class="di-accent"><ellipse cx="38.6" cy="20.4" rx="2.6" ry="1.3" ${f('gold-dk')}/></g>
    </g>
    <circle cx="24" cy="12" r="2.2" ${f('gold')}/>`,

  box: `${shadow(18)}
    <g class="di-hop">
      ${prism(24, 34, 16, 14, 'sand-lt', 'sand', 'sand-dk')}
      <polygon points="15,15.5 18,14 34,22 31,23.5" fill="#EAD2A6"/>
      <polygon points="31,23.5 34,22 34,28.6 31,30.1" fill="#C89F68"/>
      <g class="di-accent"><polygon points="12,29.4 19,32.9 19,37.9 12,34.4" fill="#fff" fill-opacity=".9"/><path d="M13.4 31.6l4.2 2.1M13.4 33.6l3 1.5" stroke="#C1955C" stroke-width=".8"/></g>
      ${shine('M8.6 21v12.6', 0.5)}
    </g>`,

  team: `${shadow(13)}
    <path d="M16.4 2 24 13.4 31.6 2" fill="none" stroke="url(#dg-teal)" stroke-width="3.4" stroke-linejoin="round"/>
    <g class="di-swing" style="transform-origin: 24px 13px">
      <rect x="21.6" y="12" width="4.8" height="5" rx="1.2" ${f('steel')}/>
      <rect x="12.8" y="17.4" width="24.4" height="25" rx="3.6" fill="#AFBDB9"/>
      <rect x="11.6" y="16" width="24.4" height="25" rx="3.6" ${f('white')}/>
      <rect x="15.4" y="19.8" width="16.8" height="12.6" rx="2.2" ${f('mint')}/>
      <circle cx="23.8" cy="24.6" r="3.2" ${f('teal')}/>
      <path d="M17.8 32.4c0-3.6 2.7-5.2 6-5.2s6 1.6 6 5.2z" ${f('teal')}/>
      <rect x="15.4" y="34.8" width="16.8" height="1.9" rx=".9" fill="#D3DCD9"/>
      <g class="di-accent"><rect x="18.6" y="38" width="10.4" height="1.8" rx=".9" ${f('gold')}/></g>
      ${shine('M12.8 19.4v19', 0.7)}
    </g>`,

  chart: `${shadow(19)}
    ${prism(24, 37, 18, 2.4, 'white', 'white-dk', 'white-dk')}
    <g class="di-bar" style="--d:0ms">${prism(13, 34.6, 4.2, 8, 'mint', 'teal', 'teal-dk')}</g>
    <g class="di-bar" style="--d:90ms">${prism(24, 34.6, 4.2, 14, 'mint', 'teal', 'teal-dk')}</g>
    <g class="di-bar di-accent" style="--d:180ms">${prism(35, 34.6, 4.2, 21, 'gold', 'gold', 'gold-dk')}</g>`,

  calendar: `${shadow(16)}
    <rect x="10.6" y="13.6" width="28.6" height="28" rx="3.4" fill="#B9C6C2"/>
    <rect x="9.4" y="12" width="28.6" height="28" rx="3.4" ${f('white')}/>
    <path d="M9.4 15.4a3.4 3.4 0 0 1 3.4-3.4h21.8a3.4 3.4 0 0 1 3.4 3.4V20H9.4z" ${f('roof')}/>
    <rect x="15.2" y="8.4" width="3" height="7" rx="1.5" ${f('steel')}/><rect x="29.2" y="8.4" width="3" height="7" rx="1.5" ${f('steel')}/>
    ${[23.4, 28.6, 33.8].map((y, r) => [13.2, 19, 24.8, 30.6].map((x, c) => (r === 1 && c === 2 ? '' : `<rect x="${x}" y="${y}" width="3.6" height="3.2" rx=".8" fill="#D6DEDB"/>`)).join('')).join('')}
    <g class="di-accent"><rect x="24.2" y="28" width="4.8" height="4.4" rx="1.1" ${f('gold')}/></g>
    ${shine('M10.6 21.6v16.6', 0.7)}`,

  done: `${shadow(14)}
    <g class="di-flip">
      <circle cx="24" cy="25.6" r="14.6" ${f('green-dk')}/>
      <circle cx="24" cy="23.8" r="14.6" ${f('green')}/>
      <circle cx="24" cy="23.8" r="11" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>
      <path d="M17.8 24.2l4.4 4.4 8-9" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      ${shine('M13.4 18.4a12 12 0 0 1 6-6', 0.6, 1.6)}
    </g>`,

  lock: `${shadow(14)}
    <path class="di-shackle" d="M16.6 22v-6.2a7.4 7.4 0 0 1 14.8 0V22" fill="none" stroke="url(#dg-steel)" stroke-width="3.8" stroke-linecap="round"/>
    <rect x="11" y="22.4" width="26" height="19" rx="4" ${f('gold-dk')}/>
    <rect x="11" y="20.4" width="26" height="19" rx="4" ${f('gold')}/>
    <circle cx="24" cy="28.4" r="2.6" fill="#5A3A12"/><path d="M22.8 29.6h2.4l.6 4.8h-3.6z" fill="#5A3A12"/>
    ${shine('M13.4 23v13', 0.6, 1.3)}`,

  blocked: `${shadow(12)}
    <rect x="22.6" y="33" width="2.8" height="9" rx="1" ${f('steel')}/>
    <g class="di-wobble" style="transform-origin: 24px 40px">
      <polygon points="18.4,10.6 29.6,10.6 37.4,18.4 37.4,29.6 29.6,37.4 18.4,37.4 10.6,29.6 10.6,18.4" ${f('red-dk')} transform="translate(0 1.6)"/>
      <polygon points="18.4,10.6 29.6,10.6 37.4,18.4 37.4,29.6 29.6,37.4 18.4,37.4 10.6,29.6 10.6,18.4" ${f('red')}/>
      <polygon points="19.3,12.8 28.7,12.8 35.2,19.3 35.2,28.7 28.7,35.2 19.3,35.2 12.8,28.7 12.8,19.3" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.2"/>
      <rect x="16" y="21.6" width="16" height="4.8" rx="1.4" fill="#fff"/>
      ${shine('M14.2 17l4.6-4.6', 0.6, 1.4)}
    </g>`,
  search: `${shadow(14)}
    <g class="di-swing" style="transform-origin: 20px 20px">
      <rect x="30.5" y="25.5" width="6.4" height="16" rx="2.8" transform="rotate(-45 33.7 33.5)" ${f('teal')}/>
      <rect x="27.6" y="26.6" width="5" height="4.6" rx="1" transform="rotate(-45 30.1 28.9)" ${f('teal-dk')}/>
      <circle cx="20" cy="20" r="13" ${f('steel')}/>
      <circle cx="20" cy="20" r="10" ${f('glass')}/>
      ${shine('M13.4 16a8 8 0 0 1 5-4.8', 0.9, 2)}
      <g class="di-accent"><circle cx="24.6" cy="24.2" r="1.7" fill="#fff" fill-opacity=".75"/></g>
    </g>`,
  ...MORE,
  ...ITEMS,
  ...ASSETS,
};

/** IconName del panel (app-icon) → ícono con volumen. */
export const FROM_LINE = {
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
  ban: 'blocked',
};
