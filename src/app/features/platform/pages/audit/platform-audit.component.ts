import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { toApiError } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/services/toast.service';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent, IconName } from '../../../../shared/atoms/icon/icon.component';
import { SelectComponent, SelectOption } from '../../../../shared/atoms/select/select.component';
import { SpinnerComponent } from '../../../../shared/atoms/spinner/spinner.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { SegmentOption, SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { PlatformApi, PlatformAuditEntry, PlatformTenant } from '../../services/platform-api.service';

const PAGE = 100;

const ACTIONS: Record<string, { readonly label: string; readonly icon: IconName; readonly tone: string }> = {
  'tenant.created': { label: 'Alta de empresa', icon: 'plus', tone: 'bg-success-soft text-success' },
  'tenant.updated': { label: 'Cambio de empresa', icon: 'settings', tone: 'bg-info-soft text-primary' },
  'tenant.suspended': { label: 'Empresa suspendida', icon: 'ban', tone: 'bg-warning-soft text-warning' },
  'tenant.reactivated': { label: 'Empresa reactivada', icon: 'refresh', tone: 'bg-success-soft text-success' },
};

/**
 * Screen · Bitácora de la plataforma (W-P4): quién dio de alta, cambió,
 * suspendió o reactivó cada empresa, desde qué IP y con qué datos. Solo
 * inserciones (fase01.md §3.3 platform_audit_log).
 */
@Component({
  selector: 'app-platform-audit-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, JsonPipe, PageHeaderComponent, ButtonComponent, IconComponent, SelectComponent, SpinnerComponent, EmptyStateComponent, SegmentedComponent],
  template: `
    <app-page-header eyebrow="Administración ARGOS" title="Bitácora de plataforma" subtitle="Cada cambio sobre las empresas, con quién lo hizo y cuándo." />

    <div class="mb-5 mt-6 flex flex-wrap items-center gap-3">
      <div class="w-full sm:w-[260px]">
        <app-select [options]="tenantOptions()" [value]="tenant()" (valueChange)="setTenant($event)" ariaLabel="Empresa" />
      </div>
      <app-segmented [options]="kinds" [value]="kind()" (valueChange)="setKind($event)" ariaLabel="Tipo de acción" [compact]="true" />
    </div>

    @if (loading() && !entries().length) {
      <div class="flex items-center gap-3 py-16 text-[13px] text-text-secondary"><app-spinner [size]="18" /> Cargando la bitácora…</div>
    } @else if (!entries().length) {
      <app-empty-state kind="done" title="Sin registros con ese filtro" message="Las altas, cambios y suspensiones de empresas aparecen aquí." />
    } @else {
      <ol class="overflow-hidden rounded-card border border-border-card bg-surface shadow-e1">
        @for (e of entries(); track e.id) {
          <li class="border-b border-divider last:border-0">
            <button type="button" class="row flex w-full items-start gap-4 px-5 py-4 text-left" [attr.aria-expanded]="open() === e.id" (click)="toggle(e.id)">
              <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-tile" [class]="meta(e).tone">
                <app-icon [name]="meta(e).icon" [size]="17" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-baseline gap-x-2">
                  <span class="text-[13.5px] font-bold text-primary">{{ meta(e).label }}</span>
                  <span class="text-[13px] text-text-body">{{ e.tenant_name ?? 'Empresa eliminada' }}</span>
                </span>
                <span class="block truncate text-[12px] text-text-secondary">
                  {{ e.actor_name ?? 'Sistema' }}@if (e.ip) { · {{ e.ip }} } · {{ summary(e) }}
                </span>
              </span>
              <span class="tabular shrink-0 text-right text-[12px] text-text-secondary">
                {{ e.created_at | date: "d MMM, HH:mm" }}
              </span>
            </button>
            @if (open() === e.id) {
              <pre class="reveal-soft mx-5 mb-4 overflow-x-auto rounded-field bg-background p-3 font-mono text-[11.5px] leading-relaxed text-text-body">{{ e.metadata | json }}</pre>
            }
          </li>
        }
      </ol>
      @if (more()) {
        <div class="mt-4 flex justify-center">
          <app-button variant="tertiary" [loading]="loading()" (pressed)="next()">Ver más</app-button>
        </div>
      }
    }
  `,
  styles: `
    :host { display: block; }
    .row { transition: background-color var(--dur-fast); }
    .row:hover { background: color-mix(in srgb, var(--color-background) 60%, white); }
  `,
})
export class PlatformAuditComponent {
  private readonly api = inject(PlatformApi);
  private readonly toast = inject(ToastService);

  protected readonly kinds: readonly SegmentOption[] = [
    { value: '', label: 'Todo' },
    { value: 'tenant.created', label: 'Altas' },
    { value: 'tenant.suspended', label: 'Suspensiones' },
    { value: 'tenant.updated', label: 'Cambios' },
  ];
  protected readonly entries = signal<readonly PlatformAuditEntry[]>([]);
  protected readonly tenants = signal<readonly PlatformTenant[]>([]);
  protected readonly loading = signal(true);
  protected readonly more = signal(false);
  protected readonly open = signal<string | null>(null);
  protected readonly tenant = signal('');
  protected readonly kind = signal('');

  protected readonly tenantOptions = computed<SelectOption[]>(() => [
    { value: '', label: 'Todas las empresas' },
    ...this.tenants().map((t) => ({ value: t.id, label: t.name })),
  ]);

  constructor() {
    void this.load(true);
    this.api.tenants().then((list) => this.tenants.set(list), () => undefined);
  }

  protected meta(e: PlatformAuditEntry) {
    return ACTIONS[e.action] ?? { label: e.action, icon: 'logbook' as IconName, tone: 'bg-background text-primary' };
  }

  protected summary(e: PlatformAuditEntry): string {
    const m = e.metadata as Record<string, unknown>;
    if (e.action === 'tenant.created') {
      const admin = m['admin_email'] as string | undefined;
      const how = m['admin'] === 'invited' ? 'invitación enviada' : 'ya tenía cuenta';
      return admin ? `Administración: ${admin} (${how})` : 'Sin persona administradora';
    }
    const before = m['before'] as Record<string, unknown> | undefined;
    const after = m['after'] as Record<string, unknown> | undefined;
    if (before && after) {
      const changes: string[] = [];
      if (before['name'] !== after['name']) changes.push(`nombre: ${after['name']}`);
      if (JSON.stringify(before['features']) !== JSON.stringify(after['features'])) changes.push('módulos');
      if (before['is_active'] !== after['is_active']) changes.push(after['is_active'] ? 'activada' : 'suspendida');
      return changes.length ? changes.join(' · ') : 'Sin cambios visibles';
    }
    return 'Ver detalle';
  }

  protected toggle(id: string): void {
    this.open.set(this.open() === id ? null : id);
  }

  protected setTenant(id: string): void {
    this.tenant.set(id);
    void this.load(true);
  }

  protected setKind(kind: string): void {
    this.kind.set(kind);
    void this.load(true);
  }

  protected next(): void {
    void this.load(false);
  }

  private async load(reset: boolean): Promise<void> {
    this.loading.set(true);
    try {
      const page = await this.api.audit({
        tenant_id: this.tenant() || undefined,
        action: this.kind() || undefined,
        limit: PAGE,
        offset: reset ? 0 : this.entries().length,
      });
      this.entries.set(reset ? page.items : [...this.entries(), ...page.items]);
      this.more.set(page.items.length === PAGE);
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    } finally {
      this.loading.set(false);
    }
  }
}
