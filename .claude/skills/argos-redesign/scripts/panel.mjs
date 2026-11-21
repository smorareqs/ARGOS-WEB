// Entra al panel con una cuenta real (API en Docker) y captura pantallas internas.
//
//   node panel.mjs --routes /inicio,/propiedades,/colaboradores --out <carpeta>
//                  [--company "Garrent"] [--mobile] [--scale 2] [--full] [--hide-notes]
//                  [--clip "<selector>"]
//
// Credenciales: ARGOS_LOGIN_EMAIL y ARGOS_LOGIN_PASSWORD; si no están, usa la cuenta
// personal de BACKEND/.env (ARGOS_SEED_DEV_EMAIL / ARGOS_SEED_DEV_PASSWORD). Nunca
// imprime la contraseña. URL base: ARGOS_WEB_URL (por defecto http://localhost:4200).
//
// --company     empresa a elegir si la cuenta tiene varias (por defecto, la primera)
// --mobile      además captura a 390×844
// --hide-notes  quita el aviso "Simulado" (solo para capturas de producto)
// --clip        recorta ese elemento en cada ruta
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser, parseArgs, sleep } from './cdp.mjs';

const args = parseArgs(process.argv.slice(2));
const base = (process.env.ARGOS_WEB_URL ?? 'http://localhost:4200').replace(/\/$/, '');
const routes = String(args.routes ?? '/inicio').split(',').map((r) => r.trim()).filter(Boolean);
const out = String(args.out ?? 'capturas');
mkdirSync(out, { recursive: true });

function credentials() {
  if (process.env.ARGOS_LOGIN_EMAIL && process.env.ARGOS_LOGIN_PASSWORD) {
    return { email: process.env.ARGOS_LOGIN_EMAIL, password: process.env.ARGOS_LOGIN_PASSWORD };
  }
  const envFile = fileURLToPath(new URL('../../../../../BACKEND/.env', import.meta.url));
  if (existsSync(envFile)) {
    const env = Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/)
      .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
    if (env.ARGOS_SEED_DEV_EMAIL && env.ARGOS_SEED_DEV_PASSWORD) {
      return { email: env.ARGOS_SEED_DEV_EMAIL, password: env.ARGOS_SEED_DEV_PASSWORD };
    }
  }
  throw new Error('Sin credenciales: define ARGOS_LOGIN_EMAIL/ARGOS_LOGIN_PASSWORD o la cuenta de desarrollo en BACKEND/.env.');
}

const slug = (route) => route.replace(/^\//, '').replace(/[^\w-]+/g, '-') || 'raiz';
const { email, password } = credentials();
const scale = +(args.scale ?? 1);
const page = await openBrowser({ width: 1440, height: 900, scale });

async function capture(route, suffix) {
  if (args['hide-notes']) await page.evaluate(`document.querySelectorAll('app-demo-data-note').forEach((n) => n.remove())`);
  await sleep(600);
  const file = join(out, `${slug(route)}-${suffix}.png`);
  if (args.clip) {
    const clip = await page.rectOf(args.clip);
    if (!clip) { console.log(`${route}: no existe ${args.clip}`); return; }
    await page.screenshot(file, { clip });
  } else {
    if (args.full) await page.revealAll();
    await page.screenshot(file, { full: !!args.full });
  }
  console.log(file);
}

async function open(route) {
  const clicked = await page.evaluate(`(() => { const a = [...document.querySelectorAll('a')].find((x) => x.getAttribute('href') === ${JSON.stringify(route)}); if (!a) return false; a.click(); return true; })()`);
  if (!clicked) await page.goto(base + route, 4000);
  else await sleep(2500);
}

try {
  await page.goto(`${base}/login`, 4000);
  await page.type('#login-email', email);
  await page.type('#login-password', password);
  await page.click('form button[type=submit]');
  await sleep(3000);
  if (await page.evaluate(`!!document.querySelector('.tenant-card')`)) {
    const chosen = args.company
      ? await page.clickText(String(args.company), '.tenant-card')
      : await page.click('.tenant-card');
    if (!chosen) throw new Error(`No encontré la empresa ${args.company}`);
    await sleep(3500);
  }
  const at = await page.evaluate('location.pathname');
  if (at.startsWith('/login')) throw new Error('No se pudo entrar: revisa credenciales y que la API esté arriba (docker ps).');
  console.log(`Sesión iniciada como ${email} → ${at}`);

  for (const route of routes) {
    await open(route);
    await capture(route, 'escritorio');
  }
  if (args.mobile) {
    await page.viewport(390, 844, Math.max(scale, 2));
    for (const route of routes) {
      await page.goto(base + route, 4000);
      await capture(route, 'movil');
    }
  }
  console.log(page.logs.join('\n') || 'consola sin errores');
} finally {
  page.close();
}
