// Navegador headless (Edge o Chrome) por el protocolo DevTools, sin dependencias.
// Lo usan shot.mjs, panel.mjs y refs.mjs. Requiere Node 22+ (WebSocket global).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BROWSERS = [
  process.env.ARGOS_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lee `--clave valor` y `--bandera` de argv; el resto queda en `_`. */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

export async function openBrowser({ width = 1440, height = 900, scale = 1 } = {}) {
  const exe = BROWSERS.find((p) => existsSync(p));
  if (!exe) throw new Error('No encontré Edge ni Chrome. Define ARGOS_BROWSER con la ruta del ejecutable.');
  const profile = mkdtempSync(join(tmpdir(), 'argos-cdp-'));
  const port = 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

  let targets = [];
  for (let i = 0; i < 60 && !targets.length; i++) {
    try { targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((t) => t.type === 'page'); } catch { /* aún no abre */ }
    if (!targets.length) await sleep(250);
  }
  if (!targets.length) { proc.kill(); throw new Error('El navegador no abrió el puerto de depuración.'); }

  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    const p = m.params;
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPCIÓN ' + String(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text).slice(0, 300));
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(p.type)) logs.push(`${p.type} ` + p.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
    if (m.method === 'Network.responseReceived' && p.response.status >= 400) logs.push(`HTTP ${p.response.status} ${p.response.url.slice(0, 140)}`);
    if (m.method === 'Network.loadingFailed' && !p.canceled) logs.push(`FALLÓ ${p.errorText}`);
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  const viewport = (w, h, s = scale) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: s, mobile: w < 600 });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await viewport(width, height);

  return {
    send, evaluate, logs, viewport,
    async goto(url, wait = 3500) { await send('Page.navigate', { url }); await sleep(wait); },
    async type(selector, text) {
      await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus(); el.value = ''; })()`);
      await send('Input.insertText', { text });
    },
    click: (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`),
    clickText: (text, selector = 'button, a') => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`),
    /** Recorre la página para disparar las animaciones de entrada (appInView) y vuelve arriba. */
    async revealAll() {
      const total = await evaluate('document.documentElement.scrollHeight');
      for (let y = 0; y < total; y += 500) { await evaluate(`window.scrollTo(0, ${y})`); await sleep(140); }
      await sleep(800);
      await evaluate('window.scrollTo(0, 0)');
      await sleep(500);
    },
    /** Rectángulo del elemento en coordenadas de documento (con margen). */
    rectOf: (selector, pad = 16) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const b = e.getBoundingClientRect();
      return { x: Math.max(0, b.x + scrollX - ${pad}), y: Math.max(0, b.y + scrollY - ${pad}), width: b.width + ${pad * 2}, height: b.height + ${pad * 2}, scale: 1 }; })()`),
    async screenshot(file, { full = false, clip = null, format = 'png' } = {}) {
      const params = { format };
      if (format === 'jpeg') params.quality = 80;
      if (clip) { params.clip = clip; params.captureBeyondViewport = true; }
      else if (full) {
        const m = await send('Page.getLayoutMetrics');
        const { width, height } = m.result.cssContentSize;
        params.clip = { x: 0, y: 0, width, height: Math.min(height, 12000), scale: 1 };
        params.captureBeyondViewport = true;
      }
      const res = await send('Page.captureScreenshot', params);
      writeFileSync(file, Buffer.from(res.result.data, 'base64'));
      return file;
    },
    close() { try { ws.close(); } catch { /* ya cerrado */ } proc.kill(); },
  };
}
