// Íconos de activos de mantenimiento (cuarta tanda): A/C, agua, electricidad, elevador, cámara,
// pintura, electrodoméstico, plomería y mobiliario. Mismo estilo: luz arriba a la izquierda,
// sombra de contacto y un detalle que se mueve al pasar el cursor.
const G = (n) => `url(#dg-${n})`;
const f = (n) => `fill="${G(n)}"`;
const shadow = (rx = 16, cy = 42.5) => `<ellipse cx="24" cy="${cy}" rx="${rx}" ry="${(rx / 5).toFixed(1)}" fill="url(#dg-shadow)"/>`;
const shine = (d, o = 0.55, w = 1.1) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;

export const ASSETS = {
  // Minisplit en la pared con aire fresco saliendo.
  hvac: `${shadow(17)}
    <rect x="5" y="9" width="38" height="17" rx="4.6" ${f('white')}/>
    <rect x="5" y="21" width="38" height="5" rx="2.5" ${f('white-dk')}/>
    <path d="M9 23.4h30" stroke="#8FA3A1" stroke-width="1" stroke-linecap="round"/>
    <circle cx="37.4" cy="14" r="1.4" ${f('green')}/>
    ${shine('M8.6 12.6h14', 0.9, 1.4)}
    <g class="di-wave"><path d="M12 31c2.4-1.6 4.8 1.6 7.2 0M17 36c2.4-1.6 4.8 1.6 7.2 0M24 31c2.4-1.6 4.8 1.6 7.2 0M29 36c2.4-1.6 4.8 1.6 7.2 0" fill="none" stroke="#7CC3D6" stroke-width="2" stroke-linecap="round"/></g>`,

  // Gota de agua grande con su onda.
  water: `${shadow(13)}
    <ellipse cx="24" cy="39" rx="12" ry="2.6" fill="none" stroke="#7CC3D6" stroke-width="1.4" stroke-opacity=".7"/>
    <g class="di-bob"><path d="M24 5.6C19 13 13.4 19.6 13.4 26.4a10.6 10.6 0 0 0 21.2 0C34.6 19.6 29 13 24 5.6z" ${f('glass')}/>
      <path d="M24 5.6C19 13 13.4 19.6 13.4 26.4a10.6 10.6 0 0 0 21.2 0C34.6 19.6 29 13 24 5.6z" fill="none" stroke="#2C7F95" stroke-opacity=".35" stroke-width="1"/>
      ${shine('M18 25.4a6.4 6.4 0 0 1 2.6-5.6', 0.9, 2)}</g>`,

  // Foco encendido con rayos.
  electrical: `${shadow(11)}
    <g class="di-twinkle"><path d="M24 3.4v3.4M10.4 9.4l2.4 2.4M37.6 9.4l-2.4 2.4M6 21h3.4M42 21h-3.4" stroke="url(#dg-gold)" stroke-width="2" stroke-linecap="round"/></g>
    <path d="M24 9a11.6 11.6 0 0 0-6.8 21c1.4 1 2 2.4 2 3.8h9.6c0-1.4.6-2.8 2-3.8A11.6 11.6 0 0 0 24 9z" ${f('gold')}/>
    <path d="M21.4 33.8v-6l2.6-3.6 2.6 3.6v6" fill="none" stroke="#B97C33" stroke-width="1.2" stroke-opacity=".7"/>
    ${shine('M16.6 18.6a8 8 0 0 1 4.6-5.2', 0.85, 1.8)}
    <rect x="19" y="33.6" width="10" height="3.4" rx="1" ${f('steel')}/>
    <rect x="19.6" y="37" width="8.8" height="3" rx="1" ${f('steel')}/>`,

  // Puertas de elevador con su tablero de flechas.
  elevator: `${shadow(17)}
    <rect x="7" y="6" width="34" height="35" rx="3" ${f('teal')}/>
    <rect x="10.4" y="13" width="27.2" height="28" rx="1" fill="#0B3A42"/>
    <g class="di-pop"><rect x="11.2" y="13.8" width="12.4" height="27.2" ${f('steel')}/><rect x="24.4" y="13.8" width="12.4" height="27.2" ${f('steel')}/></g>
    <path d="M24 13.8v27.2" stroke="#5C6E6C" stroke-width=".8"/>
    <g class="di-accent"><rect x="19.4" y="7.6" width="9.2" height="4" rx="1.4" fill="#0B3A42"/><path d="M21.6 10.6l1.2-1.6 1.2 1.6M25.2 9l1.2 1.6 1.2-1.6" fill="none" stroke="url(#dg-gold)" stroke-width="1" stroke-linecap="round"/></g>
    ${shine('M13 16v22', 0.5, 1.2)}`,

  // Cámara de seguridad en su brazo, con la luz de grabación.
  camera: `${shadow(15)}
    <rect x="35" y="10" width="7" height="14" rx="2" ${f('white-dk')}/>
    <path d="M36 17h-6" stroke="url(#dg-steel)" stroke-width="3" stroke-linecap="round"/>
    <g class="di-rock" style="transform-origin: 34px 17px">
      <path d="M7 14.6l22-4.4a3 3 0 0 1 3.6 2.4l1.4 7.4a3 3 0 0 1-2.4 3.6l-22 4.4z" ${f('white')}/>
      <path d="M9 27.8l22-4.4" stroke="#AFC0BE" stroke-width="1"/>
      <ellipse cx="8.4" cy="21.2" rx="3.4" ry="6.6" transform="rotate(-11 8.4 21.2)" ${f('teal-dk')}/>
      <ellipse cx="8.2" cy="21.2" rx="1.8" ry="3.6" transform="rotate(-11 8.2 21.2)" ${f('glass')}/>
      ${shine('M14 15.6l12-2.4', 0.9, 1.3)}
    </g>
    <g class="di-twinkle"><circle cx="27.4" cy="16" r="1.6" ${f('red')}/></g>`,

  // Rodillo de pintura con su trazo.
  paint: `${shadow(16)}
    <path d="M7 38.4c6-3.4 14-3.4 20 0" fill="none" stroke="url(#dg-roof)" stroke-width="5" stroke-linecap="round" stroke-opacity=".85"/>
    <g class="di-swing" style="transform-origin: 30px 36px">
      <path d="M38.4 13.4h2.4v8H28v4" fill="none" stroke="url(#dg-steel)" stroke-width="2.2" stroke-linejoin="round"/>
      <rect x="25.4" y="24.6" width="5.2" height="13" rx="2.4" ${f('wood')}/>
      <rect x="9" y="8" width="30" height="11" rx="5.5" ${f('roof')}/>
      <rect x="9" y="14.4" width="30" height="4.6" rx="2.3" fill="#000" fill-opacity=".12"/>
      ${shine('M13 11.4h17', 0.65, 1.5)}
    </g>`,

  // Lavadora con su tambor que gira.
  appliance: `${shadow(15)}
    <rect x="9" y="5.6" width="30" height="35" rx="4" ${f('white')}/>
    <rect x="9" y="5.6" width="30" height="7.6" rx="4" ${f('white-dk')}/>
    <circle cx="15" cy="9.4" r="1.6" ${f('gold')}/><rect x="25" y="8.2" width="10" height="2.4" rx="1.2" fill="#0B3A42" fill-opacity=".7"/>
    <circle cx="24" cy="27" r="10" fill="#C9D3D1"/>
    <circle cx="24" cy="27" r="7.8" ${f('glass')}/>
    <g class="di-spin-gear" style="transform-origin: 24px 27px"><path d="M18.4 28.6c2.6 2 8.6 2 11.2-1.4" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.6" stroke-linecap="round"/></g>
    ${shine('M12 15.6v21', 0.7, 1.2)}`,

  // Llave de paso y llave inglesa sobre un tubo.
  plumbing: `${shadow(17)}
    <rect x="5" y="25" width="38" height="8" rx="2" ${f('teal')}/>
    <rect x="5" y="25" width="38" height="3" rx="1.5" fill="#fff" fill-opacity=".22"/>
    <rect x="16" y="23" width="5" height="12" rx="1.2" ${f('teal-dk')}/>
    <rect x="29" y="23" width="5" height="12" rx="1.2" ${f('teal-dk')}/>
    <g class="di-swing" style="transform-origin: 30px 22px">
      <path d="M34.6 5.4a7 7 0 0 0-8.4 9.2L13.6 27.2a2.6 2.6 0 0 0 3.6 3.6l12.6-12.6a7 7 0 0 0 9.2-8.4l-4 4-3.6-1-1-3.6z" ${f('steel')}/>
      ${shine('M15.8 27.6l11.6-11.6', 0.7, 1.2)}
    </g>
    <g class="di-bob"><path d="M10 36.4c-1.2 1.8-2 3-2 4a2 2 0 0 0 4 0c0-1-.8-2.2-2-4z" fill="#7CC3D6"/></g>`,

  // Sofá con cojines.
  furniture: `${shadow(19)}
    <rect x="9" y="12" width="30" height="16" rx="5" ${f('sand-dk')}/>
    <rect x="5" y="20" width="8" height="15" rx="4" ${f('sand')}/>
    <rect x="35" y="20" width="8" height="15" rx="4" ${f('sand')}/>
    <rect x="11" y="24" width="26" height="9" rx="3" ${f('sand-lt')}/>
    <g class="di-pop"><rect x="13" y="15" width="9.6" height="9" rx="3" ${f('teal')}/><rect x="25.4" y="15" width="9.6" height="9" rx="3" ${f('gold')}/></g>
    <rect x="9" y="35" width="2.6" height="4" rx="1" ${f('wood')}/><rect x="36.4" y="35" width="2.6" height="4" rx="1" ${f('wood')}/>
    ${shine('M12.6 14.6h10', 0.55, 1.3)}`,
};
