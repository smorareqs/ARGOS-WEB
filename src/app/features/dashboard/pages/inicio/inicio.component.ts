import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DashboardStore } from '../../store/dashboard.store';
import { DashboardAlert, MapPin } from '../../models/dashboard.model';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { StatTileComponent } from '../../../../shared/molecules/stat-tile/stat-tile.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { PriorityHeroComponent } from '../../components/priority-hero/priority-hero.component';
import { ComplianceDonutComponent } from '../../components/compliance-donut/compliance-donut.component';
import { TeamRankingComponent } from '../../components/team-ranking/team-ranking.component';
import { PropertiesMapComponent } from '../../components/properties-map/properties-map.component';
import { RealMapComponent } from '../../components/real-map/real-map.component';
import { MapsService } from '../../../../core/services/maps.service';
import { ActivityFeedComponent } from '../../components/activity-feed/activity-feed.component';
import { UpcomingMaintenanceComponent } from '../../components/upcoming-maintenance/upcoming-maintenance.component';

/**
 * Screen · Inicio (W-B1). Área de lectura arriba (saludo y contexto) y
 * bloques agrupados debajo, cada uno enlazado a su sección.
 */
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { DimIconComponent } from '../../../../shared/atoms/dim-icon/dim-icon.component';
import { plural } from '../../../../shared/utils/plural';
@Component({
  selector: 'app-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoDataNoteComponent,
    DimIconComponent,
    RouterLink,
    IconComponent,
    ButtonComponent,
    StatTileComponent,
    EmptyStateComponent,
    PriorityHeroComponent,
    ComplianceDonutComponent,
    TeamRankingComponent,
    PropertiesMapComponent,
    RealMapComponent,
    ActivityFeedComponent,
    UpcomingMaintenanceComponent,
  ],
  providers: [DashboardStore],
  templateUrl: './inicio.component.html',
  styles: `
    .live { box-shadow: 0 0 0 3px rgba(90, 138, 107, 0.18); }
    .card-link { transition: color var(--dur-fast); }
    .card-link:hover { color: var(--color-primary); }
    .greet-icon { filter: drop-shadow(0 10px 18px rgba(197, 135, 60, .25)); animation: float 6s ease-in-out infinite; }
    @keyframes float { 50% { transform: translateY(-6px) rotate(-3deg); } }
    @media (prefers-reduced-motion: reduce) { .greet-icon { animation: none; } }
    .sim { border-radius: 4px; background: var(--color-warning-soft); padding: 1px 6px; font-family: var(--font-sans); font-size: 10.5px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--color-warning); }
  `,
})
export class InicioComponent {
  protected readonly store = inject(DashboardStore);
  protected readonly plural = plural;
  private readonly router = inject(Router);
  private readonly maps = inject(MapsService);
  protected readonly mapFailed = signal(false);
  /** Mapa real de Google si el backend tiene clave (ARGOS_GOOGLE_MAPS_KEY). */
  protected readonly realMap = computed(() => this.maps.config()?.provider === 'google' && !this.mapFailed());

  protected readonly today = computed(() =>
    new Intl.DateTimeFormat('es-GT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Guatemala',
    }).format(new Date()),
  );

  /** De 18:00 a 5:59 el saludo lleva luna. */
  protected readonly night = computed(() => {
    const h = Number(new Intl.DateTimeFormat('es-GT', { hour: 'numeric', hour12: false, timeZone: 'America/Guatemala' }).format(new Date()));
    return h >= 18 || h < 6;
  });

  protected readonly sampleNote = computed(() =>
    this.store.data()?.simulated?.reservations
      ? 'Limpiezas, cumplimiento, ranking y llegadas son de muestra hasta que se conecten el itinerario y las reservas.'
      : 'Limpiezas, cumplimiento y ranking son de muestra hasta que se conecte el itinerario.',
  );

  constructor() {
    void this.store.load();
    void this.maps.load();
  }

  /** Cada alerta lleva a la pantalla donde se resuelve. */
  protected onAlertAction(a: DashboardAlert): void {
    if (a.link) {
      void this.router.navigate([a.link.path], { queryParams: a.link.query });
      return;
    }
    const target: Record<DashboardAlert['kind'], [string, Record<string, string>]> = {
      late: ['/itinerario', { vista: 'hoy' }],
      incident: ['/mantenimiento', {}],
      maintenance: ['/mantenimiento', { tab: 'preventivos' }],
      inventory: ['/inventario', { tab: 'discrepancias' }],
    };
    const [path, queryParams] = target[a.kind];
    void this.router.navigate([path], { queryParams });
  }

  protected onPin(p: MapPin): void {
    void this.router.navigate(['/propiedades'], { queryParams: { q: p.code } });
  }

  protected soon(section: string): void {
    void this.router.navigateByUrl(`/${section}`);
  }
}
