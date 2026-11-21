import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type EmptyKind = 'properties' | 'search' | 'team' | 'error' | 'soon' | 'done';

/**
 * Molécula · estado vacío (ux-ui.md §2.4 y §3.1): ilustración de trazo teal
 * sobre teal lavado (máx. 120 px), título, una frase y una acción opcional.
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reveal mx-auto flex max-w-[380px] flex-col items-center px-6 py-12 text-center">
      <div class="mb-5 flex h-[112px] w-[112px] items-center justify-center rounded-pill bg-teal-washed">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
          @switch (kind()) {
            @case ('properties') {
              <path d="M14 58V30l22-14 22 14v28" stroke="#003841" stroke-width="2.2" stroke-linejoin="round" />
              <path d="M8 58h56" stroke="#003841" stroke-width="2.2" stroke-linecap="round" />
              <rect x="29" y="40" width="14" height="18" rx="1.5" stroke="#003841" stroke-width="2.2" />
              <circle cx="36" cy="30" r="3.5" fill="#C5873C" />
            }
            @case ('search') {
              <circle cx="32" cy="32" r="15" stroke="#003841" stroke-width="2.2" />
              <path d="M43 43l13 13" stroke="#003841" stroke-width="2.6" stroke-linecap="round" />
              <path d="M26 32h12" stroke="#C5873C" stroke-width="2.2" stroke-linecap="round" />
            }
            @case ('team') {
              <circle cx="28" cy="27" r="8" stroke="#003841" stroke-width="2.2" />
              <path d="M14 54c0-8 6-14 14-14s14 6 14 14" stroke="#003841" stroke-width="2.2" stroke-linecap="round" />
              <circle cx="49" cy="31" r="6" stroke="#C5873C" stroke-width="2.2" />
              <path d="M45 42c6 0 11 5 11 12" stroke="#C5873C" stroke-width="2.2" stroke-linecap="round" />
            }
            @case ('error') {
              <path d="M36 14l24 42H12z" stroke="#003841" stroke-width="2.2" stroke-linejoin="round" />
              <path d="M36 30v12" stroke="#892F26" stroke-width="2.6" stroke-linecap="round" />
              <circle cx="36" cy="48" r="1.8" fill="#892F26" />
            }
            @case ('done') {
              <circle cx="36" cy="36" r="20" stroke="#003841" stroke-width="2.2" />
              <path d="M27 36.5l6 6 12-13" stroke="#C5873C" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
            }
            @default {
              <circle cx="36" cy="36" r="20" stroke="#003841" stroke-width="2.2" />
              <circle cx="36" cy="36" r="7" fill="#C5873C" />
              <path d="M36 10v6M36 56v6M10 36h6M56 36h6" stroke="#003841" stroke-width="2.2" stroke-linecap="round" />
            }
          }
        </svg>
      </div>
      <h3 class="font-display text-[22px] font-semibold leading-tight text-primary">{{ title() }}</h3>
      <p class="mt-2 text-[13.5px] leading-relaxed text-text-body">{{ message() }}</p>
      <div class="mt-5 flex flex-wrap justify-center gap-2.5"><ng-content /></div>
    </div>
  `,
  styles: `:host { display: block; }`,
})
export class EmptyStateComponent {
  readonly kind = input<EmptyKind>('soon');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
}
