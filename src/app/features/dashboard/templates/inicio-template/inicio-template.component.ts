import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DashboardData } from '../../models/dashboard.model';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { CardComponent } from '../../../../shared/molecules/card/card.component';
import { LivePillComponent } from '../../../../shared/molecules/live-pill/live-pill.component';

/**
 * Template · pantalla de Inicio (dashboard). Recrea el Frame 02 del diseño:
 * saludo, hero de prioridad, cumplimiento + mapa, ranking + mantenimiento.
 * Estructura pura (sin stores): recibe los datos por @Input() (§6 · Templates).
 * Ref: ARGOS Web · Frame 02 · Inicio.
 */
@Component({
  selector: 'app-inicio-template',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, AvatarComponent, BadgeComponent, CardComponent, LivePillComponent],
  templateUrl: './inicio-template.component.html',
})
export class InicioTemplateComponent {
  readonly data = input.required<DashboardData>();
  readonly greeting = input.required<string>();

  /** Circunferencia del donut (r=52) para el cálculo del stroke-dasharray. */
  private readonly circumference = 2 * Math.PI * 52;

  protected readonly donutDash = computed(() => {
    const pct = this.data().compliance.percent / 100;
    const filled = this.circumference * pct;
    return `${filled.toFixed(1)} ${(this.circumference - filled).toFixed(1)}`;
  });

  protected readonly pinColor: Record<string, string> = {
    'in-progress': 'var(--color-secondary)',
    finished: 'var(--color-primary)',
    incident: 'var(--color-danger)',
  };

  protected liveLabel(count: number): string {
    return `${count} equipos en campo · en vivo`;
  }
}
