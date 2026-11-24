import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TeamStore } from '../../store/team.store';
import { Invitation, InviteDraft, Member } from '../../models/team.model';
import { RoleKey } from '../../../../core/auth/permissions';
import { initials } from '../../../../core/store/session.store';
import { CanDirective } from '../../../../core/auth/can.directive';
import { RoleStripComponent } from '../../components/role-strip/role-strip.component';
import { MemberDetailComponent } from '../../components/member-detail/member-detail.component';
import { InviteFormComponent } from '../../components/invite-form/invite-form.component';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { FilterChipsComponent } from '../../../../shared/molecules/filter-chips/filter-chips.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { MenuComponent } from '../../../../shared/molecules/menu/menu.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';
import {
  CellDefDirective,
  DataTableComponent,
  TableColumn,
} from '../../../../shared/organisms/data-table/data-table.component';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';

/**
 * Screen · Colaboradores (W-D1 lista con drawer de acciones rápidas y W-O2
 * usuarios, membresías e invitaciones). Filtros de rol, estado y pestaña en
 * la URL.
 */
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
@Component({
  selector: 'app-team-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoDataNoteComponent,
    CanDirective,
    RoleStripComponent,
    MemberDetailComponent,
    InviteFormComponent,
    PageHeaderComponent,
    SegmentedComponent,
    FilterChipsComponent,
    EmptyStateComponent,
    MenuComponent,
    DrawerComponent,
    DataTableComponent,
    CellDefDirective,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    IconComponent,
    InputComponent,
    RelativeDatePipe,
  ],
  providers: [TeamStore],
  templateUrl: './team.component.html',
  styles: `
    .inv { transition: box-shadow var(--dur-base), transform var(--spring-standard-dur) var(--spring-standard); }
    .inv:hover { box-shadow: var(--shadow-e2); transform: translateY(-2px); }
    .inv.is-new { border-color: var(--color-secondary); animation: flash 2.4s var(--ease-standard); }
    @keyframes flash { 0%, 40% { box-shadow: 0 0 0 6px rgba(197,135,60,.22); } }
    .leave { animation: out 220ms var(--ease-exit) both; }
    @keyframes out { to { opacity: 0; transform: scale(0.96); } }
  `,
})
export class TeamComponent {
  protected readonly store = inject(TeamStore);
  private readonly router = inject(Router);

  readonly pestana = input<string | undefined>();
  readonly rol = input<string | undefined>();
  readonly estado = input<string | undefined>();
  readonly ver = input<string | undefined>();

  protected readonly search = signal('');
  protected readonly inviting = signal(false);
  protected readonly rowMenu = signal<string | null>(null);

  protected readonly tab = computed(() => (this.pestana() === 'invitaciones' ? 'invitaciones' : 'miembros'));
  protected readonly roleFilter = computed(() => this.rol() ?? 'all');
  protected readonly statusFilter = computed(() => this.estado() ?? 'all');
  protected readonly results = computed(() => this.store.filter(this.search(), this.roleFilter(), this.statusFilter()));
  protected readonly selected = computed(() => this.store.members().find((m) => m.id === this.ver()) ?? null);

  protected readonly tabs = computed(() => [
    { value: 'miembros', label: `Miembros · ${this.store.members().length}` },
    { value: 'invitaciones', label: `Invitaciones · ${this.store.invitations().length}` },
  ]);

  protected readonly statusChips = computed(() => {
    const all = this.store.filter(this.search(), this.roleFilter(), 'all');
    return [
      { value: 'all', label: 'Todos', count: all.length },
      { value: 'active', label: 'Con acceso', count: all.filter((m) => m.status === 'active').length, dot: 'var(--color-success)' },
      { value: 'suspended', label: 'Sin acceso', count: all.filter((m) => m.status === 'suspended').length, dot: 'var(--color-danger)' },
    ];
  });

  protected readonly columns: TableColumn<Member>[] = [
    { key: 'name', label: 'Colaborador', sortable: true, value: (m) => m.full_name },
    { key: 'role', label: 'Rol', sortable: true, value: (m) => m.role_name },
    { key: 'props', label: 'Propiedades', sortable: true, align: 'right', priority: 'md', value: (m) => m.properties_count },
    { key: 'seen', label: 'Último acceso', sortable: true, priority: 'lg', value: (m) => m.last_seen_at ?? '' },
    { key: 'status', label: 'Estado', sortable: true, value: (m) => m.status },
    { key: 'actions', label: '', align: 'right', width: '56px' },
  ];
  protected readonly rowKey = (m: Member) => m.id;
  protected readonly ini = initials;

  constructor() {
    void this.store.load();
  }

  protected setParam(key: string, value: string | null): void {
    void this.router.navigate([], {
      queryParams: { [key]: value },
      queryParamsHandling: 'merge',
      replaceUrl: key !== 'ver',
    });
  }

  protected setTab(v: string): void {
    this.setParam('pestana', v === 'invitaciones' ? v : null);
  }

  protected openMember(m: Member): void {
    this.setParam('ver', m.id);
  }

  protected openFicha(m: Member): void {
    void this.router.navigate(['/colaboradores', m.id]);
  }

  protected closeMember(open: boolean): void {
    if (!open) this.setParam('ver', null);
  }

  protected openInvite(): void {
    this.store.clearInviteError();
    this.inviting.set(true);
  }

  protected async invite(draft: InviteDraft): Promise<void> {
    if (await this.store.invite(draft)) {
      this.inviting.set(false);
      this.setTab('invitaciones');
    }
  }

  protected changeRole(m: Member, role: RoleKey): void {
    void this.store.changeRole(m, role);
  }

  protected daysLeft(inv: Invitation): number {
    return Math.max(0, Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / 86_400_000));
  }

  protected propertyCodes(inv: Invitation): string {
    const map = new Map(this.store.properties().map((p) => [p.id, p.code]));
    return inv.property_ids.map((id) => map.get(id) ?? '—').join(', ');
  }

  protected stop(e: Event): void {
    e.stopPropagation();
  }
}
