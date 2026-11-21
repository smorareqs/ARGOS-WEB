// Investiga referencias: captura sitios reales y mide su estilo computado
// (tipografías, tamaños, radios, fondos, cabecera). Así se decidió la tipografía,
// los botones de 8 px y los fondos crema de ARGOS.
//
//   node refs.mjs <url> [<url> ...] --out <carpeta> [--mobile]
//
// Deja por sitio: <host>.jpg (primera pantalla), <host>-full.jpg (página completa)
// y <host>.json con las medidas; imprime un resumen. Si un sitio pide verificación
// (captcha, "acceso denegado"), no lo evadas: anótalo y usa otra referencia.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openBrowser, parseArgs, sleep } from './cdp.mjs';

const args = parseArgs(process.argv.slice(2));
const urls = args._;
const out = String(args.out ?? 'referencias');
if (!urls.length) { console.error('Uso: node refs.mjs <url> [<url> ...] --out <carpeta>'); process.exit(2); }
mkdirSync(out, { recursive: true });

const MEASURE = `(() => {
  const visible = (e) => e.offsetWidth > 0 && e.offsetHeight > 0;
  const font = (e) => { if (!e) return null; const s = getComputedStyle(e);
    return { family: s.fontFamily.split(',').slice(0, 2).join(',').replace(/"/g, ''), size: s.fontSize, weight: s.fontWeight,
      tracking: s.letterSpacing, lineHeight: s.lineHeight, color: s.color, text: e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 50) }; };
  const first = (sel) => [...document.querySelectorAll(sel)].find((e) => visible(e) && e.textContent.trim().length > 3);
  const solid = (c) => c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent';
  const buttons = [...document.querySelectorAll('a, button')].filter((e) => visible(e) && e.offsetHeight >= 32 && e.offsetHeight <= 64
    && solid(getComputedStyle(e).backgroundColor) && getComputedStyle(e).backgroundColor !== 'rgb(255, 255, 255)').slice(0, 4)
    .map((e) => { const s = getComputedStyle(e); return { text: e.textContent.trim().slice(0, 30), bg: s.backgroundColor, color: s.color,
      radius: s.borderRadius, height: e.offsetHeight + 'px', font: s.fontSize + ' ' + s.fontWeight }; });
  const cards = [...document.querySelectorAll('div, article, li, section a')].filter((e) => { if (!visible(e) || e.offsetWidth < 160 || e.offsetHeight < 100) return false;
    const s = getComputedStyle(e); return parseFloat(s.borderTopLeftRadius) > 0 && (s.boxShadow !== 'none' || s.borderTopWidth !== '0px'); })
    .slice(0, 6).map((e) => { const s = getComputedStyle(e); return { radius: s.borderRadius, shadow: s.boxShadow.slice(0, 80), border: s.border.slice(0, 40), bg: s.backgroundColor }; });
  const inputs = [...document.querySelectorAll('input:not([type=hidden]), select')].filter(visible).slice(0, 2)
    .map((e) => { const s = getComputedStyle(e); return { radius: s.borderRadius, height: e.offsetHeight + 'px', border: s.border.slice(0, 40) }; });
  const header = document.querySelector('header') ?? document.querySelector('nav');
  const sections = [...new Set([...document.querySelectorAll('section, main > div, footer')].filter(visible)
    .map((e) => getComputedStyle(e).backgroundColor).filter(solid))].slice(0, 8);
  return { title: document.title, bodyBg: getComputedStyle(document.body).backgroundColor, sections,
    h1: font(first('h1')), h2: font(first('h2')), body: font(first('p')), buttons, cards, inputs,
    header: header ? { height: header.offsetHeight + 'px', bg: getComputedStyle(header).backgroundColor,
      border: getComputedStyle(header).borderBottom.slice(0, 40), shadow: getComputedStyle(header).boxShadow.slice(0, 60) } : null };
})()`;

const page = await openBrowser({ width: args.mobile ? 390 : 1440, height: args.mobile ? 844 : 900 });
try {
  for (const url of urls) {
    const host = new URL(url).hostname.replace(/^www\./, '');
    page.logs.length = 0;
    await page.goto(url, 6500);
    const data = await page.evaluate(MEASURE);
    await page.screenshot(join(out, `${host}.jpg`), { format: 'jpeg' });
    await page.revealAll();
    await page.screenshot(join(out, `${host}-full.jpg`), { full: true, format: 'jpeg' });
    writeFileSync(join(out, `${host}.json`), JSON.stringify({ url, ...data }, null, 2));
    const f = (x) => (x ? `${x.family} ${x.size}/${x.weight} ${x.tracking}` : '—');
    console.log(`\n${host} · ${data?.title ?? ''}`);
    console.log(`  h1: ${f(data?.h1)} · texto: ${f(data?.body)}`);
    console.log(`  botones: ${(data?.buttons ?? []).map((b) => `${b.radius} ${b.height}`).join(' | ') || '—'}`);
    console.log(`  tarjetas: ${(data?.cards ?? []).map((c) => c.radius).join(' | ') || '—'} · fondo: ${data?.bodyBg} · secciones: ${(data?.sections ?? []).join(' ')}`);
    if (page.logs.some((l) => /HTTP 40[13]/.test(l))) console.log('  ⚠ el sitio respondió 401/403: puede estar bloqueando navegadores automáticos; no lo evadas.');
    await sleep(500);
  }
} finally {
  page.close();
}
