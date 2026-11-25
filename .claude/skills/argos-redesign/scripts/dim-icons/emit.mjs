// Genera src/app/shared/atoms/dim-icon (componente + CSS) y los degradados #dg-* de index.html
// a partir de dim-icons.mjs y css.mjs. Uso: node emit.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFS, ICONS, FROM_LINE } from './dim-icons.mjs';
import { CSS as css } from './css.mjs';

// Raíz de WEB a partir de este archivo (.claude/skills/argos-redesign/scripts/dim-icons).
const web = fileURLToPath(new URL('../../../../../', import.meta.url)).split('\\').join('/');
const clean = (s) => s.replace(/\n\s*/g, '\n          ').trim();
const names = Object.keys(ICONS);

const cases = names
  .map((n) => `        @case ('${n}') {\n          ${clean(ICONS[n])}\n        }`)
  .join('\n');

const ts = `import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { IconName } from '../icon/icon.component';

export type DimIconName =
${names.map((n) => `  | '${n}'`).join('\n')};

/** Ícono de línea de un indicador → su versión con volumen (si existe). */
export const DIM_FROM_LINE: Partial<Record<IconName, DimIconName>> = ${JSON.stringify(FROM_LINE, null, 2).replace(/"([a-z]+)":/g, '$1:').replace(/"/g, "'")};

/**
 * Átomo · íconos con volumen (ref. la iconografía dimensional de Airbnb 2025):
 * objetos reconocibles de la operación con luz arriba a la izquierda, sombra
 * de contacto y un detalle dorado. Pintan con los degradados globales
 * \`#dg-*\` de index.html, así no repiten definiciones por instancia.
 *
 * Entran con un pequeño rebote y, al pasar el cursor (sobre el ícono o sobre
 * una tarjeta \`.group\`/\`.lift\`), cada uno hace su gesto: las ventanas se
 * encienden, el despertador suena, la maleta salta, la balanza se mece.
 *
 * Úsalos donde un ícono representa algo (indicadores, tipos de propiedad,
 * pines del mapa). En controles y navegación siguen los íconos de línea.
 */
@Component({
  selector: 'app-dim-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'dim', '[style.width.px]': 'size()', '[style.height.px]': 'size()', '[class.still]': '!animate()' },
  template: \`
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">
      @switch (name()) {
${cases}
      }
    </svg>
  \`,
  // Estilos globales en dim-icon.css (importado desde styles.css).
})
export class DimIconComponent {
  readonly name = input.required<DimIconName>();
  readonly size = input<number>(48);
  /** false en listas largas o pines: sin entrada ni gestos. */
  readonly animate = input<boolean>(true);
}
`;


const dir = web + 'src/app/shared/atoms/dim-icon/';
mkdirSync(dir, { recursive: true });
writeFileSync(dir + 'dim-icon.component.ts', ts);
writeFileSync(dir + 'dim-icon.css', '/* Generado por scripts/dim-icons/emit.mjs (global: lo importa styles.css). */\n' + css);

// Degradados globales en index.html (una sola vez).
const idx = web + 'src/index.html';
let html = readFileSync(idx, 'utf8');
const block = `  <!-- Degradados de los íconos con volumen (app-dim-icon) y del mapa -->\n  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${DEFS.replace(/\n/g, '\n    ')}\n  </defs></svg>\n`;
html = html.replace(/  <!-- Degradados de los íconos[\s\S]*?<\/defs><\/svg>\n/, '');
html = html.replace('<body>\n', '<body>\n' + block);
writeFileSync(idx, html);
console.log('ok', names.length);
