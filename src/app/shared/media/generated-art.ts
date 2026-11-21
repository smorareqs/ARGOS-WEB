import type { Style } from '@dicebear/core';

/**
 * Arte generado con DiceBear (`@dicebear/core`, MIT) para personas sin foto y
 * empresas sin logo, en lugar de iniciales.
 *
 * - Personas: estilo Notionists (Zoish, CC0), con la tinta teal de la marca.
 * - Empresas: estilo Shapes (DiceBear, CC0) con la paleta ARGOS.
 *
 * Los estilos son JSON estáticos que angular.json copia a `/vendor/dicebear`
 * (Notionists pesa ~110 kB comprimido) y el motor se importa aparte del bundle
 * inicial: nada se descarga hasta que se dibuja el primer avatar, y después
 * queda en caché del navegador. Cada imagen se guarda en memoria por semilla.
 */

type Core = typeof import('@dicebear/core');
type StyleName = 'notionists' | 'shapes';

/** Fondos de los retratos: menta, arena, gris azulado y crema. */
export const PERSON_BACKDROPS = ['#e3eeea', '#f3e3cc', '#dbe7ea', '#efe4d3'] as const;

let core: Promise<Core> | null = null;
const styles = new Map<StyleName, Promise<Style>>();
const images = new Map<string, string>();

function loadStyle(name: StyleName): Promise<Style> {
  let style = styles.get(name);
  if (!style) {
    core ??= import('@dicebear/core');
    const url = new URL(`vendor/dicebear/${name}.min.json`, document.baseURI);
    style = Promise.all([core, fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))])
      .then(([{ Style }, definition]) => new Style(definition));
    // Si falla (sin red), se puede reintentar en el próximo avatar.
    style.catch(() => styles.delete(name));
    styles.set(name, style);
  }
  return style;
}

async function render(name: StyleName, seed: string, options: Record<string, unknown>): Promise<string> {
  const key = `${name}:${seed}`;
  const hit = images.get(key);
  if (hit) return hit;
  const [{ Avatar }, style] = await Promise.all([core ?? import('@dicebear/core'), loadStyle(name)]);
  const uri = new Avatar(style, { seed, ...options }).toDataUri();
  images.set(key, uri);
  return uri;
}

/** Fondo estable para una semilla (el mismo que usa el retrato). */
export function personBackdrop(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  return PERSON_BACKDROPS[Math.abs(h) % PERSON_BACKDROPS.length];
}

/** Ya generado (para pintarlo sin esperar). */
export function cachedPersonArt(seed: string): string | null {
  return images.get(`notionists:${seed}`) ?? null;
}

/**
 * Retrato de una persona. Sin barba ni gestos (el estilo no distingue
 * personas por nombre) y con la cara encuadrada para leerse desde 24 px.
 */
export function personArt(seed: string): Promise<string> {
  return render('notionists', seed, {
    backgroundColor: personBackdrop(seed).slice(1),
    inkColor: '0b3a42',
    gestureProbability: 0,
    beardProbability: 0,
    scale: 1.4,
    translateY: 12,
  });
}

/** Marca abstracta para una empresa que aún no subió su logo. */
export function companyArt(seed: string): Promise<string> {
  return render('shapes', seed, {
    backgroundColor: ['003841', 'f3e3cc', '3a6168'],
    shape1Color: ['c5873c', 'e3eeea', '5e8c86'],
    shape2Color: ['f6f2ea', 'c5873c', '0b4a55'],
    shape3Color: ['e0855a', 'ffffff', '9fc2bb'],
  });
}
