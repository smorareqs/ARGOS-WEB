import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ParkingStore } from '../../store/parking.store';
import { ParkingAssignment, ParkingSpace } from '../../services/parking-api.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { SpotIconComponent } from '../../../../shared/atoms/spot-icon/spot-icon.component';
import { addDays, dayKey, toDayKey } from '../../../../shared/utils/time';
import { plural } from '../../../../shared/utils/plural';

const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const COL = 92;

/**
 * Screen · Parqueos (W-I1): plano del nivel con cada espacio y su placa de
 * hoy (como lo ve seguridad en la garita), ocupación de la semana por espacio
 * y asignación a una reserva con placa.
 */
@Component({
  selector: 'app-parking-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    PageHeaderComponent,
    DemoDataNoteComponent,
    SegmentedComponent,
    EmptyStateComponent,
    FormSheetComponent,
    FormFieldComponent,
    DrawerComponent,
    ButtonComponent,
    IconComponent,
    InputComponent,
    SelectComponent,
    BadgeComponent,
    SpotIconComponent,
  ],
  providers: [ParkingStore],
  template: `
    <app-page-header title="Parqueos" eyebrow="Operación" [subtitle]="store.loading() ? 'Cargando espacios…' : subtitle()">
      @if (store.canManage()) {
        <app-button variant="primary" (pressed)="openAssign(null)"><app-icon name="car" [size]="17" /> Asignar espacio</app-button>
      }
    </app-page-header>
    <app-demo-data-note module="parking" label="Parqueos" />

    @if (store.error(); as err) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="error" title="No pudimos cargar los parqueos" [message]="err">
          <app-button variant="secondary" (pressed)="store.load()"><app-icon name="refresh" [size]="16" /> Reintentar</app-button>
        </app-empty-state>
      </div>
    } @else if (store.loading()) {
      <div class="skeleton h-[420px] w-full !rounded-card"></div>
    } @else {
      @if (buildings().length > 1) {
        <app-segmented class="mb-4 inline-block" [options]="buildingOptions()" [value]="building()" (valueChange)="go({ edificio: $event })" ariaLabel="Edificio" />
      }
      <section class="rounded-card border border-border-card bg-surface p-5 shadow-e1">
        <header class="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <h2 class="font-display text-[20px] font-semibold text-primary">{{ building() }} · {{ levelOf() }}</h2>
          <div class="ml-auto flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-text-body">
            <span class="flex items-center gap-1.5"><span class="lg-sw is-busy"></span>Ocupado hoy</span>
            <span class="flex items-center gap-1.5"><span class="lg-sw is-free"></span>Libre</span>
            <span class="flex items-center gap-1.5"><span class="lg-sw is-visitor"></span>Visitas</span>
            <span class="flex items-center gap-1.5"><span class="lg-sw is-blocked"></span>Bloqueado</span>
          </div>
        </header>
        <div class="lot">
          @for (row of lotRows(); track $index; let ri = $index) {
            <div class="grid gap-2" [style.grid-template-columns]="'repeat(' + row.length + ', minmax(0, 1fr))'">
              @for (s of row; track s.id) {
                @let a = store.today().get(s.id);
                <button
                  type="button"
                  class="space flex flex-col justify-between rounded-[8px] p-2.5 text-left"
                  [class.is-top]="ri === 0"
                  [class.is-busy]="!!a"
                  [class.is-visitor]="s.kind === 'visitor' && !a"
                  [class.is-staff]="s.kind === 'staff'"
                  [class.is-blocked]="s.blocked"
                  [attr.aria-label]="s.code + (a ? ', ocupado por ' + a.plate : s.blocked ? ', bloqueado' : ', libre')"
                  (click)="go({ espacio: s.id })"
                >
                  <span class="flex items-center justify-between">
                    <span class="font-mono text-[11.5px] font-bold">{{ s.code }}</span>
                    @if (!s.covered) { <app-icon name="sun" [size]="12" class="opacity-60" /> }
                  </span>
                  @if (a) {
                    <span>
                      <span class="plate block font-mono text-[12px] font-bold tracking-wide">{{ a.plate }}</span>
                      <span class="mt-0.5 block truncate text-[10.5px] opacity-80">{{ a.property_code }} · sale {{ asDate(a.to) | date: 'EEE d' }}</span>
                    </span>
                  } @else {
                    <span class="text-[10.5px] opacity-70">{{ s.blocked ? 'Bloqueado' : s.kind === 'visitor' ? 'Visitas' : s.kind === 'staff' ? 'Personal' : 'Libre' }}</span>
                  }
                </button>
              }
            </div>
            @if (ri === 0) {
              <div class="lane my-3 flex items-center justify-center text-[10.5px] uppercase tracking-[3px] text-text-muted" aria-hidden="true">← Entrada · carril de circulación →</div>
            }
          }
        </div>
      </section>

      <section class="mt-6">
        <h2 class="mb-3 font-display text-[20px] font-semibold text-primary">Ocupación de la semana</h2>
        <div class="overflow-x-auto rounded-card border border-border-card bg-surface shadow-e1">
          <div [style.width.px]="140 + days().length * col">
            <div class="flex border-b border-divider">
              <div class="sticky left-0 z-[2] w-[140px] shrink-0 bg-surface px-4 py-2.5 text-[10.5px] uppercase tracking-[1px] text-text-secondary">Espacio</div>
              @for (d of days(); track d.key) {
                <div class="shrink-0 border-l border-divider px-2.5 py-2" [style.width.px]="col" [class.is-today]="d.today">
                  <div class="text-[10.5px] uppercase" [class]="d.today ? 'font-bold text-secondary' : 'text-text-secondary'">{{ d.wd }}</div>
                  <div class="tabular text-[14px] font-semibold text-primary">{{ d.day }}</div>
                </div>
              }
            </div>
            @for (s of buildingSpaces(); track s.id) {
              <div class="relative flex h-[42px] border-b border-divider last:border-0">
                <div class="sticky left-0 z-[2] flex w-[140px] shrink-0 items-center gap-2 bg-surface px-4">
                  <span class="font-mono text-[12px] font-bold text-primary">{{ s.code }}</span>
                  @if (s.kind !== 'guest') { <span class="text-[10.5px] text-text-secondary">{{ s.kind === 'visitor' ? 'visitas' : 'personal' }}</span> }
                </div>
                @for (d of days(); track d.key) {
                  <div class="shrink-0 border-l border-divider" [style.width.px]="col" [class.is-today]="d.today" [class.is-blockcell]="s.blocked"></div>
                }
                @for (b of weekBars()[s.id] ?? []; track b.a.id) {
                  <button type="button" class="wbar absolute top-[7px] h-7 truncate rounded-[6px] px-2 text-left font-mono text-[11px] font-bold text-primary" [style.left.px]="140 + b.left" [style.width.px]="b.width" [title]="b.a.guest_name + ' · ' + b.a.property_code" (click)="go({ espacio: s.id })">{{ b.a.plate }}</button>
                }
              </div>
            }
          </div>
        </div>
      </section>
    }

    <app-drawer [open]="!!space()" (openChange)="!$event && go({ espacio: null })" label="Espacio" [width]="440">
      @if (space(); as s) {
        <div class="px-6 pb-6 pt-7">
          <div class="flex items-center gap-4 pr-10">
            <app-spot-icon name="parking" [size]="56" />
            <div>
              <div class="text-[11px] uppercase tracking-[1.6px] text-secondary">{{ s.building }} · {{ s.level }}</div>
              <h2 class="font-display text-[28px] font-semibold leading-tight text-primary">Espacio {{ s.code }}</h2>
              <div class="mt-1 flex gap-1.5">
                <app-badge size="sm" tone="neutral">{{ s.kind === 'visitor' ? 'Visitas' : s.kind === 'staff' ? 'Personal' : 'Huéspedes' }}</app-badge>
                <app-badge size="sm" tone="muted">{{ s.covered ? 'Techado' : 'Descubierto' }}</app-badge>
                @if (s.blocked) { <app-badge size="sm" tone="danger">Bloqueado</app-badge> }
              </div>
            </div>
          </div>
          <h3 class="mb-2 mt-6 text-[12px] font-bold uppercase tracking-[0.8px] text-text-secondary">Asignaciones</h3>
          <ul class="space-y-2.5">
            @for (a of spaceAssignments(); track a.id) {
              <li class="flex items-center gap-3 rounded-card border border-border-card bg-surface px-4 py-3">
                <div class="min-w-0 flex-1">
                  <div class="font-mono text-[14px] font-bold text-primary">{{ a.plate }}</div>
                  <div class="truncate text-[12px] text-text-body">{{ a.guest_name }} · {{ a.property_code }} · {{ a.reservation_code }}</div>
                  <div class="text-[11.5px] text-text-secondary">{{ asDate(a.from) | date: 'd MMM' }} → {{ asDate(a.to) | date: 'd MMM' }}</div>
                </div>
                @if (store.canManage()) {
                  <app-button variant="ghost" size="sm" [loading]="store.busy() === a.id" (pressed)="release(a)">Liberar</app-button>
                }
              </li>
            } @empty {
              <li class="rounded-card border border-dashed border-border-field px-4 py-6 text-center text-[13px] text-text-secondary">Sin asignaciones esta semana.</li>
            }
          </ul>
        </div>
        @if (store.canManage()) {
          <div drawer-footer class="material-glass flex justify-end gap-2.5 border-t border-divider px-6 py-4">
            <app-button variant="ghost" [loading]="store.busy() === s.id" (pressed)="store.toggleBlocked(s)">{{ s.blocked ? 'Desbloquear' : 'Bloquear' }}</app-button>
            @if (!s.blocked) {
              <app-button variant="primary" (pressed)="openAssign(s.id)">Asignar a reserva</app-button>
            }
          </div>
        }
      }
    </app-drawer>

    <app-drawer [open]="assigning()" (openChange)="!$event && go({ asignar: null })" label="Asignar espacio" [width]="460">
      @if (assigning()) {
        <app-form-sheet eyebrow="Parqueos" title="Asignar espacio" subtitle="Seguridad ve la placa en la garita y recibe la alarma de salida." spot="parking" submitLabel="Asignar" [saving]="store.busy() === 'assign'" [error]="generalError()" (submitted)="assign()" (cancel)="go({ asignar: null })">
          <app-form-field label="Reserva" [required]="true" [error]="fieldError('reservation_code') ?? (tried() && !fStay() ? 'Elige una reserva.' : null)">
            <app-select [compact]="true" placeholder="Elige una reserva" [options]="stayOptions()" [(value)]="fStay" ariaLabel="Reserva" />
          </app-form-field>
          <app-form-field label="Espacio" [required]="true" [error]="fieldError('space_id')">
            <app-select [compact]="true" [options]="spaceOptions()" [(value)]="fSpace" ariaLabel="Espacio" />
          </app-form-field>
          <app-form-field label="Placa" for="pk-plate" [required]="true" [error]="fieldError('plate') ?? (tried() && !fPlate().trim() ? 'Escribe la placa.' : null)">
            <app-input inputId="pk-plate" [compact]="true" [mono]="true" [uppercase]="true" placeholder="P123ABC" [maxlength]="9" [(value)]="fPlate" />
          </app-form-field>
        </app-form-sheet>
      }
    </app-drawer>
  `,
  styles: `
    .lot { padding: 14px; border-radius: 10px; background: #eceae3; }
    .lane { height: 34px; border-top: 2px dashed #d6d2c6; border-bottom: 2px dashed #d6d2c6; }
    .space { min-height: 88px; background: #fff; border: 1.5px dashed #cfcabd; color: var(--color-text-body); transition: transform var(--spring-snappy-dur) var(--spring-snappy), box-shadow var(--dur-fast); }
    .space.is-top { border-bottom-width: 4px; border-bottom-style: solid; border-bottom-color: #d9d4c8; }
    .space:not(.is-top) { border-top-width: 4px; border-top-style: solid; border-top-color: #d9d4c8; }
    .space:hover { transform: translateY(-2px); box-shadow: var(--shadow-e2); }
    .space.is-busy { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
    .space.is-busy .plate { background: #fff; color: var(--color-primary); border-radius: 4px; padding: 1px 5px; display: inline-block; }
    .space.is-visitor { background: #f3e3cc; border-color: #e3cda9; }
    .space.is-blocked { background: repeating-linear-gradient(135deg, #fff 0 6px, #f1d9d5 6px 12px); border-color: var(--color-danger); color: var(--color-danger); }
    .lg-sw { display: inline-block; width: 14px; height: 10px; border-radius: 3px; }
    .lg-sw.is-busy { background: var(--color-primary); }
    .lg-sw.is-free { background: #fff; border: 1.5px dashed #cfcabd; }
    .lg-sw.is-visitor { background: #f3e3cc; }
    .lg-sw.is-blocked { background: repeating-linear-gradient(135deg, #fff 0 2px, var(--color-danger) 2px 3px); }
    .is-today { background: color-mix(in srgb, var(--color-teal-washed) 70%, white); }
    .is-blockcell { background: repeating-linear-gradient(135deg, transparent 0 5px, var(--color-divider) 5px 6px); }
    .wbar { background: color-mix(in srgb, var(--color-teal-muted) 14%, white); border: 1px solid color-mix(in srgb, var(--color-teal-muted) 32%, white); box-shadow: inset 3px 0 0 var(--color-teal-muted); }
  `,
})
export class ParkingComponent {
  protected readonly store = inject(ParkingStore);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly edificio = input<string | undefined>();
  readonly espacio = input<string | undefined>();
  readonly asignar = input<string | undefined>();

  protected readonly col = COL;
  protected readonly buildings = computed(() => [...new Set(this.store.spaces().map((s) => s.building))]);
  protected readonly building = computed(() => this.edificio() ?? this.buildings()[0] ?? '');
  protected readonly buildingOptions = computed(() => this.buildings().map((b) => ({ value: b, label: b })));
  protected readonly buildingSpaces = computed(() => this.store.spaces().filter((s) => s.building === this.building()));
  protected readonly levelOf = computed(() => this.buildingSpaces()[0]?.level ?? '');
  protected readonly lotRows = computed(() => {
    const all = this.buildingSpaces();
    const half = Math.ceil(all.length / 2);
    return [all.slice(0, half), all.slice(half)];
  });
  protected readonly subtitle = computed(() => {
    const guest = this.store.spaces().filter((s) => !s.blocked);
    const busy = guest.filter((s) => this.store.today().has(s.id)).length;
    return `Hoy: ${busy} de ${plural(guest.length, 'espacio ocupado', 'espacios ocupados')} · ${plural(guest.length - busy, 'libre', 'libres')}`;
  });
  protected readonly days = computed(() => {
    const today = dayKey();
    return Array.from({ length: 8 }, (_, i) => {
      const d = addDays(new Date(), i - 1);
      return { key: toDayKey(d), wd: WD[d.getDay()], day: d.getDate(), today: toDayKey(d) === today };
    });
  });
  protected readonly weekBars = computed(() => {
    const days = this.days();
    const first = days[0].key;
    const idx = (k: string) => Math.round((new Date(`${k}T12:00:00`).getTime() - new Date(`${first}T12:00:00`).getTime()) / 86400000);
    const out: Partial<Record<string, { a: ParkingAssignment; left: number; width: number }[]>> = {};
    for (const a of this.store.assignments()) {
      const s = Math.max(0, idx(a.from) + 0.5);
      const e = Math.min(days.length, idx(a.to) + 0.5);
      if (e <= 0 || s >= days.length) continue;
      (out[a.space_id] ??= []).push({ a, left: s * COL + 2, width: Math.max(24, (e - s) * COL - 4) });
    }
    return out;
  });
  protected readonly space = computed(() => this.store.spaces().find((s) => s.id === this.espacio()) ?? null);
  protected readonly spaceAssignments = computed(() => this.store.assignments().filter((a) => a.space_id === this.espacio() && a.to > dayKey()).sort((a, b) => a.from.localeCompare(b.from)));

  // Asignar
  protected readonly assigning = computed(() => this.asignar() !== undefined);
  protected readonly fStay = signal('');
  protected readonly fSpace = signal('');
  protected readonly fPlate = signal('');
  protected readonly tried = signal(false);
  protected readonly stayOptions = computed(() =>
    this.store.stays().map((s) => ({ value: s.reservation_code, label: `${s.guest_name} · ${s.property_code} · ${s.from.slice(8)}/${s.from.slice(5, 7)} → ${s.to.slice(8)}/${s.to.slice(5, 7)}` })),
  );
  protected readonly spaceOptions = computed(() => this.store.spaces().filter((s) => !s.blocked && s.kind === 'guest').map((s) => ({ value: s.id, label: `${s.code} · ${s.building}${this.store.today().has(s.id) ? ' (ocupado hoy)' : ''}` })));
  protected readonly generalError = computed(() => {
    const e = this.store.saveError();
    return e && !e.errors.length ? e.detail : null;
  });

  constructor() {
    void this.store.load();
  }

  protected go(params: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: 'edificio' in params });
  }

  protected asDate(k: string): Date {
    return new Date(`${k}T12:00:00`);
  }

  protected fieldError(field: string): string | null {
    return this.store.saveError()?.errors.find((e) => e.location === `body.${field}`)?.message ?? null;
  }

  protected openAssign(spaceId: string | null): void {
    this.store.clearSaveError();
    this.tried.set(false);
    this.fPlate.set('');
    this.fStay.set('');
    const free = this.store.spaces().find((s) => !s.blocked && s.kind === 'guest' && !this.store.today().has(s.id));
    this.fSpace.set(spaceId ?? free?.id ?? '');
    void this.router.navigate([], { queryParams: { asignar: '1', espacio: null }, queryParamsHandling: 'merge' });
  }

  protected async assign(): Promise<void> {
    this.tried.set(true);
    if (!this.fStay() || !this.fPlate().trim() || !this.fSpace()) return;
    if (await this.store.assign({ space_id: this.fSpace(), reservation_code: this.fStay(), plate: this.fPlate() })) this.go({ asignar: null });
  }

  protected async release(a: ParkingAssignment): Promise<void> {
    const ok = await this.confirm.ask({ title: `Liberar espacio`, message: `${a.plate} de ${a.guest_name} deja de tener lugar asignado.`, confirmLabel: 'Liberar', tone: 'danger' });
    if (ok) await this.store.release(a);
  }
}
