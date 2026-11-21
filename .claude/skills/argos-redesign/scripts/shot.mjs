// Captura una URL pública (landing, login) o cualquier página.
//
//   node shot.mjs <url> <salida.png> [--w 1440] [--h 900] [--scale 1] [--wait 3500]
//                 [--full] [--clip "<selector>"] [--scroll "<selector>"] [--jpeg]
//
// --full    página completa (recorre antes la página para disparar animaciones)
// --clip    recorta el elemento (con 16 px de margen); úsalo con --scale 2 para revisar detalle
// --scroll  centra ese elemento antes de capturar (para lo que aparece al hacer scroll)
import { openBrowser, parseArgs, sleep } from './cdp.mjs';

const args = parseArgs(process.argv.slice(2));
const [url, out] = args._;
if (!url || !out) {
  console.error('Uso: node shot.mjs <url> <salida.png> [--w 1440] [--h 900] [--scale 1] [--full] [--clip sel] [--scroll sel]');
  process.exit(2);
}

const page = await openBrowser({ width: +(args.w ?? 1440), height: +(args.h ?? 900), scale: +(args.scale ?? 1) });
try {
  await page.goto(url, +(args.wait ?? 3500));
  if (args.full) await page.revealAll();
  if (args.scroll) {
    await page.evaluate(`document.querySelector(${JSON.stringify(args.scroll)})?.scrollIntoView({ block: 'center' })`);
    await sleep(2200);
  }
  let clip = null;
  if (args.clip) {
    clip = await page.rectOf(args.clip);
    if (!clip) throw new Error(`No existe el selector ${args.clip}`);
  }
  await page.screenshot(out, { full: !!args.full, clip, format: args.jpeg ? 'jpeg' : 'png' });
  const height = await page.evaluate('document.documentElement.scrollHeight');
  console.log(`${out} · alto de página ${height}px`);
  console.log(page.logs.join('\n') || 'consola sin errores');
} finally {
  page.close();
}
