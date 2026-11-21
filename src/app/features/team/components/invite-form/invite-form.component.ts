import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { ApiError } from '../../../../core/http/api-error';
import { RoleKey } from '../../../../core/auth/permissions';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InviteDraft, PropertyOption, Role } from '../../models/team.model';
import { RolePickerComponent } from '../role-picker/role-picker.component';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Formulario "Invitar" (W-O2): correo, rol, propiedades (solo para roles con
 * alcance por asignación) y mensaje opcional. El invitado define su
 * contraseña al aceptar desde el correo.
 */
@Component({
  selector: 'app-invite-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormFieldComponent, InputComponent, ButtonComponent, IconComponent, RolePickerComponent],
  template: `
    <form novalidate class="flex min-h-full flex-col" (submit)="submit($event)">
      <div class="px-6 pb-2 pt-7">
        <div class="text-[11px] uppercase tracking-[1.6px] text-secondary">Colaboradores</div>
        <h2 class="mt-1 font-display text-[30px] font-semibold leading-tight tracking-display text-primary">Invitar a alguien</h2>
        <p class="mt-1 text-[13px] leading-relaxed text-text-body">
          Recibirá un correo con un enlace para crear su contraseña. La invitación vence en 7 días.
        </p>
      </div>

      <div class="flex flex-1 flex-col gap-6 px-6 py-6">
        <app-form-field label="Correo electrónico" for="inv-email" [required]="true" [error]="emailError()">
          <app-input
            inputId="inv-email"
            type="email"
            icon="mail"
            [compact]="true"
            placeholder="nombre@empresa.com"
            autocomplete="off"
            [invalid]="!!emailError()"
            [value]="email()"
            (valueChange)="email.set($event); serverDismissed.set(true)"
            (blurred)="touched.set(true)"
          />
        </app-form-field>

        <div>
          <div class="mb-2 text-[10.5px] uppercase tracking-[1px] text-text-secondary">Rol <span class="text-secondary">*</span></div>
          <app-role-picker [roles]="roles()" [(value)]="role" label="Rol de la persona invitada" />
        </div>

        @if (scoped()) {
          <div class="reveal-soft">
            <div class="mb-2 flex items-baseline justify-between">
              <span class="text-[10.5px] uppercase tracking-[1px] text-text-secondary">Propiedades asignadas</span>
              <span class="text-[11.5px] text-text-secondary">{{ selected().size }} de {{ properties().length }}</span>
            </div>
            <p class="mb-3 text-[11.5px] leading-snug text-text-body">Este rol solo ve las propiedades que le asignes. Puedes cambiarlas después.</p>
            <div class="flex flex-wrap gap-2">
              @for (p of properties(); track p.id) {
                <button
                  type="button"
                  class="pchip press flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-[12px]"
                  [class.is-on]="selected().has(p.id)"
                  [attr.aria-pressed]="selected().has(p.id)"
                  (click)="toggle(p.id)"
                >
                  @if (selected().has(p.id)) {
                    <app-icon name="check" [size]="13" />
                  }
                  <span class="font-mono text-[11px] font-bold">{{ p.code }}</span>
                  <span class="hidden sm:inline">{{ p.name }}</span>
                </button>
              }
            </div>
          </div>
        }

        <app-form-field label="Mensaje" for="inv-msg" [optional]="true">
          <textarea
            id="inv-msg"
            rows="3"
            maxlength="280"
            class="ta w-full resize-none rounded-field border bg-surface px-4 py-3 text-[13.5px] text-primary outline-none placeholder:text-text-muted"
            placeholder="Unas palabras de bienvenida (aparecen en el correo)"
            [value]="message()"
            (input)="message.set($any($event.target).value)"
          ></textarea>
        </app-form-field>

        @if (serverError() && !serverError()!.field('email')) {
          <p class="flex items-start gap-2 rounded-sm bg-danger-soft px-3.5 py-2.5 text-[12.5px] text-danger" role="alert">
            <app-icon name="alert" [size]="15" class="mt-px" /> {{ serverError()!.detail }}
          </p>
        }
      </div>

      <div class="material-glass sticky bottom-0 flex justify-end gap-2.5 border-t border-divider px-6 py-4">
        <app-button variant="tertiary" (pressed)="cancel.emit()">Cancelar</app-button>
        <app-button variant="primary" type="submit" [loading]="saving()">
          @if (!saving()) {
            <app-icon name="send" [size]="16" />
          }
          {{ saving() ? 'Enviando…' : 'Enviar invitación' }}
        </app-button>
      </div>
    </form>
  `,
  styles: `
    :host { display: block; min-height: 100%; }
    .pchip { border-color: var(--color-border-field); background: var(--color-surface); color: var(--color-text-body);
      transition: background-color var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast); }
    .pchip:hover { border-color: var(--color-disabled); }
    .pchip.is-on { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .ta { border-color: var(--color-border-field); transition: border-color var(--dur-fast), box-shadow var(--dur-base); }
    .ta:focus { border-color: var(--color-secondary); box-shadow: 0 0 0 4px rgba(197,135,60,.14); }
  `,
})
export class InviteFormComponent {
  readonly roles = input.required<readonly Role[]>();
  readonly properties = input.required<readonly PropertyOption[]>();
  readonly saving = input<boolean>(false);
  readonly serverError = input<ApiError | null>(null);

  readonly submitted = output<InviteDraft>();
  readonly cancel = output<void>();

  protected readonly email = signal('');
  protected readonly role = signal<string>('cleaner');
  protected readonly message = signal('');
  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly touched = signal(false);
  protected readonly serverDismissed = signal(false);

  constructor() {
    effect(() => {
      this.serverError();
      untracked(() => this.serverDismissed.set(false));
    });
  }

  protected readonly scoped = computed(() => this.roles().find((r) => r.key === this.role())?.scoped ?? false);

  protected readonly emailError = computed(() => {
    const server = this.serverError()?.field('email');
    if (server && !this.serverDismissed()) return server;
    if (!this.touched()) return null;
    const v = this.email().trim();
    if (!v) return 'Escribe el correo de la persona.';
    return EMAIL_RE.test(v) ? null : 'Revisa el correo: falta algo como nombre@empresa.com.';
  });

  protected toggle(id: string): void {
    this.selected.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected submit(e: Event): void {
    e.preventDefault();
    this.touched.set(true);
    if (this.emailError()) return;
    this.submitted.emit({
      email: this.email().trim().toLowerCase(),
      role_key: this.role() as RoleKey,
      property_ids: this.scoped() ? [...this.selected()] : [],
      message: this.message().trim() || null,
    });
  }
}
