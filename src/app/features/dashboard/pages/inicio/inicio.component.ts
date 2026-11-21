import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DashboardStore } from '../../store/dashboard.store';
import { DashboardAlert, MapPin } from '../../models/dashboard.model';
import { ToastService } from '../../../../core/services/toast.service';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { StatTileComponent } from '../../../../shared/molecules/stat-tile/stat-tile.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { PriorityHeroComponent } from '../../components/priority-hero/priority-hero.component';
import { ComplianceDonutComponent } from '../../components/compliance-donut/compliance-donut.component';
import { TeamRankingComponent } from '../../components/team-ranking/team-ranking.component';
import { PropertiesMapComponent } from '../../components/properties-map/properties-map.component';
import { ActivityFeedComponent } from '../../components/activity-feed/activity-feed.component';
import { UpcomingMaintenanceComponent } from '../../components/upcoming-maintenance/upcoming-maintenance.component';

/**
 * Screen · Inicio (W-B1). Área de lectura arriba (saludo y contexto) y
 * bloques agrupados debajo, cada uno enlazado a su sección.
 */
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
@Component({
  selector: 'app-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoDataNoteComponent,
    RouterLink,
    IconComponent,
    ButtonComponent,
    StatTileComponent,
    EmptyStateComponent,
    PriorityHeroComponent,
    ComplianceDonutComponent,
    TeamRankingComponent,
    PropertiesMapComponent,
    ActivityFeedComponent,
    UpcomingMaintenanceComponent,
  ],
  providers: [DashboardStore],
  templateUrl: './inicio.component.html',
  styles: `
    .live { box-shadow: 0 0 0 3px rgba(90, 138, 107, 0.18); }
    .card-link { transition: color var(--dur-fast); }
    .card-link:hover { color: var(--color-primary); }
  `,
})
export class InicioComponent {
  protected readonly store = inject(DashboardStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly today = computed(() =>
    new Intl.DateTimeFormat('es-GT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Guatemala',
    }).format(new Date()),
  );

  constructor() {
    void this.store.load();
  }

  protected onAlertAction(a: DashboardAlert): void {
    this.toast.show(`"${a.action}" abrirá la tarea o incidencia cuando lleguen Itinerario y Mantenimiento.`);
  }

  protected onPin(p: MapPin): void {
    void this.router.navigate(['/propiedades'], { queryParams: { q: p.code } });
  }

  protected soon(section: string): void {
    void this.router.navigateByUrl(`/${section}`);
  }
}
