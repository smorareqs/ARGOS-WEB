import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SoonSection } from '../../coming-soon.sections';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';

/** Screen · sección planificada: qué traerá y en qué fase. */
@Component({
  selector: 'app-coming-soon-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, PageHeaderComponent],
  template: `
    @let s = section();
    <app-page-header [title]="s.title" [eyebrow]="'Fase ' + s.phase + ' · en camino'" [subtitle]="s.summary" />

    <div class="mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div class="reveal relative overflow-hidden rounded-hero bg-primary p-8 text-white" style="--i: 1">
        <div class="orbit pointer-events-none absolute -right-16 -top-16 h-[320px] w-[320px] rounded-pill border border-white/[0.07]"></div>
        <div class="orbit slow pointer-events-none absolute -right-2 top-2 h-[190px] w-[190px] rounded-pill border border-white/[0.09]"></div>
        <div class="relative flex h-14 w-14 items-center justify-center rounded-tile bg-white/10 text-secondary-light">
          <app-icon [name]="s.icon" [size]="28" />
        </div>
        <h2 class="relative mt-6 font-display text-[28px] font-semibold leading-tight">Lo que verás aquí</h2>
        <ul class="relative mt-4 flex flex-col gap-3">
          @for (b of s.bullets; track b; let i = $index) {
            <li class="reveal flex items-center gap-3 text-[14px] text-white/80" [style.--i]="i + 2">
              <span class="h-1.5 w-1.5 rounded-pill bg-secondary"></span>{{ b }}
            </li>
          }
        </ul>
      </div>
      <div class="reveal flex flex-col justify-between rounded-hero border border-border-card bg-surface p-8 shadow-e1" style="--i: 2">
        <div>
          <div class="text-[10.5px] uppercase tracking-[1px] text-text-secondary">Plan de trabajo</div>
          <p class="mt-3 text-[14px] leading-relaxed text-text-body">
            Esta sección se construye en la fase {{ s.phase }} del plan del portal web. La navegación
            ya la muestra para que el mapa completo del producto sea visible desde ahora.
          </p>
        </div>
        <a
          routerLink="/inicio"
          class="press mt-6 inline-flex w-fit items-center gap-2 rounded-field bg-primary px-5 py-3 text-[13.5px] font-bold text-white"
        >
          Volver a inicio <app-icon name="arrow-right" [size]="16" />
        </a>
      </div>
    </div>
  `,
  styles: `
    .orbit { animation: orbit 40s linear infinite; }
    .orbit.slow { animation-duration: 26s; animation-direction: reverse; }
    .orbit::after { content: ""; position: absolute; top: 50%; left: -4px; width: 8px; height: 8px;
      border-radius: 99px; background: var(--color-secondary); }
    @keyframes orbit { to { transform: rotate(360deg); } }
  `,
})
export class ComingSoonComponent {
  /** Llega por `data.section` gracias a withComponentInputBinding. */
  readonly section = input.required<SoonSection>();
}
