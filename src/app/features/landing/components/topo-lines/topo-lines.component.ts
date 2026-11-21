import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface Peak {
  readonly x: number;
  readonly y: number;
  readonly rings: number;
}

/**
 * Curvas de nivel de un relieve volcánico (como un mapa topográfico de
 * Antigua o Atitlán), generadas por código y deterministas. Son la textura de
 * fondo de la landing: dan profundidad a los fondos claros con un trazo fino,
 * sin manchas ni brillos.
 */
@Component({
  selector: 'app-topo-lines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none block', 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <g fill="none" [attr.stroke]="color()" stroke-width="1.15" vector-effect="non-scaling-stroke">
        @for (d of paths(); track $index) {
          <path [attr.d]="d" [attr.opacity]="opacity()" vector-effect="non-scaling-stroke" />
        }
      </g>
    </svg>
  `,
})
export class TopoLinesComponent {
  readonly seed = input<number>(7);
  readonly color = input<string>('#003841');
  readonly opacity = input<number>(0.1);
  /** Cumbres en coordenadas 0–1000. */
  readonly peaks = input<readonly Peak[]>([
    { x: 690, y: 430, rings: 15 },
    { x: 220, y: 820, rings: 9 },
  ]);

  protected readonly paths = computed(() => {
    const rand = mulberry32(this.seed());
    const out: string[] = [];
    for (const peak of this.peaks()) {
      const phases = [rand() * 6.28, rand() * 6.28, rand() * 6.28, rand() * 6.28];
      for (let k = 0; k < peak.rings; k++) {
        const r = 26 + k * 34 + k * k * 0.9;
        const wobble = 0.05 + k * 0.012;
        const pts: [number, number][] = [];
        for (let i = 0; i < 36; i++) {
          const t = (i / 36) * Math.PI * 2;
          const f =
            1 +
            wobble * Math.sin(2 * t + phases[0] + k * 0.18) +
            wobble * 0.7 * Math.sin(3 * t + phases[1] - k * 0.11) +
            wobble * 0.45 * Math.sin(5 * t + phases[2]) +
            wobble * 0.3 * Math.sin(7 * t + phases[3] + k * 0.07);
          pts.push([peak.x + Math.cos(t) * r * f * 1.18, peak.y + Math.sin(t) * r * f * 0.86]);
        }
        out.push(closedCurve(pts));
      }
    }
    return out;
  });
}

/** Curva cerrada suave (Catmull-Rom → Bézier cúbica). */
function closedCurve(p: [number, number][]): string {
  const n = p.length;
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
