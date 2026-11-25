// Íconos de navegación (segunda tanda): sol, luna, campana, chat, cartera, bitácora, engrane, piscina, carro.
const G = (n) => `url(#dg-${n})`;
const f = (n) => `fill="${G(n)}"`;
const shadow = (rx = 16, cy = 42.5) => `<ellipse cx="24" cy="${cy}" rx="${rx}" ry="${(rx / 5).toFixed(1)}" fill="url(#dg-shadow)"/>`;
const shine = (d, o = 0.55, w = 1.1) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;

function gear() {
  const teeth = 9;
  const ring = (cx, cy) => {
    const pts = [];
    for (let i = 0; i < teeth * 4; i++) {
      const a = (i / (teeth * 4)) * Math.PI * 2;
      const r = i % 4 === 0 || i % 4 === 1 ? 16 : 12.6;
      pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
    }
    return pts.join(' ');
  };
  return `${shadow(15)}
    <g class="di-spin-gear" style="transform-origin: 24px 23px">
      <polygon points="${ring(24, 24.8)}" fill="#7D8E8C"/>
      <polygon points="${ring(24, 23)}" ${f('steel')}/>
      <circle cx="24" cy="23" r="9" fill="#C9D3D1"/>
      <circle cx="24" cy="23" r="5" ${f('teal')}/>
      ${shine('M15 17.4a11 11 0 0 1 5.4-5', 0.8, 1.5)}
    </g>
    <g class="di-accent"><circle cx="24" cy="23" r="1.8" ${f('gold')}/></g>`;
}

export const MORE = {
  sun: `${shadow(13)}
    <g class="di-spin-slow" style="transform-origin: 22px 21px">
      ${Array.from({ length: 10 }, (_, i) => `<rect x="20.6" y="3" width="2.8" height="6" rx="1.4" ${f('gold')} transform="rotate(${i * 36} 22 21)"/>`).join('')}
    </g>
    <circle cx="22" cy="21" r="10.5" ${f('gold')}/>
    ${shine('M15.4 16.2a8 8 0 0 1 5-3.8', 0.8, 1.8)}
    <g class="di-pop"><path d="M24 40.5h16.5a5.5 5.5 0 0 0 .6-11a7.5 7.5 0 0 0-14.2-1.6A6.4 6.4 0 0 0 24 40.5z" ${f('white')}/>${shine('M28.6 29.6a5.6 5.6 0 0 1 4.6-2.4', 0.9, 1.2)}</g>`,

  moon: `${shadow(13)}
    <path d="M28.6 7.4a15.5 15.5 0 1 0 11 24.4A13 13 0 0 1 28.6 7.4z" ${f('gold')}/>
    ${shine('M13.6 18.4a12.5 12.5 0 0 1 7-8.4', 0.7, 1.6)}
    <circle cx="18.6" cy="27" r="2" fill="#B97C33" fill-opacity=".5"/><circle cx="24" cy="33.4" r="1.3" fill="#B97C33" fill-opacity=".45"/>
    <g class="di-twinkle"><path d="M38 9l1.2 2.8 2.8 1.2-2.8 1.2L38 17l-1.2-2.8-2.8-1.2 2.8-1.2z" fill="#F7CF8A"/><path d="M43 21l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill="#F7CF8A"/></g>`,

  bell: `${shadow(13)}
    <g class="di-ring" style="transform-origin: 24px 8px">
      <path d="M24 6.6c-1.4 0-2.4 1-2.4 2.3v.9C15.8 11 13 15.8 13 21.4v6.4l-3 4.4v1.8h28v-1.8l-3-4.4v-6.4c0-5.6-2.8-10.4-8.6-11.6v-.9c0-1.3-1-2.3-2.4-2.3z" ${f('gold')}/>
      <rect x="9.4" y="32.4" width="29.2" height="3.4" rx="1.7" ${f('gold-dk')}/>
      <circle cx="24" cy="38.6" r="3.2" ${f('gold-dk')}/>
      ${shine('M16.4 26V20.6a8 8 0 0 1 3.6-6.6', 0.75, 1.6)}
    </g>
    <g class="di-accent"><circle cx="34.6" cy="11.6" r="5" fill="#fff"/><circle cx="34.6" cy="11.6" r="3.8" ${f('red')}/></g>`,

  chat: `${shadow(16)}
    <path d="M12 8h17a7 7 0 0 1 7 7v5a7 7 0 0 1-7 7h-9l-6 5v-5.2A7 7 0 0 1 5 20v-5a7 7 0 0 1 7-7z" ${f('teal')}/>
    ${shine('M8.4 13.2a4.6 4.6 0 0 1 3.6-2.6', 0.6, 1.3)}
    <g class="di-pop"><path d="M22 19h15a6.5 6.5 0 0 1 6.5 6.5v5a6.5 6.5 0 0 1-6.5 6.5h-.4v5l-6-5H22a6.5 6.5 0 0 1-6.5-6.5v-5A6.5 6.5 0 0 1 22 19z" ${f('white')}/></g>
    <g class="di-dots"><circle cx="23.6" cy="28" r="1.8" fill="#0E4850"/><circle cx="29.4" cy="28" r="1.8" fill="#0E4850"/><circle cx="35.2" cy="28" r="1.8" ${f('gold')}/></g>`,

  wallet: `${shadow(17)}
    <g class="di-hop">
      <g class="di-accent"><rect x="11" y="9" width="23" height="12" rx="1.6" transform="rotate(-8 22 15)" ${f('green')}/><circle cx="22" cy="15" r="2.6" fill="#fff" fill-opacity=".45" transform="rotate(-8 22 15)"/>
      <rect x="14" y="11.4" width="22" height="11" rx="1.6" transform="rotate(5 25 17)" fill="#9CCAA8"/></g>
      <rect x="6" y="18" width="34" height="22" rx="4.4" ${f('teal')}/>
      <rect x="6" y="18" width="34" height="5" rx="2.5" fill="#000" fill-opacity=".14"/>
      <path d="M29 25.4h12.6v9.4H29a4.7 4.7 0 0 1 0-9.4z" ${f('teal-dk')}/>
      <circle cx="30.2" cy="30.1" r="2.3" ${f('gold')}/>
      ${shine('M8.6 24v13', 0.5)}
    </g>`,

  logbook: `${shadow(15)}
    <rect x="12.4" y="8.6" width="26" height="32" rx="3" fill="#D9E1DE"/>
    <path d="M36.4 10.6v28" stroke="#fff" stroke-width="1"/><path d="M34.6 10.6v28" stroke="#fff" stroke-width=".8" stroke-opacity=".8"/>
    <rect x="9" y="7" width="26" height="32" rx="3" ${f('teal')}/>
    <rect x="9" y="7" width="4.6" height="32" rx="2" fill="#000" fill-opacity=".18"/>
    <rect x="17" y="13" width="13.4" height="8.4" rx="1.6" fill="#fff" fill-opacity=".92"/>
    <path d="M19.4 16h8.6M19.4 18.6h5.6" stroke="#8FB3B6" stroke-width="1.1" stroke-linecap="round"/>
    <g class="di-accent"><path d="M26 37.6v8.2l2.4-2 2.4 2v-8.2z" ${f('gold')}/></g>
    ${shine('M14.6 9.4v27.4', 0.4)}`,

  gear: gear(),

  pool: `${shadow(19)}
    <polygon points="4.6,25.6 24,15.8 43.4,25.6 24,35.4" ${f('white')}/>
    <polygon points="4.6,25.6 24,35.4 24,39.6 4.6,29.8" ${f('white-dk')}/>
    <polygon points="24,35.4 43.4,25.6 43.4,29.8 24,39.6" fill="#C9D3D1"/>
    <polygon points="9,25.6 24,18 39,25.6 24,33.2" ${f('glass')}/>
    <path class="di-wave" d="M14 25.4c2-1 4 1 6 0s4 1 6 0M21 29c2-1 4 1 6 0" stroke="#fff" stroke-opacity=".8" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <path d="M33.6 15v6.6M37.2 16.8v6.6M33.6 18h3.6M33.6 20.6h3.6" stroke="url(#dg-steel)" stroke-width="1.5" stroke-linecap="round"/>
    <g class="di-bob"><ellipse cx="18" cy="24.6" rx="5.2" ry="2.6" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M13 24.4a5.2 2.6 0 0 1 3.6-2.4M19.6 27.1a5.2 2.6 0 0 0 3.6-2.4" fill="none" stroke="#D9573F" stroke-width="2.6"/></g>`,

  car: `${shadow(19)}
    <g class="di-hop">
      <path d="M5.4 31.6c0-3.8 2.4-5.6 5.6-6.2l5.6-1 5-5.6c1-1.2 2.4-1.8 3.8-1.8h7.4c1.8 0 3.2.8 4.2 2.2l3.8 5.2c4.2.8 5.6 3 5.6 6.2v3.2a2.2 2.2 0 0 1-2.2 2.2H7.6a2.2 2.2 0 0 1-2.2-2.2z" ${f('roof')}/>
      <path d="M18.6 24.4l4-4.4c.6-.6 1.4-1 2.2-1h3.8v5.4zM31.2 19h2.2c1 0 1.8.4 2.4 1.2l3 4.2h-7.6z" ${f('glass')}/>
      <path d="M6 30.6h37" stroke="#7A3316" stroke-opacity=".3" stroke-width="1"/>
      ${shine('M20 18.4l3.4-3.6', 0.6, 1.2)}
      <circle cx="14.4" cy="36" r="4.4" fill="#2C2622"/><circle cx="14.4" cy="36" r="2" ${f('steel')}/>
      <circle cx="35" cy="36" r="4.4" fill="#2C2622"/><circle cx="35" cy="36" r="2" ${f('steel')}/>
      <g class="di-accent"><rect x="40.6" y="27.4" width="2.8" height="2.2" rx=".8" ${f('gold')}/></g>
    </g>`,
};
