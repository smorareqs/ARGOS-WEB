// Tablero de revisión: todos los íconos a 96/56/40/24 px y en un indicador.
//   node board.mjs <salida.html>   → luego shot.mjs file:///<salida.html> <png> --full
import { writeFileSync } from 'node:fs';
import { DEFS, ICONS } from './dim-icons.mjs';

const svg = (name, size) =>
  `<svg viewBox="0 0 48 48" width="${size}" height="${size}" class="di">${ICONS[name]}</svg>`;
const names = Object.keys(ICONS);
const row = (size, bg) =>
  `<div class="row" style="background:${bg}">${names.map((n) => `<div class="cell">${svg(n, size)}<span>${size >= 56 ? n : ''}</span></div>`).join('')}</div>`;

const tileOld = (label, n, glyph) => `<div class="tile"><div class="tl"><span class="lab">${label}</span><span class="old">${glyph}</span></div><div class="num">${n}</div><p>Nota de ejemplo</p></div>`;
const tileNew = (label, n, icon) => `<div class="tile"><div class="tl"><span class="lab">${label}</span>${svg(icon, 44)}</div><div class="num">${n}</div><p>Nota de ejemplo</p></div>`;
const line = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>';

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>
body{margin:0;padding:28px;font-family:'Plus Jakarta Sans',sans-serif;background:#f4f1ea;color:#003841}
h2{font-size:15px;margin:22px 0 10px}
.row{display:flex;flex-wrap:wrap;gap:10px;padding:14px;border-radius:12px;margin-bottom:8px}
.cell{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;color:#7d7d72;min-width:60px}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.tile{background:#fff;border:1px solid #ede9de;border-radius:12px;padding:16px;box-shadow:0 1px 2px rgba(0,56,65,.05)}
.tl{display:flex;justify-content:space-between;align-items:flex-start;min-height:44px}
.lab{font-size:10.5px;letter-spacing:1px;text-transform:uppercase;color:#7d7d72}
.old{width:32px;height:32px;border-radius:6px;background:#f6ead8;color:#c5873c;display:flex;align-items:center;justify-content:center}
.num{font-size:38px;font-weight:600;margin-top:2px}
p{font-size:12px;color:#5a5a52;margin:8px 0 0}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs>${DEFS}</defs></svg>
<h2>Íconos con volumen · 96 px sobre blanco y crema</h2>
${row(96, '#fff')}${row(96, '#f4f1ea')}
<h2>56 · 40 · 24 px</h2>
${row(56, '#fff')}${row(40, '#fff')}${row(24, '#fff')}
<h2>Indicador hoy (línea en cuadrito) vs. con volumen</h2>
<div class="tiles">${tileOld('Limpiezas hoy', 22, line)}${tileOld('Retrasadas', 3, line)}${tileOld('Incidencias abiertas', 9, line)}${tileOld('Llegadas hoy', 1, line)}</div>
<div class="tiles" style="margin-top:14px">${tileNew('Limpiezas hoy', 22, 'cleaning')}${tileNew('Retrasadas', 3, 'clock')}${tileNew('Incidencias abiertas', 9, 'incident')}${tileNew('Llegadas hoy', 1, 'arrivals')}</div>
</body></html>`;
const out = process.argv[2] ?? new URL('./board.html', import.meta.url);
writeFileSync(out, html);
console.log('ok');
