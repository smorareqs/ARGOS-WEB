import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { toApiError } from '../../../../core/http/api-error';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { LogoComponent } from '../../../../shared/atoms/logo/logo.component';
import { DemoApi, FleetSize } from '../../services/demo-api.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Formulario "Solicitar una demo" (panel lateral de la landing). */
@Component({
  selector: 'app-demo-request',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormFieldComponent, SegmentedComponent, InputComponent, ButtonComponent, IconComponent, LogoComponent],
  template: `
    @if (!sent()) {
      <form novalidate class="flex min-h-full flex-col" (submit)="submit($event)">
        <div class="px-6 pb-2 pt-8">
          <app-logo [size]="16" [intro]="true" />
          <h2 class="mt-6 font-display text-[30px] font-semibold leading-tight tracking-display text-primary">Solicita una demo</h2>
          <p class="mt-1.5 text-[13px] leading-relaxed text-text-body">
            Te mostramos ARGOS con datos como los de tu operación y preparamos el espacio de tu empresa.
          </p>
        </div>
        <div class="flex flex-1 flex-col gap-5 px-6 py-6">
          <app-form-field label="Tu nombre" for="dm-name" [required]="true" [error]="err('name')">
            <app-input inputId="dm-name" [compact]="true" autocomplete="name" placeholder="Nombre y apellido"
              [invalid]="!!err('name')" [(value)]="name" (blurred)="touch('name')" />
          </app-form-field>
          <app-form-field label="Empresa" for="dm-company" [required]="true" [error]="err('company')">
            <app-input inputId="dm-company" icon="building" [compact]="true" autocomplete="organization" placeholder="Nombre de tu empresa"
              [invalid]="!!err('company')" [(value)]="company" (blurred)="touch('company')" />
          </app-form-field>
          <app-form-field label="Correo de trabajo" for="dm-email" [required]="true" [error]="err('email')">
            <app-input inputId="dm-email" type="email" icon="mail" [compact]="true" autocomplete="email" placeholder="nombre@empresa.com"
              [invalid]="!!err('email')" [(value)]="email" (blurred)="touch('email')" />
          </app-form-field>
          <app-form-field label="Teléfono" for="dm-phone" [optional]="true">
            <app-input inputId="dm-phone" type="tel" icon="phone" [compact]="true" autocomplete="tel" placeholder="+502 5555 0000" [(value)]="phone" />
          </app-form-field>
          <app-form-field label="¿Cuántas propiedades administran?">
            <app-segmented class="w-full" [options]="sizes" [(value)]="fleet" ariaLabel="Número de propiedades" />
          </app-form-field>
          @if (error()) {
            <p class="flex items-start gap-2 rounded-sm bg-danger-soft px-3.5 py-2.5 text-[12.5px] text-danger" role="alert">
              <app-icon name="alert" [size]="15" class="mt-px" /> {{ error() }}
            </p>
          }
        </div>
        <div class="material-glass sticky bottom-0 flex justify-end gap-2.5 border-t border-divider px-6 py-4">
          <app-button variant="tertiary" (pressed)="closed.emit()">Cancelar</app-button>
          <app-button variant="primary" type="submit" [loading]="saving()">{{ saving() ? 'Enviando…' : 'Solicitar demo' }}</app-button>
        </div>
      </form>
    } @else {
      <div class="flex min-h-full flex-col items-center justify-center px-8 py-16 text-center">
        <div class="ok flex h-20 w-20 items-center justify-center rounded-pill bg-success-soft text-success">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path class="tick" d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <h2 class="mt-6 font-display text-[30px] font-semibold leading-tight tracking-display text-primary">¡Gracias, {{ firstName() }}!</h2>
        <p class="mt-2 max-w-[340px] text-[14px] leading-relaxed text-text-body">
          Recibimos tu solicitud para <b class="text-primary">{{ company().trim() }}</b>. Te escribiremos a
          <b class="text-primary">{{ email().trim() }}</b> para agendar la demo.
        </p>
        <app-button class="mt-8" variant="secondary" (pressed)="closed.emit()">Volver al sitio</app-button>
      </div>
    }
  `,
  styles: `
    :host { display: block; min-height: 100%; }
    .ok { animation: argos-pop var(--spring-bounce-dur) var(--spring-bounce) both; }
    .tick { stroke-dasharray: 24; animation: draw 500ms var(--ease-enter) 200ms both; }
    @keyframes draw { from { stroke-dashoffset: 24; } }
  `,
})
export class DemoRequestComponent {
  private readonly api = inject(DemoApi);
  readonly closed = output<void>();

  protected readonly name = signal('');
  protected readonly company = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly fleet = signal<string>('11-50');
  protected readonly saving = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly touched = signal<Record<string, boolean>>({});

  protected readonly sizes = [
    { value: '1-10', label: '1–10' },
    { value: '11-50', label: '11–50' },
    { value: '51-200', label: '51–200' },
    { value: '200+', label: '200+' },
  ];

  protected readonly firstName = computed(() => this.name().trim().split(/\s+/)[0] ?? '');

  protected err(field: 'name' | 'company' | 'email'): string | null {
    if (!this.touched()[field]) return null;
    if (field === 'name') return this.name().trim().length >= 2 ? null : 'Escribe tu nombre.';
    if (field === 'company') return this.company().trim().length >= 2 ? null : 'Escribe el nombre de tu empresa.';
    return EMAIL_RE.test(this.email().trim()) ? null : 'Escribe un correo válido, como nombre@empresa.com.';
  }

  protected touch(field: string): void {
    this.touched.update((t) => ({ ...t, [field]: true }));
  }

  protected async submit(e: Event): Promise<void> {
    e.preventDefault();
    this.touched.set({ name: true, company: true, email: true });
    if (this.err('name') || this.err('company') || this.err('email')) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.api.request({
        full_name: this.name().trim(),
        company: this.company().trim(),
        email: this.email().trim().toLowerCase(),
        phone: this.phone().trim() || null,
        properties: this.fleet() as FleetSize,
      });
      this.sent.set(true);
    } catch (err) {
      this.error.set(toApiError(err).detail);
    } finally {
      this.saving.set(false);
    }
  }
}
