import { ChangeDetectionStrategy, Component, Injectable, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuditApi, AuditRecord, auditPhrase, deviceOf } from '../../../../core/http/audit-api';
import { toApiError } from '../../../../core/http/api-error';
import { initials } from '../../../../core/store/session.store';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { FilterChipsComponent } from '../../../../shared/molecules/filter-chips/filter-chips.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { downloadCsv } from '../../../../shared/utils/csv';
import { dayKey } from '../../../../shared/utils/time';

/** Etiqueta de cada entidad en los chips (las que no estén aquí van a "Otros"). */
const ENTITY_LABEL: Record<string, string> = {
  property: 'Propiedades',
  building: 'Edificios',
  checklist_template: 'Checklists',
  employee: 'Fichas laborales',
  membership: 'Colaboradores',
  user: 'Personas',
  invitation: 'Invitaciones',
  role: 'Roles',
  tenant: 'Empresa',
  maintenance_ticket: 'Incidencias',
  asset: 'Activos',
  maintenance_plan: 'Preventivos',
  vendor: 'Proveedores',
  alert: 'Alertas',
  reservation: 'Reservas',
  guest: 'Huéspedes',
  booking_channel: 'Canales',
  ical_feed: 'Calendarios iCal',
  payroll_period: 'Nómina',
  payroll_entry: 'Nómina',
  payroll_settings: 'Nómina',
  disciplinary_action: 'Disciplina',
};

/** Fila lista para mostrar: la del backend más su frase y su dispositivo. */
interface AuditRow extends AuditRecord {
  readonly actor: string;
  readonly summary: string;
  readonly device: string;
}

/** Tienda de Bitácora (W-N1): solo lectura, por rango de fechas. */
@Injectable()
export class AuditStore {
  private readonly api = inject(AuditApi);
  private readonly _items = signal<readonly AuditRow[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _truncated = signal(false);
  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  /** Hay más filas que las que trajimos (el rango es muy amplio). */
  readonly truncated = this._truncated.asReadonly();

  /** Carga [from, to] en días locales (AAAA-MM-DD, ambos incluidos). */
  async load(from: string, to: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    const max = 2000;
    try {
      const end = new Date(`${to}T00:00:00`);
      end.setDate(end.getDate() + 1);
      const rows = await this.api.all({ from: new Date(`${from}T00:00:00`).toISOString(), to: end.toISOString() }, max);
      this._truncated.set(rows.length >= max);
      this._items.set(
        rows.map((r) => ({ ...r, actor: r.actor_name ?? 'Sistema', summary: auditPhrase(r), device: deviceOf(r.user_agent) })),
      );
    } catch (err) {
      this._error.set(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }
}

/**
 * Screen · Bitácora (W-N1): quién hizo qué, cuándo y desde dónde. Filas
 * agrupadas por día; cada una se expande para ver el antes y el después de
 * los campos que cambiaron. Exporta lo filtrado a CSV. Lee `GET /audit`.
 */
@Component({
  selector: 'app-audit-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, JsonPipe, PageHeaderComponent, DemoDataNoteComponent, FilterChipsComponent, EmptyStateComponent, ButtonComponent, IconComponent, InputComponent, SelectComponent, AvatarComponent],
  providers: [AuditStore],
  template: `
    <app-page-header title="Bitácora" eyebrow="Control" subtitle="Cada cambio y cada consulta de datos sensibles, con quién, cuándo y desde dónde.">
      <app-button variant="tertiary" [disabled]="!filtered().length" (pressed)="exportCsv()"><app-icon name="arrow-up-right" [size]="16" /> Exportar CSV</app-button>
    </app-page-header>
    <app-demo-data-note module="audit" label="Bitácora" />

    <div class="toolbar-glass sticky top-16 z-20 -mx-2 rounded-card px-2 py-2.5">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
        <app-input class="min-w-0 flex-1" type="search" icon="search" [compact]="true" placeholder="Buscar acción, persona o propiedad" ariaLabel="Buscar en la bitácora" [(value)]="search" />
        <app-select class="w-full lg:w-[220px]" [compact]="true" [options]="actorOptions()" [value]="actor() ?? 'all'" (changed)="go({ actor: $event === 'all' ? null : $event })" ariaLabel="Persona" />
        <div class="flex items-center gap-2">
          <input type="date" class="field-native !w-[150px]" aria-label="Desde" [max]="to()" [value]="from()" (change)="go({ desde: $any($event.target).value || null })" />
          <span class="text-text-secondary">–</span>
          <input type="date" class="field-native !w-[150px]" aria-label="Hasta" [min]="from()" [max]="today" [value]="to()" (change)="go({ hasta: $any($event.target).value || null })" />
        </div>
      </div>
      <app-filter-chips class="mt-3 block" [options]="entityChips()" [value]="entidad() ?? 'all'" (valueChange)="go({ entidad: $event === 'all' ? null : $event })" ariaLabel="Entidad" />
    </div>

    <div class="mt-4">
      @if (store.error(); as err) {
        <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="error" title="No pudimos cargar la bitácora" [message]="err" /></div>
      } @else if (store.loading()) {
        <div class="skeleton h-[420px] !rounded-card"></div>
      } @else {
        @for (g of groups(); track g.day) {
          <h2 class="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[1.2px] text-text-secondary first:mt-0">{{ asDate(g.day) | date: 'EEEE d MMMM' }}</h2>
          <ul class="overflow-hidden rounded-card border border-border-card bg-surface shadow-e1">
            @for (e of g.items; track e.id) {
              <li class="border-b border-divider last:border-0">
                <button type="button" class="erow flex w-full items-center gap-3 px-4 py-3 text-left" [attr.aria-expanded]="open() === e.id" (click)="open.set(open() === e.id ? null : e.id)">
                  <span class="tabular w-12 shrink-0 text-[12px] text-text-secondary">{{ e.created_at | date: 'HH:mm' }}</span>
                  <app-avatar [initials]="ini(e.actor)" [name]="e.actor" [size]="28" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-[13px] text-text-body"><b class="text-primary">{{ e.actor }}</b> {{ lower(e.summary) }}</span>
                    <span class="block truncate font-mono text-[11px] text-text-secondary">{{ e.action }}@if (e.property_code && e.entity !== 'property') { · {{ e.property_code }} }</span>
                  </span>
                  <span class="hidden shrink-0 text-right text-[11.5px] text-text-secondary md:block">{{ e.device }}<br /><span class="font-mono">{{ e.ip ?? '—' }}</span></span>
                  <app-icon name="chevron-down" [size]="16" class="chev shrink-0 text-text-muted" [class.is-open]="open() === e.id" />
                </button>
                @if (open() === e.id) {
                  <div class="grid grid-cols-1 gap-3 bg-surface-soft px-4 pb-4 pt-1 md:grid-cols-2">
                    <div>
                      <div class="mb-1.5 text-[10.5px] font-bold uppercase tracking-[1px] text-text-secondary">Antes</div>
                      <pre class="code">{{ e.before ? (e.before | json) : 'Sin datos previos (consulta o alta).' }}</pre>
                    </div>
                    <div>
                      <div class="mb-1.5 text-[10.5px] font-bold uppercase tracking-[1px] text-text-secondary">Después</div>
                      <pre class="code is-after">{{ e.after ? (e.after | json) : '—' }}</pre>
                    </div>
                    <p class="text-[11.5px] text-text-secondary md:col-span-2">
                      {{ e.actor_role ?? 'Sin rol en la empresa' }} · {{ e.device }} · IP {{ e.ip ?? '—' }} · {{ e.created_at | date: 'd MMM y, HH:mm:ss' }}
                    </p>
                  </div>
                }
              </li>
            }
          </ul>
        } @empty {
          <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="search" title="Nada en ese rango" message="Amplía las fechas o quita algún filtro." /></div>
        }
        <p class="mt-4 text-center text-[12px] text-text-secondary">
          {{ filtered().length }} de {{ store.items().length }} registros{{ store.truncated() ? ' (los más recientes; acorta el rango para ver todo)' : '' }}. La bitácora no se puede editar ni borrar.
        </p>
      }
    </div>
  `,
  styles: `
    .erow { transition: background-color var(--dur-fast); }
    .erow:hover { background: var(--color-surface-soft); }
    .chev { transition: transform var(--spring-snappy-dur) var(--spring-snappy); }
    .chev.is-open { transform: rotate(180deg); }
    .code { margin: 0; white-space: pre-wrap; word-break: break-word; border-radius: 8px; border: 1px solid var(--color-border-card); background: #fff; padding: 10px 12px; font-family: var(--font-mono, ui-monospace, monospace); font-size: 11.5px; line-height: 1.55; color: var(--color-text-body); }
    .code.is-after { border-color: color-mix(in srgb, var(--color-success) 35%, white); background: color-mix(in srgb, var(--color-success) 5%, white); }
    @media (prefers-reduced-motion: reduce) { .chev { transition: none; } }
  `,
})
export class AuditComponent {
  protected readonly store = inject(AuditStore);
  private readonly router = inject(Router);

  readonly desde = input<string | undefined>();
  readonly hasta = input<string | undefined>();
  /** Id de la persona (actor_id). */
  readonly actor = input<string | undefined>();
  readonly entidad = input<string | undefined>();

  protected readonly today = dayKey();
  protected readonly from = computed(() => this.desde() ?? dayKey(-13));
  protected readonly to = computed(() => this.hasta() ?? this.today);
  protected readonly search = signal('');
  protected readonly open = signal<string | null>(null);
  protected readonly ini = initials;

  protected readonly actorOptions = computed(() => {
    const people = new Map<string, string>();
    for (const e of this.store.items()) if (e.actor_id) people.set(e.actor_id, e.actor);
    return [
      { value: 'all', label: 'Todas las personas' },
      ...[...people].sort((a, b) => a[1].localeCompare(b[1])).map(([value, label]) => ({ value, label })),
    ];
  });

  private readonly base = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.store
      .items()
      .filter(
        (e) =>
          (!this.actor() || e.actor_id === this.actor()) &&
          (q.length < 2 || `${e.actor} ${e.summary} ${e.action} ${e.entity_label ?? ''} ${e.property_code ?? ''}`.toLowerCase().includes(q)),
      );
  });

  protected readonly entityChips = computed(() => {
    const base = this.base();
    const kinds = [...new Set(base.map((e) => (ENTITY_LABEL[e.entity] ? e.entity : 'other')))];
    return [
      { value: 'all', label: 'Todo', count: base.length },
      ...kinds
        .map((k) => ({ value: k, label: ENTITY_LABEL[k] ?? 'Otros', count: base.filter((e) => this.kindOf(e) === k).length }))
        .sort((a, b) => b.count - a.count),
    ];
  });

  protected readonly filtered = computed(() => this.base().filter((e) => !this.entidad() || this.kindOf(e) === this.entidad()));

  protected readonly groups = computed(() => {
    const map = new Map<string, AuditRow[]>();
    for (const e of this.filtered()) {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map].map(([day, items]) => ({ day, items }));
  });

  constructor() {
    effect(() => {
      const f = this.from();
      const t = this.to();
      untracked(() => void this.store.load(f, t));
    });
  }

  private kindOf(e: AuditRecord): string {
    return ENTITY_LABEL[e.entity] ? e.entity : 'other';
  }

  protected go(params: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected asDate(k: string): Date {
    return new Date(`${k}T12:00:00`);
  }

  protected lower(s: string): string {
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  protected exportCsv(): void {
    downloadCsv(
      `bitacora-${this.from()}-${this.to()}.csv`,
      ['Fecha', 'Persona', 'Rol', 'Acción', 'Detalle', 'Entidad', 'Propiedad', 'IP', 'Dispositivo', 'Antes', 'Después'],
      this.filtered().map((e) => [
        e.created_at, e.actor, e.actor_role, e.action, e.summary, e.entity_label, e.property_code, e.ip, e.device,
        e.before ? JSON.stringify(e.before) : null, e.after ? JSON.stringify(e.after) : null,
      ]),
    );
  }
}
