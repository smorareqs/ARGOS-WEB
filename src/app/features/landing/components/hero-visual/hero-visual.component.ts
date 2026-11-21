import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PhotoComponent } from '../../../../shared/atoms/photo/photo.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InViewDirective } from '../../../../shared/directives/in-view.directive';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { SpotIconComponent } from '../../../../shared/atoms/spot-icon/spot-icon.component';
import { PHOTOS } from '../../../../shared/media/photos';

/**
 * Visual del hero: una propiedad real con dos piezas de la interfaz de ARGOS
 * encima (como lo ve el equipo). Al entrar en pantalla el checklist se marca
 * punto por punto, la barra se llena y la limpieza queda "Validada".
 */
@Component({
  selector: 'app-hero-visual',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PhotoComponent, IconComponent, InViewDirective, AvatarComponent, SpotIconComponent],
  template: `
    <div class="relative" appInView>
      <app-photo
        class="arch aspect-[4/5] sm:aspect-[5/5.4] lg:aspect-[4/4.7]"
        [photo]="photo"
        [eager]="true"
        sizes="(min-width: 1024px) 560px, 100vw"
      />

      <!-- Tarea -->
      <div class="card task absolute left-3 top-4 w-[min(336px,calc(100%-24px))] p-4 sm:-left-10 sm:top-10">
        <div class="flex items-center gap-3">
          <app-spot-icon name="cleaning" [size]="42" />
          <div class="min-w-0 flex-1">
            <p class="whitespace-nowrap text-[13px] font-bold text-primary">Limpieza de salida</p>
            <p class="truncate text-[12px] text-text-secondary">Casa del Lago · Panajachel</p>
          </div>
          <span class="badge flex self-start items-center gap-1 rounded-xs bg-success-soft px-1.5 py-[3px] text-[10.5px] font-bold text-success">
            <app-icon name="check" [size]="12" /> Validada
          </span>
        </div>
        <div class="mt-3 flex items-center gap-2 border-t border-divider pt-3 text-[11.5px] text-text-secondary">
          <app-avatar initials="MR" name="María Ramos" [size]="24" />
          <span class="font-bold text-primary">María Ramos</span>
          <span class="ml-auto flex items-center gap-1"><app-icon name="clock" [size]="12" /> 10:42</span>
          <span class="flex items-center gap-1"><app-icon name="map-pin" [size]="12" /> GPS</span>
        </div>
      </div>

      <!-- Checklist -->
      <div class="card list absolute bottom-4 right-3 w-[min(272px,calc(100%-24px))] p-4 sm:-right-6 sm:bottom-12">
        <div class="flex items-baseline justify-between">
          <p class="text-[12.5px] font-bold text-primary">Checklist · Habitación principal</p>
          <p class="tabular text-[12px] text-text-secondary"><span class="count"></span>/12</p>
        </div>
        <div class="mt-2.5 h-1.5 overflow-hidden rounded-xs bg-track"><div class="bar h-full rounded-xs bg-success"></div></div>
        <ul class="mt-3 space-y-2">
          @for (item of items; track item; let i = $index) {
            <li class="item flex items-center gap-2.5 text-[12.5px] text-text-body" [style.--i]="i">
              <span class="tick flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-xs border border-border-field">
                <app-icon name="check" [size]="12" />
              </span>
              {{ item }}
            </li>
          }
        </ul>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .card { background: #fff; border-radius: var(--radius-tile); box-shadow: var(--shadow-e3); }
    /* Arco de medio punto, como los de Antigua: la forma propia de la marca. */
    .arch { border-radius: 999px 999px 18px 18px / 46% 46% 18px 18px; box-shadow: 0 30px 60px -30px rgba(0, 56, 65, 0.45); }

    /* Entrada de las tarjetas */
    .card { opacity: 0; transform: translateY(14px); transition: opacity 600ms var(--ease-enter), transform 700ms var(--ease-enter); }
    .is-in .task { opacity: 1; transform: none; transition-delay: 250ms; }
    .is-in .list { opacity: 1; transform: none; transition-delay: 450ms; }

    /* Checklist que se completa: 9/12 → 12/12 */
    .bar { width: 75%; transition: width 1100ms var(--ease-standard) 900ms; }
    .is-in .bar { width: 100%; }
    /* --n es un entero registrado con @property (styles.css): se interpola 9 → 12 */
    .count { --n: 9; counter-reset: n var(--n); transition: --n 1100ms linear 900ms; }
    .is-in .count { --n: 12; }
    .count::after { content: counter(n); }
    .tick { color: transparent; transition: background-color 250ms var(--ease-standard), border-color 250ms, color 250ms; }
    .is-in .tick { background: var(--color-success); border-color: var(--color-success); color: #fff;
      transition-delay: calc(900ms + var(--i) * 360ms); }
    .badge { opacity: 0; transform: scale(0.6); }
    .is-in .badge { opacity: 1; transform: none; animation: argos-pop var(--spring-bounce-dur) var(--spring-bounce) 2100ms both; }

    @media (prefers-reduced-motion: reduce) {
      .card, .bar, .tick { transition: none; }
      .card { opacity: 1; transform: none; }
      .bar { width: 100%; }
      .count, .is-in .count { --n: 12; transition: none; }
      .tick { background: var(--color-success); border-color: var(--color-success); color: #fff; }
      .badge, .is-in .badge { opacity: 1; transform: none; animation: none; }
    }
  `,
})
export class HeroVisualComponent {
  protected readonly photo = PHOTOS.lakeRoom;
  protected readonly items = ['Ropa de cama cambiada', 'Amenidades repuestas', 'Fotos de cierre'];
}
