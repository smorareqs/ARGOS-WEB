import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BillingApi } from '../../services/billing-api.service';
import { ApiKey } from '../../models/billing.model';
import { toApiError } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { API_BASE_URL } from '../../../../core/tokens/api.tokens';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';

/**
 * Integraciones (fase06.md §4.1): claves API para que el sitio web de la
 * empresa mande reservas a ARGOS. La clave completa se muestra una sola vez.
 */
@Component({
  selector: 'app-api-keys-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, BadgeComponent, ButtonComponent, IconComponent, InputComponent, FormFieldComponent, EmptyStateComponent],
  template: `
    <div class="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
      <section class="rounded-card border border-border-card bg-surface shadow-e1">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-4">
          <div>
            <h2 class="text-[13px] font-bold text-primary">Claves API</h2>
            <p class="text-[12px] text-text-secondary">Una por sitio o sistema que manda reservas. Revócala si se filtra.</p>
          </div>
        </div>
        @if (created(); as k) {
          <div class="m-5 rounded-card border border-secondary/40 bg-secondary-light/30 p-4">
            <p class="text-[12.5px] font-bold text-primary">Copia la clave de «{{ k.name }}» ahora: no se vuelve a mostrar.</p>
            <div class="mt-2 flex items-center gap-2">
              <code class="min-w-0 flex-1 truncate rounded-[8px] bg-surface px-3 py-2 font-mono text-[12.5px] text-primary">{{ k.key }}</code>
              <app-button variant="secondary" size="sm" (pressed)="copy(k.key)"><app-icon name="copy" [size]="15" /> Copiar</app-button>
            </div>
            <button type="button" class="mt-2 text-[12px] text-text-secondary underline" (click)="created.set(null)">Ya la guardé</button>
          </div>
        }
        @if (error(); as err) {
          <app-empty-state kind="error" title="No pudimos cargar las claves" [message]="err" />
        } @else if (keys(); as list) {
          @if (list.length) {
            <ul class="divide-y divide-divider">
              @for (k of list; track k.id) {
                <li class="flex flex-wrap items-center gap-3 px-5 py-3.5" [class.opacity-60]="k.revoked_at">
                  <app-icon name="key" [size]="18" class="text-secondary" />
                  <div class="min-w-0 flex-1">
                    <div class="text-[13px] font-bold text-primary">{{ k.name }}</div>
                    <div class="text-[12px] text-text-secondary"><span class="font-mono">{{ k.prefix }}…</span> · creada {{ k.created_at | date: 'd MMM y' }}{{ k.created_by_name ? ' por ' + k.created_by_name : '' }}</div>
                  </div>
                  <span class="text-[12px] text-text-secondary">{{ k.last_used_at ? 'Último uso ' + (k.last_used_at | date: "d MMM, HH:mm") : 'Sin usar' }}</span>
                  @if (k.revoked_at) {
                    <app-badge size="sm" tone="muted">Revocada</app-badge>
                  } @else {
                    <app-button variant="ghost" size="sm" [loading]="busy() === k.id" (pressed)="revoke(k)">Revocar</app-button>
                  }
                </li>
              }
            </ul>
          } @else {
            <app-empty-state kind="soon" title="Sin claves todavía" message="Crea una para conectar el sitio web de tu empresa: sus reservas entran por confirmar." />
          }
        } @else {
          <div class="skeleton m-5 h-[160px] !rounded-card"></div>
        }
      </section>
      <aside class="space-y-4">
        <form class="rounded-card border border-border-card bg-surface p-5 shadow-e1" novalidate (submit)="$event.preventDefault(); create()">
          <h3 class="text-[13px] font-bold text-primary">Nueva clave</h3>
          <div class="mt-3">
            <app-form-field label="Dónde se usa" for="ak-name" [error]="nameError()">
              <app-input inputId="ak-name" placeholder="Sitio web garrent.gt" [maxlength]="64" [value]="name()" (valueChange)="name.set($event)" />
            </app-form-field>
          </div>
          <div class="mt-3"><app-button type="submit" [full]="true" [loading]="busy() === 'create'">Crear clave</app-button></div>
        </form>
        <div class="rounded-card bg-surface-soft p-5 text-[12.5px] leading-[1.6] text-text-body">
          <h3 class="font-bold text-primary">Cómo la usa el sitio</h3>
          <p class="mt-1">Envía cada reserva a <code class="font-mono text-[11.5px]">POST {{ endpoint }}</code> con la cabecera <code class="font-mono text-[11.5px]">X-Api-Key</code>. Llega <b>por confirmar</b> al canal Directo y te avisamos por correo.</p>
          <p class="mt-2 text-text-secondary">Máximo 60 por minuto por clave. Contrato completo en la documentación de la API.</p>
        </div>
      </aside>
    </div>
  `,
})
export class ApiKeysPanelComponent {
  private readonly api = inject(BillingApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly endpoint = `${inject(API_BASE_URL)}/api/v1/public/reservations`;
  protected readonly keys = signal<readonly ApiKey[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);
  protected readonly name = signal('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly created = signal<{ readonly name: string; readonly key: string } | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.keys.set(await this.api.apiKeys());
    } catch (e) {
      this.error.set(toApiError(e).detail);
    }
  }

  protected async create(): Promise<void> {
    const name = this.name().trim();
    if (name.length < 2) {
      this.nameError.set('Ponle un nombre que diga dónde se usa.');
      return;
    }
    this.nameError.set(null);
    this.busy.set('create');
    try {
      const k = await this.api.createApiKey(name);
      this.created.set({ name: k.name, key: k.key });
      this.keys.update((l) => [k, ...(l ?? [])]);
      this.name.set('');
    } catch (e) {
      const err = toApiError(e);
      this.nameError.set(err.errors[0]?.message ?? err.detail);
    } finally {
      this.busy.set(null);
    }
  }

  protected async revoke(k: ApiKey): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Revocar «${k.name}»`,
      message: 'Deja de funcionar al momento: el sitio que la usa ya no podrá mandar reservas hasta que le pongas una nueva.',
      confirmLabel: 'Revocar',
      tone: 'danger',
    });
    if (!ok) return;
    this.busy.set(k.id);
    try {
      const r = await this.api.revokeApiKey(k.id);
      this.keys.update((l) => (l ?? []).map((x) => (x.id === r.id ? r : x)));
      this.toast.show(`Revocaste «${k.name}».`);
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    } finally {
      this.busy.set(null);
    }
  }

  protected async copy(key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(key);
      this.toast.success('Clave copiada.');
    } catch {
      this.toast.error('No pudimos copiar: selecciónala y cópiala a mano.');
    }
  }
}
