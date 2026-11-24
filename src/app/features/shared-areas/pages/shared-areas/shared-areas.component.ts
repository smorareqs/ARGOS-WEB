import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { SharedAreasStore } from '../../store/shared-areas.store';
import { AreaBooking, SharedArea } from '../../services/shared-areas-api.service';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { FilterChipsComponent } from '../../../../shared/molecules/filter-chips/filter-chips.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { PhotoComponent } from '../../../../shared/atoms/photo/photo.component';
import { PHOTOS } from '../../../../shared/media/photos';
import { addDays, dayKey, hhmm, minutes, toDayKey } from '../../../../shared/utils/time';
import { plural } from '../../../../shared/utils/plural';

const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const HOUR_W = 64;

/**
 * Screen · Áreas comunes (W-I2): tarjeta con foto por área (capacidad,
 * horario y ocupación del día), agenda del día por horas y reservas en nombre
 * de un huésped. La configuración de cada área se edita en un drawer.
 */
@Component({
  selector: 'app-shared-areas-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeaderComponent,
    DemoDataNoteComponent,
    FilterChipsComponent,
    EmptyStateComponent,
    FormSheetComponent,
    FormFieldComponent,
    DrawerComponent,
    ButtonComponent,
    IconComponent,
    InputComponent,
    SelectComponent,
    PhotoComponent,
  ],
  providers: [SharedAreasStore],
  template: `
    <app-page-header title="Áreas comunes" eyebrow="Operación" [subtitle]="store.loading() ? 'Cargando agenda…' : subtitle()">
      @if (store.canBook()) {
        <app-button variant="primary" (pressed)="openBook(null, null)"><app-icon name="plus" [size]="17" /> Reservar para un huésped</app-button>
      }
    </app-page-header>
    <app-demo-data-note module="sharedAreas" label="Áreas comunes" />

    @if (store.error(); as err) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="error" title="No pudimos cargar las áreas" [message]="err">
          <app-button variant="secondary" (pressed)="store.load()"><app-icon name="refresh" [size]="16" /> Reintentar</app-button>
        </app-empty-state>
      </div>
    } @else if (store.loading()) {
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        @for (i of [0, 1, 2, 3]; track i) { <div class="skeleton h-[300px] !rounded-card"></div> }
      </div>
    } @else {
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        @for (a of store.areas(); track a.id; let i = $index) {
          @let u = usage()[a.id];
          <article class="reveal flex flex-col overflow-hidden rounded-card border border-border-card bg-surface shadow-e1" [style.--i]="i">
            <div class="relative overflow-hidden" style="aspect-ratio: 16 / 10">
              <app-photo class="absolute inset-0 block h-full w-full" [photo]="photos[a.photo]" sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw" />
              <span class="absolute left-3 top-3 rounded-xs bg-surface/90 px-2 py-0.5 text-[11px] font-bold text-primary">{{ a.building }}</span>
            </div>
            <div class="flex flex-1 flex-col p-4">
              <h3 class="font-display text-[18px] font-semibold leading-tight text-primary">{{ a.name }}</h3>
              <p class="mt-1 text-[12px] text-text-secondary">{{ a.opens }}–{{ a.closes }} · bloques de {{ a.block }} min · hasta {{ a.capacity }} personas</p>
              <div class="mt-3 flex items-center justify-between text-[12px]">
                <span class="text-text-body">{{ u.used }} de {{ u.slots }} bloques {{ dayLabel() }}</span>
                <span class="tabular font-bold text-primary">{{ u.pct }}%</span>
              </div>
              <div class="mt-1.5 h-[5px] overflow-hidden rounded-pill bg-track"><div class="h-full rounded-pill" [class]="u.pct > 80 ? 'bg-warning' : 'bg-teal-muted'" [style.width.%]="u.pct"></div></div>
              @if (store.canManage()) {
                <div class="mt-auto flex justify-end pt-4">
                  <app-button variant="ghost" size="sm" (pressed)="go({ area: a.id })"><app-icon name="settings" [size]="15" /> Configurar</app-button>
                </div>
              }
            </div>
          </article>
        }
      </div>

      <section class="mt-8">
        <div class="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 class="font-display text-[22px] font-semibold text-primary">Agenda</h2>
          <app-filter-chips [options]="dayChips()" [value]="day()" (valueChange)="go({ dia: $event === today ? null : $event })" ariaLabel="Día" />
        </div>
        <div class="overflow-x-auto rounded-card border border-border-card bg-surface shadow-e1">
          <div [style.width.px]="200 + hours().length * hourW">
            <div class="flex border-b border-divider">
              <div class="sticky left-0 z-[2] w-[200px] shrink-0 bg-surface px-4 py-2.5 text-[10.5px] uppercase tracking-[1px] text-text-secondary">Área</div>
              @for (h of hours(); track h) {
                <div class="tabular shrink-0 border-l border-divider px-1.5 py-2.5 text-[11px] text-text-secondary" [style.width.px]="hourW">{{ h }}:00</div>
              }
            </div>
            @for (a of store.areas(); track a.id) {
              <div class="relative flex h-[62px] border-b border-divider last:border-0">
                <div class="sticky left-0 z-[2] flex w-[200px] shrink-0 flex-col justify-center bg-surface px-4">
                  <span class="truncate text-[13px] font-bold text-primary">{{ a.name }}</span>
                  <span class="text-[11.5px] text-text-secondary">Cupo {{ a.capacity }}</span>
                </div>
                @for (h of hours(); track h) {
                  <button type="button" class="slot shrink-0 border-l border-divider" [class.is-closed]="!isOpen(a, h)" [style.width.px]="hourW" [disabled]="!isOpen(a, h) || !store.canBook()" [attr.aria-label]="'Reservar ' + a.name + ' a las ' + h + ':00'" (click)="openBook(a.id, h)"></button>
                }
                @for (b of dayBookings()[a.id] ?? []; track b.id) {
                  <div class="bk absolute top-[8px] flex h-[46px] flex-col justify-center overflow-hidden rounded-[7px] px-2" [style.left.px]="200 + pos(b.start)" [style.width.px]="pos(b.end) - pos(b.start) - 3" [title]="b.guest_name + ' · ' + b.property_code + ' · ' + b.people + ' personas'">
                    <span class="truncate text-[11.5px] font-bold text-primary">{{ b.guest_name }}</span>
                    <span class="tabular truncate text-[10.5px] text-text-secondary">{{ b.start }} · {{ b.people }} pers. · {{ b.property_code }}</span>
                    @if (store.canManage()) {
                      <button type="button" class="x absolute right-1 top-1 rounded-xs p-0.5 text-text-secondary hover:bg-surface hover:text-danger" [attr.aria-label]="'Cancelar reserva de ' + b.guest_name" (click)="cancel(b)"><app-icon name="x" [size]="12" /></button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
        <p class="mt-3 text-[12px] text-text-secondary">Toca una hora libre para reservar ese bloque. Los huéspedes también reservan desde la app y ven solo los cupos disponibles.</p>
      </section>
    }

    <app-drawer [open]="booking()" (openChange)="!$event && go({ reservar: null })" label="Reservar área" [width]="480">
      @if (booking()) {
        <app-form-sheet eyebrow="Áreas comunes" title="Reservar para un huésped" subtitle="El huésped recibe el aviso y las reglas del área." spot="pool" submitLabel="Reservar" [saving]="store.busy() === 'book'" [error]="generalError()" (submitted)="book()" (cancel)="go({ reservar: null })">
          <app-form-field label="Área" [required]="true">
            <app-select [compact]="true" [options]="areaOptions()" [(value)]="fArea" ariaLabel="Área" />
          </app-form-field>
          <div class="grid grid-cols-2 gap-3">
            <app-form-field label="Día" [required]="true"><app-select [compact]="true" [options]="dayOptions()" [(value)]="fDay" ariaLabel="Día" /></app-form-field>
            <app-form-field label="Hora" [required]="true" [error]="fieldError('start')"><app-select [compact]="true" [options]="startOptions()" [(value)]="fStart" ariaLabel="Hora" /></app-form-field>
          </div>
          <app-form-field label="Huésped" [required]="true" hint="Huéspedes con estancia en curso." [error]="tried() && !fGuest() ? 'Elige al huésped.' : null">
            <app-select [compact]="true" placeholder="Elige al huésped" [options]="guestOptions()" [(value)]="fGuest" ariaLabel="Huésped" />
          </app-form-field>
          <app-form-field label="Personas" for="sa-people" [required]="true" [error]="fieldError('people')">
            <input id="sa-people" type="number" min="1" class="field-native tabular" [value]="fPeople()" (input)="fPeople.set($any($event.target).value)" />
          </app-form-field>
          @if (selectedArea(); as a) {
            <p class="rounded-field bg-surface px-4 py-3 text-[12.5px] leading-relaxed text-text-body"><b class="text-primary">Reglas:</b> {{ a.rules }}</p>
          }
        </app-form-sheet>
      }
    </app-drawer>

    <app-drawer [open]="!!editing()" (openChange)="!$event && go({ area: null })" label="Configurar área" [width]="500">
      @if (editing(); as a) {
        <app-form-sheet eyebrow="Configuración" [title]="a.name" [subtitle]="a.building" spot="pool" submitLabel="Guardar" [saving]="store.busy() === 'area'" [error]="generalError()" (submitted)="saveArea(a)" (cancel)="go({ area: null })">
          <app-form-field label="Nombre" for="ae-name" [required]="true"><app-input inputId="ae-name" [compact]="true" [(value)]="eName" /></app-form-field>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <app-form-field label="Abre" for="ae-o"><input id="ae-o" type="time" class="field-native" [value]="eOpens()" (input)="eOpens.set($any($event.target).value)" /></app-form-field>
            <app-form-field label="Cierra" for="ae-c" [error]="fieldError('closes')"><input id="ae-c" type="time" class="field-native" [value]="eCloses()" (input)="eCloses.set($any($event.target).value)" /></app-form-field>
            <app-form-field label="Capacidad" for="ae-cap"><input id="ae-cap" type="number" min="1" class="field-native tabular" [value]="eCap()" (input)="eCap.set($any($event.target).value)" /></app-form-field>
            <app-form-field label="Bloque (min)" for="ae-b"><input id="ae-b" type="number" min="30" step="30" class="field-native tabular" [value]="eBlock()" (input)="eBlock.set($any($event.target).value)" /></app-form-field>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <app-form-field label="Máximo por día" for="ae-m" hint="Bloques por huésped"><input id="ae-m" type="number" min="1" class="field-native tabular" [value]="eMax()" (input)="eMax.set($any($event.target).value)" /></app-form-field>
            <app-form-field label="Anticipación (h)" for="ae-a" hint="Mínimo para reservar"><input id="ae-a" type="number" min="0" class="field-native tabular" [value]="eAdv()" (input)="eAdv.set($any($event.target).value)" /></app-form-field>
          </div>
          <app-form-field label="Reglas" for="ae-r"><textarea id="ae-r" rows="3" class="field-native" [value]="eRules()" (input)="eRules.set($any($event.target).value)"></textarea></app-form-field>
        </app-form-sheet>
      }
    </app-drawer>
  `,
  styles: `
    .slot { height: 100%; transition: background-color var(--dur-fast); }
    .slot:not(:disabled):hover { background: rgba(197, 135, 60, 0.1); }
    .slot.is-closed { background: repeating-linear-gradient(135deg, transparent 0 5px, var(--color-divider) 5px 6px); }
    .bk { background: color-mix(in srgb, var(--color-teal-muted) 12%, white); border: 1px solid color-mix(in srgb, var(--color-teal-muted) 30%, white); box-shadow: inset 3px 0 0 var(--color-teal-muted); }
    .bk .x { opacity: 0; }
    .bk:hover .x, .bk .x:focus-visible { opacity: 1; }
  `,
})
export class SharedAreasComponent {
  protected readonly store = inject(SharedAreasStore);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly dia = input<string | undefined>();
  readonly reservar = input<string | undefined>();
  readonly area = input<string | undefined>();

  protected readonly today = dayKey();
  protected readonly hourW = HOUR_W;
  protected readonly photos = PHOTOS;
  protected readonly day = computed(() => this.dia() ?? this.today);
  protected readonly dayLabel = computed(() => (this.day() === this.today ? 'hoy' : 'ese día'));
  protected readonly subtitle = computed(() => {
    const today = this.store.bookings().filter((b) => b.date === this.today);
    return `Hoy: ${plural(today.length, 'reserva', 'reservas')} en ${plural(this.store.areas().length, 'área', 'áreas')} · ${plural(today.reduce((a, b) => a + b.people, 0), 'persona', 'personas')}`;
  });
  protected readonly dayChips = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(new Date(), i);
      const key = toDayKey(d);
      return { value: key, label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `${WD[d.getDay()]} ${d.getDate()}`, count: this.store.bookings().filter((b) => b.date === key).length };
    }),
  );
  protected readonly hours = computed(() => {
    const areas = this.store.areas();
    if (!areas.length) return [];
    const from = Math.floor(Math.min(...areas.map((a) => minutes(a.opens))) / 60);
    const to = Math.ceil(Math.max(...areas.map((a) => minutes(a.closes))) / 60);
    return Array.from({ length: to - from }, (_, i) => from + i);
  });
  protected readonly dayBookings = computed(() => {
    const out: Partial<Record<string, AreaBooking[]>> = {};
    for (const b of this.store.bookings()) if (b.date === this.day()) (out[b.area_id] ??= []).push(b);
    return out;
  });
  protected readonly usage = computed(() => {
    const out: Record<string, { used: number; slots: number; pct: number }> = {};
    for (const a of this.store.areas()) {
      const slots = Math.floor((minutes(a.closes) - minutes(a.opens)) / a.block);
      const used = (this.dayBookings()[a.id] ?? []).length;
      out[a.id] = { used, slots, pct: Math.round((used / Math.max(1, slots)) * 100) };
    }
    return out;
  });

  // Reservar
  protected readonly booking = computed(() => this.reservar() !== undefined);
  protected readonly fArea = signal('');
  protected readonly fDay = signal(dayKey());
  protected readonly fStart = signal('');
  protected readonly fGuest = signal('');
  protected readonly fPeople = signal('2');
  protected readonly tried = signal(false);
  protected readonly selectedArea = computed(() => this.store.areas().find((a) => a.id === this.fArea()) ?? null);
  protected readonly areaOptions = computed(() => this.store.areas().map((a) => ({ value: a.id, label: `${a.name} · ${a.building}` })));
  protected readonly dayOptions = computed(() => this.dayChips().map((c) => ({ value: c.value, label: c.label })));
  protected readonly startOptions = computed(() => {
    const a = this.selectedArea();
    if (!a) return [];
    const out = [];
    for (let m = minutes(a.opens); m + a.block <= minutes(a.closes); m += a.block) out.push({ value: hhmm(m), label: `${hhmm(m)} – ${hhmm(m + a.block)}` });
    return out;
  });
  protected readonly guestOptions = computed(() => this.store.guests().map((g) => ({ value: `${g.name}|${g.property_code}`, label: `${g.name} · ${g.property_code}` })));

  // Configurar
  protected readonly editing = computed(() => this.store.areas().find((a) => a.id === this.area()) ?? null);
  protected readonly eName = signal('');
  protected readonly eOpens = signal('');
  protected readonly eCloses = signal('');
  protected readonly eCap = signal('');
  protected readonly eBlock = signal('');
  protected readonly eMax = signal('');
  protected readonly eAdv = signal('');
  protected readonly eRules = signal('');
  protected readonly generalError = computed(() => {
    const e = this.store.saveError();
    return e && !e.errors.length ? e.detail : null;
  });

  constructor() {
    void this.store.load();
    effect(() => {
      const a = this.editing();
      if (!a) return;
      untracked(() => {
        this.eName.set(a.name);
        this.eOpens.set(a.opens);
        this.eCloses.set(a.closes);
        this.eCap.set(String(a.capacity));
        this.eBlock.set(String(a.block));
        this.eMax.set(String(a.max_per_day));
        this.eAdv.set(String(a.advance_hours));
        this.eRules.set(a.rules);
        this.store.clearSaveError();
      });
    });
    // Si la hora elegida no existe en el área nueva, toma la primera.
    effect(() => {
      const opts = this.startOptions();
      untracked(() => {
        if (opts.length && !opts.some((o) => o.value === this.fStart())) this.fStart.set(opts[0].value);
      });
    });
  }

  protected go(params: Record<string, string | null>): void {
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: 'dia' in params });
  }

  protected isOpen(a: SharedArea, h: number): boolean {
    return h * 60 >= minutes(a.opens) && (h + 1) * 60 <= minutes(a.closes) + 59 && h * 60 < minutes(a.closes);
  }

  protected pos(hm: string): number {
    const first = this.hours()[0] ?? 0;
    return ((minutes(hm) - first * 60) / 60) * HOUR_W;
  }

  protected fieldError(field: string): string | null {
    return this.store.saveError()?.errors.find((e) => e.location === `body.${field}`)?.message ?? null;
  }

  protected openBook(areaId: string | null, hour: number | null): void {
    this.store.clearSaveError();
    this.tried.set(false);
    this.fArea.set(areaId ?? this.store.areas()[0]?.id ?? '');
    this.fDay.set(this.day());
    if (hour !== null) {
      const a = this.store.areas().find((x) => x.id === areaId);
      if (a) {
        const open = minutes(a.opens);
        const slot = open + Math.max(0, Math.floor((hour * 60 - open) / a.block)) * a.block;
        this.fStart.set(hhmm(slot));
      }
    }
    this.go({ reservar: '1' });
  }

  protected async book(): Promise<void> {
    this.tried.set(true);
    if (!this.fGuest() || !this.fArea() || !this.fStart()) return;
    const ok = await this.store.book({ area_id: this.fArea(), date: this.fDay(), start: this.fStart(), guest: this.fGuest(), people: Math.max(1, Number(this.fPeople()) || 1) });
    if (ok) this.go({ reservar: null, dia: this.fDay() === this.today ? null : this.fDay() });
  }

  protected async cancel(b: AreaBooking): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Cancelar reserva del área', message: `${b.guest_name} (${b.property_code}), ${b.start}–${b.end}. Le llega el aviso en la app.`, confirmLabel: 'Cancelar reserva', tone: 'danger' });
    if (ok) await this.store.cancel(b);
  }

  protected async saveArea(a: SharedArea): Promise<void> {
    const ok = await this.store.saveArea({
      ...a,
      name: this.eName().trim() || a.name,
      opens: this.eOpens(),
      closes: this.eCloses(),
      capacity: Math.max(1, Number(this.eCap()) || a.capacity),
      block: Math.max(30, Number(this.eBlock()) || a.block),
      max_per_day: Math.max(1, Number(this.eMax()) || a.max_per_day),
      advance_hours: Math.max(0, Number(this.eAdv()) || 0),
      rules: this.eRules().trim(),
    });
    if (ok) this.go({ area: null });
  }
}
