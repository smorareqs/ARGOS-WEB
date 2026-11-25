// Íconos de artículos de inventario (tercera tanda): blancos, amenidades, cocina y llaves.
const G = (n) => `url(#dg-${n})`;
const f = (n) => `fill="${G(n)}"`;
const shadow = (rx = 16, cy = 42.5) => `<ellipse cx="24" cy="${cy}" rx="${rx}" ry="${(rx / 5).toFixed(1)}" fill="url(#dg-shadow)"/>`;
const shine = (d, o = 0.55, w = 1.1) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;

export const ITEMS = {
  // Pila de toallas dobladas: teal abajo, blanca en medio, arena arriba; la de arriba se asoma al pasar el cursor.
  linens: `${shadow(17)}
    <rect x="7" y="30" width="34" height="9.4" rx="4.2" ${f('teal')}/>
    <path d="M7 34.4h34" stroke="#000" stroke-opacity=".14" stroke-width="1"/>
    <rect x="9" y="21.4" width="31" height="9.4" rx="4.2" ${f('white')}/>
    <path d="M9 25.6h31" stroke="#9FB2B0" stroke-opacity=".5" stroke-width="1"/>
    <g class="di-pop"><rect x="8" y="12.4" width="31.4" height="9.6" rx="4.4" ${f('sand')}/>
      <path d="M12 15.6h8" stroke="#fff" stroke-opacity=".6" stroke-width="1.3" stroke-linecap="round"/>
      <rect x="32" y="12.4" width="3" height="9.6" ${f('gold')}/></g>
    ${shine('M11 32.6h10', 0.45, 1.2)}`,

  // Botella con dispensador y una barra de jabón; burbujas al pasar el cursor.
  amenities: `${shadow(17)}
    <rect x="22.6" y="6" width="4.2" height="6" rx="1" ${f('steel')}/>
    <path d="M26.8 7.4h5.6v2.6h-5.6z" ${f('steel')}/>
    <rect x="19.6" y="11.4" width="10.2" height="4" rx="1.2" ${f('teal-dk')}/>
    <path d="M17 19a4 4 0 0 1 4-4h7.4a4 4 0 0 1 4 4v18.4a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3z" ${f('teal')}/>
    <rect x="19.6" y="23" width="10.2" height="9" rx="1.6" fill="#fff" fill-opacity=".9"/>
    <path d="M21.8 26.4h5.8M21.8 29h3.8" stroke="#8FB3B6" stroke-width="1.1" stroke-linecap="round"/>
    ${shine('M19.4 20v15', 0.5, 1.3)}
    <rect x="30.6" y="32.4" width="12.4" height="7.6" rx="3.2" ${f('sand-lt')}/>
    <path d="M33.4 35h5" stroke="#fff" stroke-opacity=".8" stroke-width="1.2" stroke-linecap="round"/>
    <g class="di-bubbles"><circle cx="36" cy="27.6" r="2.4" fill="#fff" stroke="#BFD6D8" stroke-width=".8"/><circle cx="40.6" cy="24" r="1.5" fill="#fff" stroke="#BFD6D8" stroke-width=".7"/></g>`,

  // Taza de café humeante sobre su plato; el vapor sube al pasar el cursor.
  kitchen: `${shadow(17)}
    <ellipse cx="23" cy="37.6" rx="16" ry="3.6" ${f('white-dk')}/>
    <ellipse cx="23" cy="36.6" rx="14" ry="2.8" ${f('white')}/>
    <path d="M11 19h22v9.4a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8z" ${f('roof')}/>
    <path d="M33 21.4h2.4a4.6 4.6 0 0 1 0 9.2H32" fill="none" stroke="url(#dg-roof-dk)" stroke-width="2.6"/>
    <ellipse cx="22" cy="19" rx="11" ry="2.4" fill="#5A3A22"/>
    <ellipse cx="22" cy="18.8" rx="8.6" ry="1.5" fill="#7A5232"/>
    ${shine('M13.4 22v6a6 6 0 0 0 2.6 5', 0.55, 1.3)}
    <g class="di-mist"><path d="M17.6 13.6c-1.6-2 1.6-3.4 0-5.6M23 13.4c-1.6-2 1.6-3.4 0-5.6M28.4 13.6c-1.6-2 1.6-3.4 0-5.6" fill="none" stroke="#B9C9C7" stroke-width="1.6" stroke-linecap="round"/></g>`,

  // Llave dorada con su etiqueta teal; se mece al pasar el cursor.
  key: `${shadow(15)}
    <g class="di-swing" style="transform-origin: 17px 12px">
      <circle cx="17" cy="16" r="9.4" ${f('gold')}/>
      <circle cx="17" cy="16" r="3.8" fill="#fff"/>
      <circle cx="17" cy="16" r="3.8" fill="none" stroke="url(#dg-gold-dk)" stroke-width="1"/>
      <path d="M23.4 22.4l14.4 14.4-2.8 2.8-2.4-2.4-2.6 2.6-2.2-2.2 2.6-2.6-3.2-3.2-2.6 2.6-2.2-2.2 2.6-2.6-3.4-3.4z" ${f('gold')}/>
      <path d="M23.4 22.4l14.4 14.4" stroke="url(#dg-gold-dk)" stroke-width="1.2"/>
      ${shine('M10.6 13.4a7 7 0 0 1 4-4.4', 0.75, 1.5)}
    </g>
    <g class="di-accent"><path d="M30 8.4h9.6a2 2 0 0 1 2 2v6.6a2 2 0 0 1-2 2H30l-4-5.3z" ${f('teal')}/><circle cx="29.6" cy="13.7" r="1.3" fill="#fff"/><path d="M33 12.4h5.4M33 15h3.6" stroke="#fff" stroke-opacity=".7" stroke-width="1" stroke-linecap="round"/></g>`,
};
