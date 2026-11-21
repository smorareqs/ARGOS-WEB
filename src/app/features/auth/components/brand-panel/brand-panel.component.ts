import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { PhotoComponent } from '../../../../shared/atoms/photo/photo.component';
import { SpotIconComponent, SpotIconName } from '../../../../shared/atoms/spot-icon/spot-icon.component';
import { PHOTOS, Photo } from '../../../../shared/media/photos';

interface Slide {
  readonly photo: Photo;
  readonly icon: SpotIconName;
  readonly title: string;
  readonly status: string;
  readonly tone: 'success' | 'warning';
}

const SLIDE_MS = 7000;

/**
 * Organism · panel fotográfico del acceso. Propiedades reales que rotan
 * despacio (fundido y un leve acercamiento), cada una con el estado que
 * ARGOS muestra de ella. Las barras inferiores marcan el avance de cada foto.
 * Con "reducir movimiento" se queda en la primera foto.
 */
@Component({
  selector: 'app-brand-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhotoComponent, SpotIconComponent],
  template: `
    <div class="relative h-full overflow-hidden rounded-hero bg-primary-deep">
      @for (s of slides; track s.title; let i = $index) {
        <app-photo
          class="slide absolute inset-0"
          [class.on]="i === index()"
          [photo]="s.photo"
          [eager]="i === 0"
          [decorative]="true"
          sizes="(min-width: 768px) 56vw, 1px"
        />
      }
      <div class="shade absolute inset-0"></div>

      <div class="absolute inset-x-0 bottom-0 p-8 lg:p-10">
        <div class="grid">
          @for (s of [current()]; track s.title) {
            <div class="card col-start-1 row-start-1 flex max-w-[380px] items-center gap-3.5 p-4" animate.enter="card-in" animate.leave="card-out">
              <app-spot-icon [name]="s.icon" [size]="46" />
              <span class="min-w-0">
                <span class="block truncate text-[13.5px] font-bold text-primary">{{ s.title }}</span>
                <span class="mt-0.5 flex items-center gap-1.5 text-[12px] text-text-secondary">
                  <span class="h-2 w-2 shrink-0 rounded-pill" [class.bg-success]="s.tone === 'success'" [class.bg-warning]="s.tone === 'warning'"></span>
                  {{ s.status }}
                </span>
              </span>
            </div>
          }
        </div>

        <div class="mt-6 flex items-end justify-between gap-6">
          <div class="flex gap-1.5" aria-hidden="true">
            @for (s of slides; track s.title; let i = $index) {
              <span class="track h-[3px] w-10 overflow-hidden rounded-xs">
                <span class="fill block h-full" [class.done]="i < index()" [class.run]="i === index()" [style.animation-duration.ms]="slideMs"></span>
              </span>
            }
          </div>
          @if (current().photo.credit !== 'Unsplash') {
            <a [href]="current().photo.source" target="_blank" rel="noopener" class="text-[10.5px] text-white/55 hover:text-white/85">
              Foto: {{ current().photo.credit }} · {{ current().photo.license }}
            </a>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .slide { opacity: 0; transition: opacity 1200ms var(--ease-standard); }
    .slide.on { opacity: 1; }
    .slide.on ::ng-deep img { animation: drift 8200ms linear both; }
    @keyframes drift { from { transform: scale(1.07); } to { transform: scale(1); } }
    .shade { background: linear-gradient(180deg, rgba(0, 20, 24, 0) 52%, rgba(0, 20, 24, 0.62) 100%); }
    .card { background: #fff; border-radius: var(--radius-tile); box-shadow: var(--shadow-e3); }
    .card-in { animation: card-in 520ms var(--ease-enter) 250ms both; }
    .card-out { animation: card-out 220ms var(--ease-exit) both; }
    @keyframes card-in { from { opacity: 0; transform: translateY(10px); } }
    @keyframes card-out { to { opacity: 0; transform: translateY(-6px); } }
    .track { background: rgba(255, 255, 255, 0.3); }
    .fill { background: #fff; transform-origin: 0 50%; transform: scaleX(0); }
    .fill.done { transform: none; }
    .fill.run { animation-name: run; animation-timing-function: linear; animation-fill-mode: both; }
    @keyframes run { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @media (prefers-reduced-motion: reduce) {
      .slide { transition: none; }
      .slide.on ::ng-deep img, .card-in, .card-out { animation: none; }
      .fill.run { animation: none; transform: none; }
    }
  `,
})
export class BrandPanelComponent {
  protected readonly slideMs = SLIDE_MS;
  protected readonly slides: readonly Slide[] = [
    {
      photo: PHOTOS.antiguaArch,
      icon: 'arrivals',
      title: 'Antigua Guatemala · 14 propiedades',
      status: '6 llegadas hoy · todas listas',
      tone: 'success',
    },
    {
      photo: PHOTOS.lakeRoom,
      icon: 'cleaning',
      title: 'Casa del Lago · Habitación principal',
      status: 'Limpieza validada a las 10:42 · 18 fotos',
      tone: 'success',
    },
    {
      photo: PHOTOS.beachPool,
      icon: 'maintenance',
      title: 'Villa Palmeras · Piscina',
      status: 'Mantenimiento preventivo en curso',
      tone: 'warning',
    },
  ];

  protected readonly index = signal(0);
  protected readonly current = computed(() => this.slides[this.index()]);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const timer = setInterval(() => this.index.update((i) => (i + 1) % this.slides.length), SLIDE_MS);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
  }
}
