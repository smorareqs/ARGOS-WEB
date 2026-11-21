import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessionStore } from '../../../../core/store/session.store';
import { LogoComponent } from '../../../../shared/atoms/logo/logo.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { PhotoComponent } from '../../../../shared/atoms/photo/photo.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { InViewDirective } from '../../../../shared/directives/in-view.directive';
import { ScrollProgressDirective } from '../../../../shared/directives/scroll-progress.directive';
import { PHOTOS, PHOTO_CREDITS, Photo } from '../../../../shared/media/photos';
import { LandingHeaderComponent } from '../../components/landing-header/landing-header.component';
import { HeroVisualComponent } from '../../components/hero-visual/hero-visual.component';
import { TenantSwitchComponent } from '../../components/tenant-switch/tenant-switch.component';
import { DemoRequestComponent } from '../../components/demo-request/demo-request.component';
import { SpotIconComponent, SpotIconName } from '../../../../shared/atoms/spot-icon/spot-icon.component';
import { TopoLinesComponent } from '../../components/topo-lines/topo-lines.component';

interface OpsCard {
  readonly title: string;
  readonly photo: Photo;
  readonly status: string;
  readonly tone: 'warning' | 'danger' | 'success';
  readonly text: string;
  readonly facts: readonly string[];
}

interface Point {
  readonly icon: SpotIconName;
  readonly title: string;
  readonly text: string;
}

/**
 * Screen · sitio público de ARGOS (antes del login). Fotografía real de
 * propiedades y equipos, piezas reales de la interfaz y una captura del panel.
 * `/#demo` abre directamente el formulario de demo.
 */
@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LogoComponent,
    IconComponent,
    PhotoComponent,
    DrawerComponent,
    InViewDirective,
    ScrollProgressDirective,
    LandingHeaderComponent,
    HeroVisualComponent,
    TenantSwitchComponent,
    DemoRequestComponent,
    SpotIconComponent,
    TopoLinesComponent,
  ],
  templateUrl: './landing.component.html',
  styles: `
    /* Titulares de la landing más grandes: tracking algo más cerrado. */
    :host {
      display: block;
      --display-tracking: -0.034em;
      --cream: #f6f2ea;
      background: var(--cream);
    }
    .bg-cream { background: var(--cream); }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 48px; padding: 0 22px;
      border-radius: var(--radius-field); font-size: 14.5px; font-weight: 700; white-space: nowrap;
      transition: background-color var(--dur-fast), border-color var(--dur-fast), color var(--dur-fast); }
    .btn-primary { background: var(--color-primary); color: #fff; }
    .btn-primary:hover { background: #0b4a55; }
    .btn-outline { border: 1px solid var(--color-border-field); background: #fff; color: var(--color-primary); }
    .btn-outline:hover { border-color: var(--color-disabled); }
    .btn-white { background: #fff; color: var(--color-primary); }
    .btn-white:hover { background: var(--color-surface-soft); }
    .btn-ghost-white { border: 1px solid rgba(255, 255, 255, 0.45); color: #fff; }
    .btn-ghost-white:hover { background: rgba(255, 255, 255, 0.1); }

    .zoom { transition: transform 900ms var(--ease-enter); }
    .group:hover .zoom { transform: scale(1.04); }
    .status { background: rgba(255, 255, 255, 0.94); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }

    /* Captura del panel: se endereza y crece mientras se hace scroll (--p de appScrollProgress). */
    .shot { transform-origin: 50% 0; transform: perspective(1800px) rotateX(calc((1 - var(--p, 1)) * 14deg)) scale(calc(0.9 + var(--p, 1) * 0.1)); }
    .frame { box-shadow: 0 0 0 1px rgba(0, 56, 65, 0.08), 0 30px 60px -20px rgba(0, 56, 65, 0.28); }

    /* Banda de Antigua: pasa de tarjeta a ancho completo con el scroll. */
    .band-clip { clip-path: inset(0 calc((1 - var(--p, 1)) * 4vw) round calc((1 - var(--p, 1)) * 22px)); }
    .band-img { transform: scale(calc(1.14 - var(--p, 1) * 0.14)); }
    .band-shade { background: linear-gradient(180deg, rgba(0, 20, 24, 0) 30%, rgba(0, 20, 24, 0.72) 100%); }
    .credit { text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6); }
    .cta-shade { background: linear-gradient(90deg, rgba(0, 29, 35, 0.84) 0%, rgba(0, 29, 35, 0.55) 45%, rgba(0, 29, 35, 0) 75%); }

    @media (prefers-reduced-motion: reduce) {
      .zoom { transition: none; }
      .shot, .band-clip, .band-img { transform: none; clip-path: none; }
    }
  `,
})
export class LandingComponent {
  protected readonly session = inject(SessionStore);
  protected readonly demoOpen = signal(false);
  protected readonly markDrawn = signal(false);
  protected readonly photos = PHOTOS;
  protected readonly credits = PHOTO_CREDITS;
  protected readonly year = new Date().getFullYear();

  /** Relieves de fondo por sección (coordenadas 0–1000). */
  protected readonly panelPeaks = [
    { x: 120, y: 180, rings: 13 },
    { x: 930, y: 900, rings: 12 },
  ];
  protected readonly sidePeaks = [{ x: 960, y: 120, rings: 14 }];
  protected readonly heroPeaks = [
    { x: 780, y: 420, rings: 13 },
    { x: 60, y: 980, rings: 7 },
  ];

  protected readonly heroFacts: readonly Point[] = [
    { icon: 'offline', title: 'Funciona sin señal', text: 'La app guarda todo y sincroniza al volver la conexión.' },
    { icon: 'evidence', title: 'Evidencia en cada tarea', text: 'Fotos, hora y ubicación al cerrar.' },
    { icon: 'companies', title: 'Multiempresa', text: 'Cada empresa en su propio espacio.' },
  ];

  protected readonly ops: readonly OpsCard[] = [
    {
      title: 'Limpieza',
      photo: PHOTOS.cleaning,
      status: 'En progreso · inició 14:05',
      tone: 'warning',
      text: 'Checklist por propiedad y por tipo de limpieza. Al terminar, fotos de cierre y la propiedad queda lista para el siguiente huésped.',
      facts: ['Llegada y salida con GPS', 'Fotos obligatorias por área', 'Faltantes reportados al momento'],
    },
    {
      title: 'Mantenimiento',
      photo: PHOTOS.maintenance,
      status: 'Prioridad alta · asignada',
      tone: 'danger',
      text: 'Las incidencias llegan con foto, prioridad y propiedad. Se asignan al técnico indicado y queda el historial de cada reparación.',
      facts: ['Preventivos programados', 'Historial por propiedad', 'Aviso si algo se retrasa'],
    },
    {
      title: 'Huéspedes',
      photo: PHOTOS.checkin,
      status: 'Check-in 15:00 · lista',
      tone: 'success',
      text: 'Llegadas y salidas del día, registro de documentos y aviso cuando la propiedad está lista para recibir.',
      facts: ['Registro con DPI o pasaporte', 'Documentos borrados a los 90 días', 'Alarma si no hay check-out'],
    },
  ];

  protected readonly panelPoints: readonly Point[] = [
    { icon: 'alerts', title: 'Requiere tu atención', text: 'Retrasos, incidencias y preventivos vencidos, por prioridad. Se resuelven desde ahí mismo.' },
    { icon: 'compliance', title: 'Cumplimiento del día', text: 'Cuántas limpiezas van, cuáles se retrasan y quién necesita apoyo.' },
    { icon: 'map', title: 'Mapa de propiedades', text: 'Cada propiedad con su estado: lista, en limpieza, ocupada o con incidencia.' },
  ];

  protected readonly tenantPoints: readonly Point[] = [
    { icon: 'isolated', title: 'Datos aislados', text: 'Una empresa nunca ve la información de otra.' },
    { icon: 'roles', title: 'Roles a tu medida', text: 'Siete roles listos y los que quieras crear, con permisos por módulo.' },
    { icon: 'switch', title: 'Un acceso, varias empresas', text: 'Quien trabaja para varias cambia de empresa sin cerrar sesión.' },
    { icon: 'features', title: 'Funciones por empresa', text: 'Activa reservas, parqueos, áreas comunes o chat según tu operación.' },
  ];

  protected readonly security: readonly Point[] = [
    { icon: 'two-step', title: 'Verificación en dos pasos', text: 'Opcional para todos y obligatoria para administradores si tu empresa lo decide.' },
    { icon: 'retention', title: 'Documentos que se borran solos', text: 'Las fotos de DPI y pasaporte se eliminan 90 días después del check-out.' },
    { icon: 'logbook', title: 'Bitácora de cada cambio', text: 'Cada acción queda registrada con su autor, fecha y origen.' },
    { icon: 'sessions', title: 'Sesiones por dispositivo', text: 'Cierra el acceso de un teléfono perdido sin tocar los demás.' },
  ];

  constructor() {
    inject(ActivatedRoute)
      .fragment.pipe(takeUntilDestroyed())
      .subscribe((f) => {
        if (f === 'demo') this.demoOpen.set(true);
      });
  }

  protected toneDot(tone: OpsCard['tone']): string {
    return tone === 'warning' ? 'bg-warning' : tone === 'danger' ? 'bg-danger' : 'bg-success';
  }
}
