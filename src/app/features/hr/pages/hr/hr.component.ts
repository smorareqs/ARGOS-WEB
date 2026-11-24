import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { HrStore } from '../../store/hr.store';
import { AttendanceDay, FLAG_LABEL, PERIOD_STATUS, PayrollPeriod, PeriodDetail } from '../../models/hr.model';
import { LineEdit, PayrollGridComponent } from '../../components/payroll-grid/payroll-grid.component';
import { LinePanelComponent } from '../../components/line-panel/line-panel.component';
import { DisciplineListComponent } from '../../components/discipline-list/discipline-list.component';
import { ActionFormComponent } from '../../components/action-form/action-form.component';
import { PayrollSettingsComponent } from '../../components/payroll-settings/payroll-settings.component';
import { PeriodFormComponent } from '../../components/period-form/period-form.component';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { TabsComponent } from '../../../../shared/molecules/tabs/tabs.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { SpotIconComponent } from '../../../../shared/atoms/spot-icon/spot-icon.component';
import { addDays, dayKey, gtq, toDayKey } from '../../../../shared/utils/time';
import { plural } from '../../../../shared/utils/plural';

const WD = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/**
 * Pantalla · RRHH: W-J1 asistencia del mes (simulada hasta la API de B),
 * W-J2/W-J3 nómina por períodos con planilla, W-J4 disciplina y W-J5
 * configuración de nómina (API real de Persona A).
 */
@Component({
  selector: 'app-hr-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, PayrollGridComponent, LinePanelComponent, DisciplineListComponent, ActionFormComponent, PayrollSettingsComponent,
    PeriodFormComponent, PageHeaderComponent, DemoDataNoteComponent, TabsComponent, EmptyStateComponent, FormSheetComponent,
    FormFieldComponent, DrawerComponent, ButtonComponent, IconComponent, SelectComponent, BadgeComponent, AvatarComponent, SpotIconComponent,
  ],
  providers: [HrStore],
  template: `
    <app-page-header title="RRHH" eyebrow="Equipo" [subtitle]="subtitle()">
      @switch (tab()) {
        @case ('asistencia') {
          @if (store.canAttendance()) { <app-button variant="primary" (pressed)="openManual()"><app-icon name="clock" [size]="17" /> Marcaje manual</app-button> }
        }
        @case ('nomina') {
          @if (store.canPayroll() && !periodo()) { <app-button variant="primary" (pressed)="go({ nuevo: '1' })"><app-icon name="plus" [size]="17" /> Nuevo período</app-button> }
        }
        @case ('disciplina') {
          @if (store.canDiscipline()) { <app-button variant="primary" (pressed)="go({ accion: '1' })"><app-icon name="plus" [size]="17" /> Nueva acción</app-button> }
        }
      }
    </app-page-header>

    @if (!tabs().length) {
      <div class="rounded-card border border-border-card bg-surface shadow-e1">
        <app-empty-state kind="soon" title="Sin acceso a RRHH" message="Tu rol no tiene asistencia, nómina ni disciplina en esta empresa." />
      </div>
    } @else {
      @if (store.error(); as err) {
        <p class="mb-4 rounded-field border border-danger/30 bg-danger-soft px-4 py-3 text-[12.5px] text-danger">{{ err }} <button type="button" class="font-bold underline" (click)="store.load()">Reintentar</button></p>
      }
      <app-tabs [options]="tabs()" [value]="tab()" (valueChange)="go({ tab: $event, periodo: null, linea: null })" ariaLabel="Secciones de RRHH" />
      <div class="mt-5">
        @switch (tab()) {
          @case ('asistencia') {
            <app-demo-data-note module="attendance" label="La asistencia" />
            @if (!store.attendance()) {
              <div class="skeleton h-[420px] w-full !rounded-card"></div>
            } @else {
              <div class="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-text-body">
                <h2 class="mr-auto font-display text-[20px] font-semibold capitalize text-primary">{{ monthStart | date: 'MMMM y' }}</h2>
                <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-pill bg-danger"></span>Sin salida</span>
                <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-pill bg-warning"></span>Tarde o fuera de horario</span>
                <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-[3px] border border-dashed border-secondary"></span>Corregido a mano</span>
              </div>
              <div class="overflow-x-auto rounded-card border border-border-card bg-surface shadow-e1">
                <table class="att w-full border-collapse text-[11.5px]">
                  <thead>
                    <tr class="border-b border-divider">
                      <th class="sticky left-0 z-[2] min-w-[190px] bg-surface px-4 py-2 text-left text-[10.5px] font-normal uppercase tracking-[1px] text-text-secondary">Colaborador</th>
                      @for (d of monthDays; track d.key) {
                        <th class="min-w-[38px] px-0.5 py-2 text-center font-normal" [class.is-today]="d.key === today">
                          <div class="text-[9.5px] text-text-muted">{{ d.wd }}</div>
                          <div class="tabular text-[12px]" [class]="d.key === today ? 'font-bold text-secondary' : 'text-primary'">{{ d.day }}</div>
                        </th>
                      }
                      <th class="min-w-[70px] px-3 py-2 text-right text-[10.5px] font-normal uppercase tracking-[1px] text-text-secondary">Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (e of store.attendance()!.employees; track e.id) {
                      <tr class="border-b border-divider last:border-0">
                        <td class="sticky left-0 z-[1] bg-surface px-4 py-2">
                          <div class="flex items-center gap-2">
                            <app-avatar [initials]="e.full_name.slice(0, 1)" [name]="e.full_name" [size]="26" />
                            <div class="min-w-0"><div class="truncate text-[12.5px] font-bold text-primary">{{ e.full_name }}</div><div class="truncate text-[10.5px] text-text-secondary">{{ e.position }}</div></div>
                          </div>
                        </td>
                        @for (d of monthDays; track d.key) {
                          @let a = cell(e.id, d.key);
                          <td class="p-0.5 text-center" [class.is-today]="d.key === today">
                            @if (a) {
                              <button type="button" class="hcell tabular" [class]="'h' + band(a)" [class.is-manual]="isManual(a)" [attr.aria-label]="e.full_name + ', ' + d.key + ': ' + a.hours + ' horas' + (a.flag ? ', ' + flagLabel(a) : '')" (click)="go({ marca: e.id + '|' + d.key })">
                                {{ a.hours ? a.hours.toFixed(1) : '—' }}
                                @if (a.flag) { <span class="dot" [class.is-bad]="a.flag === 'no_out'"></span> }
                              </button>
                            } @else if (d.key <= today && !d.sunday) {
                              <span class="text-[11px] text-text-muted">·</span>
                            }
                          </td>
                        }
                        <td class="tabular px-3 py-2 text-right font-bold text-primary">{{ totalHours(e.id) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <p class="mt-3 text-[12px] text-text-secondary">Toca un día para ver los marcajes con su ubicación y corregirlos. Toda corrección pide motivo y queda en la bitácora.</p>
            }
          }
          @case ('nomina') {
            @if (periodo()) {
              @if (store.detail(); as p) {
                <div class="mb-4 flex flex-wrap items-center gap-3">
                  <app-button variant="ghost" size="sm" (pressed)="go({ periodo: null, linea: null })"><app-icon name="arrow-left" [size]="15" /> Períodos</app-button>
                  <h2 class="font-display text-[22px] font-semibold text-primary">{{ p.name }}</h2>
                  <app-badge [tone]="status(p).tone">{{ status(p).label }}</app-badge>
                  @if (p.aguinaldo) { <app-badge tone="info" size="sm">Paga aguinaldo</app-badge> }
                  @if (p.bonus14) { <app-badge tone="info" size="sm">Paga Bono 14</app-badge> }
                </div>
                <div class="mb-4 flex flex-wrap items-center gap-2.5 rounded-card border border-border-card bg-surface px-4 py-3 shadow-e1">
                  <span class="mr-auto text-[12.5px] text-text-body">
                    @if (p.entries.length) {
                      Líquido a pagar <b class="tabular text-[15px] text-primary">{{ money2(p.totals.net) }}</b> · {{ plural(p.entries.length, 'colaborador', 'colaboradores') }} · IGSS {{ money2(p.totals.igss) }}
                      @if (p.closed_at) { · cerrado por {{ p.closed_by_name }} el {{ p.closed_at | date: 'd MMM' }} }
                    } @else {
                      Del {{ asDate(p.period_start) | date: 'd MMM' }} al {{ asDate(p.period_end) | date: 'd MMM' }}. Calcula para traer días, horas, limpiezas e incentivos.
                    }
                  </span>
                  @if (store.canPayroll()) {
                    @switch (p.status) {
                      @case ('draft') {
                        <app-button variant="ghost" size="sm" [loading]="busy(p, 'delete')" (pressed)="remove(p)"><app-icon name="trash" [size]="15" /> Borrar</app-button>
                        <app-button [variant]="p.entries.length ? 'tertiary' : 'primary'" size="sm" [loading]="busy(p, 'compute')" (pressed)="store.run(p, 'compute')"><app-icon name="refresh" [size]="15" /> {{ p.computed_at ? 'Recalcular' : 'Calcular' }}</app-button>
                        @if (p.entries.length) { <app-button variant="primary" size="sm" [loading]="busy(p, 'review')" (pressed)="store.run(p, 'review')">Pasar a revisión</app-button> }
                      }
                      @case ('review') {
                        <app-button variant="ghost" size="sm" [loading]="busy(p, 'reopen')" (pressed)="reopen(p)">Volver a borrador</app-button>
                        <app-button variant="primary" size="sm" [loading]="busy(p, 'close')" (pressed)="close(p)"><app-icon name="lock" [size]="15" /> Cerrar período</app-button>
                      }
                    }
                  }
                  @if (store.canExport() && p.entries.length) {
                    <app-button variant="tertiary" size="sm" [loading]="store.busy() === 'xlsx:' + p.id" (pressed)="store.files.xlsx(p.id)"><app-icon name="file" [size]="15" /> Excel</app-button>
                    <app-button variant="tertiary" size="sm" [loading]="store.busy() === 'pdfs:' + p.id" (pressed)="store.files.payslips(p.id)"><app-icon name="file" [size]="15" /> Boletas</app-button>
                  }
                </div>
                @if (sourceNote(p); as note) {
                  <p class="mb-3 flex items-start gap-2 rounded-field border border-border-card bg-surface px-4 py-3 text-[12.5px] leading-relaxed text-text-body"><app-icon name="info" [size]="16" class="mt-px shrink-0 text-secondary" />{{ note }}</p>
                }
                @if (p.entries.length) {
                  <app-payroll-grid [period]="p" [editable]="p.status === 'review' && store.canPayroll()" [active]="linea() ?? null" (edit)="onEdit(p, $event)" (pick)="go({ linea: $event })" />
                  @if (p.status === 'review') {
                    <p class="mt-3 text-[12px] text-text-secondary">Corrige una celda y presiona Tab: la base, el IGSS y el líquido se recalculan. Lo corregido a mano queda subrayado y en el historial de la línea.</p>
                  } @else if (p.status === 'draft') {
                    <p class="mt-3 text-[12px] text-text-secondary">En borrador solo se calcula. Pásalo a revisión para corregir celdas; después ciérralo para generar el Excel y las boletas.</p>
                  }
                } @else {
                  <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="soon" title="Período sin calcular" message="Calcula para traer días, horas, limpiezas e incentivos de cada colaborador." /></div>
                }
              } @else if (store.detailError(); as err) {
                <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="error" title="No pudimos abrir el período" [message]="err" /></div>
              } @else {
                <div class="skeleton h-[420px] w-full !rounded-card"></div>
              }
            } @else if (!store.periods()) {
              <div class="skeleton h-[320px] w-full !rounded-card"></div>
            } @else {
              <div class="space-y-3">
                @for (p of store.periods(); track p.id; let i = $index) {
                  <button type="button" class="prow reveal flex w-full flex-wrap items-center gap-4 rounded-card border border-border-card bg-surface px-5 py-4 text-left shadow-e1" [style.--i]="i" (click)="go({ periodo: p.id })">
                    <app-spot-icon name="payroll" [size]="44" />
                    <div class="min-w-0 flex-1 basis-[calc(100%-64px)] sm:basis-0">
                      <div class="font-display text-[17px] font-semibold text-primary">{{ p.name }}</div>
                      <div class="text-[12px] text-text-secondary">{{ asDate(p.period_start) | date: 'd MMM' }} – {{ asDate(p.period_end) | date: 'd MMM y' }} · {{ p.employees_count ? plural(p.employees_count, 'colaborador', 'colaboradores') : 'sin calcular' }}{{ p.aguinaldo ? ' · aguinaldo' : '' }}{{ p.bonus14 ? ' · Bono 14' : '' }}</div>
                    </div>
                    <app-badge [tone]="status(p).tone">{{ status(p).label }}</app-badge>
                    <div class="ml-auto text-right sm:ml-0 sm:w-[140px]">
                      <div class="text-[10.5px] uppercase tracking-[1px] text-text-secondary">Líquido</div>
                      <div class="tabular font-display text-[18px] font-semibold text-primary">{{ p.employees_count ? money(p.net_total) : '—' }}</div>
                    </div>
                    <app-icon name="chevron-right" [size]="18" class="hidden text-text-muted sm:block" />
                  </button>
                } @empty {
                  <div class="rounded-card border border-border-card bg-surface"><app-empty-state kind="soon" title="Sin períodos de nómina" message="Crea la primera quincena: se calcula con los horarios, las limpiezas y los incentivos del equipo." /></div>
                }
              </div>
            }
          }
          @case ('disciplina') {
            @if (store.actions(); as list) {
              <app-discipline-list [actions]="list" />
            } @else {
              <div class="skeleton h-[320px] w-full !rounded-card"></div>
            }
          }
          @default {
            @if (store.settings()) { <app-payroll-settings /> } @else { <div class="skeleton h-[360px] max-w-[880px] !rounded-card"></div> }
          }
        }
      </div>
    }

    <app-drawer [open]="!!punchView()" (openChange)="!$event && go({ marca: null })" label="Marcajes" [width]="460">
      @if (punchView(); as v) {
        <app-form-sheet eyebrow="Asistencia" [title]="v.name" [subtitle]="(asDate(v.date) | date: 'EEEE d MMMM') + (v.day?.flag ? ' · ' + flagLabel(v.day!) : '')" spot="map" submitLabel="Guardar corrección" [saving]="store.busy() === 'fix'" [error]="store.saveError()?.detail ?? null" (submitted)="saveFix(v.employee, v.date)" (cancel)="go({ marca: null })">
          @if (v.day?.punches?.length) {
            <ol class="space-y-2">
              @for (pu of v.day!.punches; track $index) {
                <li class="flex items-start gap-3 rounded-field border border-border-card bg-surface px-3.5 py-2.5">
                  <span class="tabular w-12 shrink-0 text-[14px] font-bold text-primary">{{ pu.at | date: 'HH:mm' }}</span>
                  <div class="min-w-0">
                    <div class="text-[12.5px] font-bold text-primary">{{ pu.kind === 'in' ? 'Entrada' : 'Salida' }}@if (pu.manual) { · corregida }</div>
                    <div class="flex items-center gap-1 text-[12px] text-text-secondary"><app-icon name="map-pin" [size]="13" />{{ pu.place }}</div>
                    @if (pu.note) { <div class="text-[11.5px] text-text-secondary">{{ pu.note }}</div> }
                  </div>
                </li>
              }
            </ol>
          } @else {
            <p class="rounded-field border border-dashed border-border-field px-4 py-5 text-center text-[13px] text-text-secondary">No hay marcajes ese día.</p>
          }
          @if (store.canAttendance()) {
            <div class="grid grid-cols-2 gap-3">
              <app-form-field label="Entrada" for="fx-in" [required]="true"><input id="fx-in" type="time" class="field-native" [value]="fIn()" (input)="fIn.set($any($event.target).value)" /></app-form-field>
              <app-form-field label="Salida" for="fx-out" [required]="true" [error]="fixError()"><input id="fx-out" type="time" class="field-native" [value]="fOut()" (input)="fOut.set($any($event.target).value)" /></app-form-field>
            </div>
          }
        </app-form-sheet>
      }
    </app-drawer>

    <app-drawer [open]="manual()" (openChange)="!$event && go({ manual: null })" label="Marcaje manual" [width]="460">
      @if (manual()) {
        <app-form-sheet eyebrow="Asistencia" title="Marcaje manual" subtitle="Para cuando la app no pudo marcar (sin señal o sin batería)." spot="map" submitLabel="Registrar" [saving]="store.busy() === 'fix'" [error]="store.saveError()?.detail ?? null" (submitted)="saveFix(mEmp(), mDate())" (cancel)="go({ manual: null })">
          <app-form-field label="Colaborador" [required]="true"><app-select [compact]="true" [options]="attendanceOptions()" [(value)]="mEmp" ariaLabel="Colaborador" /></app-form-field>
          <app-form-field label="Día" for="mm-date" [required]="true"><input id="mm-date" type="date" class="field-native" [max]="today" [value]="mDate()" (input)="mDate.set($any($event.target).value)" /></app-form-field>
          <div class="grid grid-cols-2 gap-3">
            <app-form-field label="Entrada" for="mm-in" [required]="true"><input id="mm-in" type="time" class="field-native" [value]="fIn()" (input)="fIn.set($any($event.target).value)" /></app-form-field>
            <app-form-field label="Salida" for="mm-out" [required]="true" [error]="fixError()"><input id="mm-out" type="time" class="field-native" [value]="fOut()" (input)="fOut.set($any($event.target).value)" /></app-form-field>
          </div>
        </app-form-sheet>
      }
    </app-drawer>

    <app-drawer [open]="!!lineView()" (openChange)="!$event && go({ linea: null })" label="Línea de nómina" [width]="470">
      @if (lineView(); as v) {
        <app-line-panel [line]="v.line" [period]="v.period" [editable]="v.period.status === 'review' && store.canPayroll()" />
      }
    </app-drawer>

    <app-drawer [open]="creating()" (openChange)="!$event && go({ nuevo: null })" label="Nuevo período" [width]="460">
      @if (creating()) { <app-period-form (saved)="go({ nuevo: null, periodo: $event.id })" (cancel)="go({ nuevo: null })" /> }
    </app-drawer>

    <app-drawer [open]="acting()" (openChange)="!$event && go({ accion: null })" label="Nueva acción disciplinaria" [width]="480">
      @if (acting()) { <app-action-form (saved)="go({ accion: null })" (cancel)="go({ accion: null })" /> }
    </app-drawer>
  `,
  styles: `
    .att th.is-today, .att td.is-today { background: color-mix(in srgb, var(--color-teal-washed) 60%, white); }
    .hcell { position: relative; width: 34px; height: 28px; border-radius: 6px; font-size: 11px; font-weight: 700; color: var(--color-primary); }
    .hcell.h0 { background: #f4efe6; color: var(--color-text-secondary); }
    .hcell.h1 { background: #e6eeec; }
    .hcell.h2 { background: #c9dbd6; }
    .hcell.h3 { background: #9fbfb7; }
    .hcell:hover { outline: 2px solid var(--color-secondary); outline-offset: 1px; }
    .hcell.is-manual { box-shadow: inset 0 0 0 1.5px var(--color-secondary); }
    .hcell .dot { position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; border-radius: 99px; background: var(--color-warning); border: 1.5px solid #fff; }
    .hcell .dot.is-bad { background: var(--color-danger); }
    .prow { transition: box-shadow var(--dur-fast), transform var(--spring-snappy-dur) var(--spring-snappy); }
    .prow:hover { box-shadow: var(--shadow-e2); transform: translateY(-1px); }
  `,
})
export class HrComponent {
  protected readonly store = inject(HrStore);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly tabParam = input<string | undefined>(undefined, { alias: 'tab' });
  readonly periodo = input<string | undefined>();
  readonly linea = input<string | undefined>();
  readonly marca = input<string | undefined>();
  readonly manualParam = input<string | undefined>(undefined, { alias: 'manual' });
  readonly accion = input<string | undefined>();
  readonly nuevo = input<string | undefined>();

  protected readonly today = dayKey();
  protected readonly plural = plural;
  protected readonly money = (v: number) => gtq(v, 0);
  protected readonly money2 = (v: number) => gtq(v, 2);
  protected readonly monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  protected readonly monthDays = (() => {
    const out = [];
    const m = this.monthStart.getMonth();
    for (let d = new Date(this.monthStart); d.getMonth() === m; d = addDays(d, 1)) out.push({ key: toDayKey(d), day: d.getDate(), wd: WD[d.getDay()], sunday: d.getDay() === 0 });
    return out;
  })();

  protected readonly tabs = computed(() => [
    ...(this.store.canAttendance() ? [{ value: 'asistencia', label: 'Asistencia', count: this.store.flags().length || null, attention: true }] : []),
    ...(this.store.canSeePayroll() ? [{ value: 'nomina', label: 'Nómina', count: this.store.current() ? 1 : null, attention: true }] : []),
    ...(this.store.canDiscipline() ? [{ value: 'disciplina', label: 'Disciplina', count: this.store.pendingAck() || null }] : []),
    ...(this.store.canPayroll() ? [{ value: 'configuracion', label: 'Configuración' }] : []),
  ]);
  protected readonly tab = computed(() => {
    const t = this.tabParam();
    const list = this.tabs();
    return list.some((x) => x.value === t) ? t! : (list[0]?.value ?? 'asistencia');
  });

  protected readonly subtitle = computed(() => {
    const parts: string[] = [];
    const p = this.store.current();
    if (p) parts.push(`Nómina de ${p.name.toLowerCase()} ${p.status === 'review' ? 'en revisión' : 'abierta'}`);
    if (this.store.pendingAck()) parts.push(plural(this.store.pendingAck(), 'acción esperando acuse', 'acciones esperando acuse'));
    const noOut = this.store.flags().filter((f) => f.flag === 'no_out').length;
    if (this.store.canAttendance() && noOut) parts.push(plural(noOut, 'día sin salida', 'días sin salida') + ' este mes');
    return parts.join(' · ') || 'Asistencia, nómina y disciplina del equipo.';
  });

  private readonly att = computed(() => {
    const m = new Map<string, AttendanceDay>();
    for (const a of this.store.attendance()?.days ?? []) m.set(`${a.employee_id}|${a.date}`, a);
    return m;
  });
  protected readonly attendanceOptions = computed(() => (this.store.attendance()?.employees ?? []).map((e) => ({ value: e.id, label: `${e.full_name} · ${e.position}` })));
  protected readonly punchView = computed(() => {
    const key = this.marca();
    if (!key) return null;
    const [employee, date] = key.split('|');
    const e = this.store.attendance()?.employees.find((x) => x.id === employee);
    return e ? { employee, date, name: e.full_name, day: this.att().get(key) ?? null } : null;
  });
  protected readonly manual = computed(() => this.manualParam() !== undefined);
  protected readonly acting = computed(() => this.accion() !== undefined && this.store.canDiscipline());
  protected readonly creating = computed(() => this.nuevo() !== undefined && this.store.canPayroll());
  protected readonly lineView = computed(() => {
    const p = this.store.detail();
    const l = p?.entries.find((x) => x.id === this.linea());
    return p && l ? { period: p, line: l } : null;
  });

  protected readonly fIn = signal('07:00');
  protected readonly fOut = signal('15:00');
  protected readonly mEmp = signal('');
  protected readonly mDate = signal(dayKey());
  protected readonly fixError = computed(() => (this.fOut() <= this.fIn() ? 'Debe ser después de la entrada.' : (this.store.saveError()?.errors.find((e) => e.location === 'body.out')?.message ?? null)));

  constructor() {
    void this.store.load();
    effect(() => {
      const id = this.periodo();
      untracked(() => {
        if (id && this.store.canSeePayroll()) void this.store.openPeriod(id);
      });
    });
    effect(() => {
      const v = this.punchView();
      untracked(() => {
        if (!v) return;
        const p = v.day?.punches ?? [];
        const t = (k: 'in' | 'out', dflt: string) => {
          const x = p.find((q) => q.kind === k);
          return x ? new Date(x.at).toTimeString().slice(0, 5) : dflt;
        };
        this.fIn.set(t('in', '07:00'));
        this.fOut.set(t('out', '15:00'));
        this.store.clearSaveError();
      });
    });
  }

  protected go(params: Record<string, string | null>): void {
    const modal = ['marca', 'manual', 'linea', 'accion', 'periodo', 'nuevo'].some((k) => k in params && params[k]);
    void this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: !modal });
  }

  protected asDate(k: string): Date {
    return new Date(`${k}T12:00:00`);
  }
  protected status(p: PayrollPeriod) {
    return PERIOD_STATUS[p.status];
  }
  protected busy(p: PayrollPeriod, action: string): boolean {
    return this.store.busy() === `${p.id}:${action}` || (action === 'delete' && this.store.busy() === p.id);
  }
  protected cell(emp: string, date: string): AttendanceDay | undefined {
    return this.att().get(`${emp}|${date}`);
  }
  protected band(a: AttendanceDay): number {
    return a.hours === 0 ? 0 : a.hours < 6 ? 1 : a.hours < 8.5 ? 2 : 3;
  }
  protected isManual(a: AttendanceDay): boolean {
    return a.punches.some((p) => p.manual);
  }
  protected flagLabel(a: AttendanceDay): string {
    return a.flag ? FLAG_LABEL[a.flag] : '';
  }
  protected totalHours(emp: string): string {
    let t = 0;
    for (const a of this.store.attendance()?.days ?? []) if (a.employee_id === emp) t += a.hours;
    return t.toLocaleString('es-GT', { maximumFractionDigits: 0 });
  }

  /** Lo que todavía no viene de otros módulos, dicho en palabras. */
  protected sourceNote(p: PeriodDetail): string | null {
    if (p.status === 'closed' || !p.entries.length) return null;
    const notes: string[] = [];
    if (!p.sources.attendance) notes.push('días y horas salen del horario semanal de cada ficha (los marcajes de la app aún no están conectados)');
    if (!p.sources.tasks && p.entries.some((e) => e.pay_type === 'per_cleaning')) notes.push('las limpiezas quedan en 0 hasta conectar el itinerario: corrígelas en revisión');
    return notes.length ? `Mientras tanto, ${notes.join('; ')}.` : null;
  }

  protected onEdit(p: PeriodDetail, e: LineEdit): void {
    void this.store.updateLine(p.id, e.line.id, { [e.field]: e.value }, `${e.line.id}:${e.field}`);
  }

  protected async remove(p: PayrollPeriod): Promise<void> {
    const ok = await this.confirm.ask({ title: `Borrar ${p.name}`, message: 'Se borran el período y sus líneas. Solo se puede mientras está en borrador.', confirmLabel: 'Borrar', tone: 'danger' });
    if (ok && (await this.store.deletePeriod(p))) this.go({ periodo: null, linea: null });
  }

  protected async reopen(p: PayrollPeriod): Promise<void> {
    const ok = await this.confirm.ask({ title: 'Volver a borrador', message: 'Podrás recalcular con la asistencia y las limpiezas al día. Al recalcular se pierden las correcciones hechas en revisión.', confirmLabel: 'Volver a borrador' });
    if (ok) await this.store.run(p, 'reopen');
  }

  protected async close(p: PeriodDetail): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Cerrar ${p.name}`,
      message: `${plural(p.entries.length, 'colaborador', 'colaboradores')} · líquido ${gtq(p.totals.net, 2)} · IGSS ${gtq(p.totals.igss, 2)}. Se guardan el Excel y las boletas, y cada colaborador recibe la suya por correo. Después ya no se puede cambiar.`,
      confirmLabel: 'Cerrar período',
    });
    if (ok) await this.store.run(p, 'close');
  }

  protected openManual(): void {
    this.store.clearSaveError();
    this.mEmp.set(this.store.attendance()?.employees[0]?.id ?? '');
    this.mDate.set(dayKey());
    this.go({ manual: '1' });
  }

  protected async saveFix(employee: string, date: string): Promise<void> {
    if (this.fOut() <= this.fIn() || !employee) return;
    const reason = await this.confirm.askReason({
      title: 'Motivo de la corrección',
      message: 'Queda junto al marcaje y en la bitácora. El colaborador ve el cambio en su asistencia.',
      confirmLabel: 'Guardar',
      reasons: ['Olvidó marcar la salida', 'Sin señal en la propiedad', 'Error de la app', 'Autorizado por supervisor'],
    });
    if (!reason) return;
    if (await this.store.fix({ employee_id: employee, date, in: this.fIn(), out: this.fOut(), reason })) this.go({ marca: null, manual: null });
  }
}
