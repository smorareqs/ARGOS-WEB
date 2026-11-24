import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionStore, initials } from '../../../../core/store/session.store';
import { ToastService } from '../../../../core/services/toast.service';
import { ApiError, toApiError } from '../../../../core/http/api-error';
import { RoleKey } from '../../../../core/auth/permissions';
import { TabOption, TabsComponent } from '../../../../shared/molecules/tabs/tabs.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { PickerPerson, UserPickerComponent } from '../../../../shared/molecules/user-picker/user-picker.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { SpinnerComponent } from '../../../../shared/atoms/spinner/spinner.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';
import { TeamStore } from '../../store/team.store';
import { Member } from '../../models/team.model';
import { Employee, EmployeeDraft, PAY_UNIT, ScheduleBlock } from '../../models/employee.model';
import { EmployeesApi } from '../../services/employees-api.service';
import { RolePickerComponent } from '../../components/role-picker/role-picker.component';
import { EmployeeFormComponent } from '../../components/employee-form/employee-form.component';
import { ScheduleEditorComponent } from '../../components/schedule-editor/schedule-editor.component';
import { PropertiesApi } from '../../../properties/services/properties-api.service';
import { Property } from '../../../properties/models/property.model';
import { PropertyCoverComponent } from '../../../properties/components/property-cover/property-cover.component';
import { placeOf } from '../../../properties/components/property-card/property-card.component';
import { EmployeeHrComponent } from '../../../hr/components/employee-hr/employee-hr.component';

type Tab = 'perfil' | 'laboral' | 'horario' | 'propiedades' | 'nomina' | 'disciplina';

/**
 * Screen · Ficha de colaborador (W-D2, /colaboradores/:id). Cabecera con la
 * persona y su estado; pestañas Perfil (rol, acceso y sesiones), Laboral
 * (ficha de employees), Horario (grilla semanal) y Propiedades (asignadas o,
 * para propietarios, propias). Las pestañas de RRHH llegan en la fase 5.
 */
@Component({
  selector: 'app-member-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TabsComponent,
    EmptyStateComponent,
    UserPickerComponent,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    IconComponent,
    SpinnerComponent,
    RelativeDatePipe,
    RolePickerComponent,
    EmployeeFormComponent,
    ScheduleEditorComponent,
    PropertyCoverComponent,
    EmployeeHrComponent,
  ],
  providers: [TeamStore],
  templateUrl: './member-page.component.html',
  styles: `
    :host { display: block; }
    .head { background: radial-gradient(120% 140% at 100% 0%, #0a4954 0%, #003841 62%); }
    .glow { background: radial-gradient(circle, rgba(197,135,60,.26), transparent 70%); }
    .back { color: var(--color-teal-muted); }
    .back:hover { color: var(--color-primary); }
    .prop { transition: box-shadow var(--dur-base), transform var(--spring-standard-dur) var(--spring-standard); }
    .prop:hover { box-shadow: var(--shadow-e2); transform: translateY(-2px); }
    @media (prefers-reduced-motion: reduce) { .prop { transition: none; } }
  `,
})
export class MemberPageComponent {
  protected readonly store = inject(TeamStore);
  private readonly employees = inject(EmployeesApi);
  private readonly propertiesApi = inject(PropertiesApi);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Id de la membresía (ruta) y pestaña (query param). */
  readonly id = input.required<string>();
  readonly seccion = input<string | undefined>();

  protected readonly employee = signal<Employee | null>(null);
  protected readonly employeeLoading = signal(false);
  protected readonly employeeSaving = signal(false);
  protected readonly employeeError = signal<ApiError | null>(null);
  protected readonly scheduleSaving = signal(false);
  protected readonly props = signal<readonly Property[]>([]);
  protected readonly allProps = signal<readonly Property[]>([]);
  protected readonly propsLoading = signal(false);
  protected readonly propsSaving = signal(false);
  protected readonly draftProps = signal<readonly string[]>([]);

  protected readonly canLabor = computed(() => this.session.can('users.manage'));
  protected readonly canAssign = computed(() => this.session.can('properties.manage'));
  protected readonly canSeeProps = computed(() => this.session.can('properties.read'));
  /** RRHH en la ficha (W-D2): nómina con la bandera payroll y disciplina. */
  protected readonly canPayrollTab = computed(() => this.session.hasFeature('payroll') && this.session.canAny(['hr.payroll.manage', 'hr.payroll.export']));
  protected readonly canDisciplineTab = computed(() => this.session.can('hr.disciplinary.manage'));

  protected readonly member = computed<Member | null>(() => this.store.members().find((m) => m.id === this.id()) ?? null);
  protected readonly isMe = computed(() => this.member()?.user_id === this.store.meId());
  protected readonly isOwner = computed(() => this.member()?.role_key === 'owner');
  protected readonly ini = initials;

  protected readonly tab = computed<Tab>(() => {
    const s = this.seccion() as Tab | undefined;
    return s && this.tabOptions().some((t) => t.value === s) ? s : 'perfil';
  });

  protected readonly tabOptions = computed<TabOption[]>(() => [
    { value: 'perfil', label: 'Perfil' },
    ...(this.canLabor() ? [{ value: 'laboral', label: 'Laboral' }, { value: 'horario', label: 'Horario' }] : []),
    ...(this.canSeeProps() ? [{ value: 'propiedades', label: 'Propiedades', count: this.member()?.properties_count ?? null }] : []),
    ...(this.employee() && this.canPayrollTab() ? [{ value: 'nomina', label: 'Nómina' }] : []),
    ...(this.employee() && this.canDisciplineTab() ? [{ value: 'disciplina', label: 'Disciplina' }] : []),
  ]);

  protected readonly pay = computed(() => {
    const e = this.employee();
    return e ? `Q ${e.pay_rate.toLocaleString('es-GT', { minimumFractionDigits: 2 })} ${PAY_UNIT[e.pay_type]}` : null;
  });

  protected readonly propertyOptions = computed<PickerPerson[]>(() =>
    this.allProps().map((p) => ({ id: p.id, name: p.name, tag: p.code, detail: placeOf(p), muted: !p.is_active })),
  );
  protected readonly propsDirty = computed(() => [...this.draftProps()].sort().join() !== this.props().map((p) => p.id).sort().join());
  protected readonly place = placeOf;

  constructor() {
    void this.store.load();
    effect(() => {
      const m = this.member();
      untracked(() => {
        if (!m) return;
        void this.loadEmployee(m.user_id);
        void this.loadProps(m);
      });
    });
  }

  private async loadEmployee(userId: string): Promise<void> {
    if (!this.canLabor() && !this.canPayrollTab() && !this.canDisciplineTab()) return;
    this.employeeLoading.set(true);
    try {
      this.employee.set(await this.employees.byUser(userId));
    } catch {
      this.employee.set(null);
    } finally {
      this.employeeLoading.set(false);
    }
  }

  private async loadProps(m: Member): Promise<void> {
    if (!this.canSeeProps()) return;
    this.propsLoading.set(true);
    try {
      const mine = await this.propertiesApi.list(m.role_key === 'owner' ? { owner: m.user_id } : { assignee: m.user_id });
      this.props.set(mine);
      this.draftProps.set(mine.map((p) => p.id));
      if (this.canAssign()) this.allProps.set(await this.propertiesApi.list());
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    } finally {
      this.propsLoading.set(false);
    }
  }

  protected setTab(v: string): void {
    void this.router.navigate([], { queryParams: { seccion: v === 'perfil' ? null : v }, replaceUrl: true });
  }

  protected changeRole(role: RoleKey): void {
    const m = this.member();
    if (m) void this.store.changeRole(m, role);
  }

  protected async saveEmployee(draft: EmployeeDraft): Promise<void> {
    this.employeeSaving.set(true);
    this.employeeError.set(null);
    try {
      const cur = this.employee();
      this.employee.set(cur ? await this.employees.update(cur.id, draft) : await this.employees.create(draft));
      this.toast.success(cur ? 'Ficha laboral guardada.' : 'Ficha laboral creada. Ya puedes cargar su horario.');
    } catch (e) {
      this.employeeError.set(toApiError(e));
    } finally {
      this.employeeSaving.set(false);
    }
  }

  protected async saveSchedule(blocks: ScheduleBlock[]): Promise<void> {
    const e = this.employee();
    if (!e) return;
    this.scheduleSaving.set(true);
    try {
      this.employee.set(await this.employees.setSchedule(e.id, blocks));
      this.toast.success('Horario guardado.');
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this.scheduleSaving.set(false);
    }
  }

  protected async saveProps(): Promise<void> {
    const m = this.member();
    if (!m) return;
    this.propsSaving.set(true);
    try {
      const ids = this.draftProps();
      if (this.isOwner()) await this.propertiesApi.setUserOwnerships(m.user_id, ids);
      else await this.propertiesApi.setUserAssignments(m.user_id, ids);
      this.toast.success(this.isOwner() ? 'Propiedades del propietario guardadas.' : 'Propiedades asignadas guardadas.');
      await this.store.load();
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    } finally {
      this.propsSaving.set(false);
    }
  }

  protected resetProps(): void {
    this.draftProps.set(this.props().map((p) => p.id));
  }
}
