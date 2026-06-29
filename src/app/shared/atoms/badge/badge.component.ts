import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeStatus =
  | 'in-progress' // En progreso (dorado)
  | 'operational' // Operativo (verde)
  | 'incident' // Incidencia / Requiere atención (rojo)
  | 'pending' // Pendiente (gris)
  | 'overdue' // Vencido (dorado)
  | 'repairing'; // En reparación (dorado)

interface BadgeStyle {
  readonly wrap: string;
  readonly dot: string;
}

/**
 * Átomo · insignia de estado (§03 Insignias de estado).
 * Píldora con punto de color + etiqueta. El texto lo provee <ng-content>.
 */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-[5px] rounded-pill px-3 py-[5px] text-[11px] font-bold"
      [class]="style().wrap"
    >
      <span class="h-1.5 w-1.5 rounded-pill" [class]="style().dot"></span>
      <ng-content />
    </span>
  `,
  styles: `:host { display: inline-flex; }`,
})
export class BadgeComponent {
  readonly status = input.required<BadgeStatus>();

  private static readonly STYLES: Record<BadgeStatus, BadgeStyle> = {
    'in-progress': { wrap: 'bg-secondary/15 text-warning-text', dot: 'bg-secondary' },
    operational: { wrap: 'bg-primary/10 text-primary', dot: 'bg-success' },
    incident: { wrap: 'bg-danger/10 text-danger', dot: 'bg-danger' },
    pending: { wrap: 'bg-divider text-text-secondary', dot: 'bg-disabled' },
    overdue: { wrap: 'bg-secondary/15 text-warning-text', dot: 'bg-secondary' },
    repairing: { wrap: 'bg-secondary/15 text-warning-text', dot: 'bg-secondary' },
  };

  protected readonly style = computed(() => BadgeComponent.STYLES[this.status()]);
}
