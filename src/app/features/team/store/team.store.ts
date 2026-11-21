import { Injectable, computed, inject, signal } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ApiError, toApiError } from '../../../core/http/api-error';
import { RoleKey } from '../../../core/auth/permissions';
import { TeamApi } from '../services/team-api.service';
import { Invitation, InviteDraft, Member, PropertyOption, Role } from '../models/team.model';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Tienda de Colaboradores (W-D1 lista, W-O2 usuarios y membresías).
 * Acciones con confirmación cuando son destructivas y "Deshacer" en toast
 * cuando se pueden revertir (ux-ui.md §3.5).
 */
@Injectable()
export class TeamStore {
  private readonly api = inject(TeamApi);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  private readonly _members = signal<readonly Member[]>([]);
  private readonly _invitations = signal<readonly Invitation[]>([]);
  private readonly _roles = signal<readonly Role[]>([]);
  private readonly _properties = signal<readonly PropertyOption[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _busy = signal<string | null>(null);
  private readonly _inviting = signal(false);
  private readonly _inviteError = signal<ApiError | null>(null);
  private readonly _justInvited = signal<string | null>(null);

  readonly members = this._members.asReadonly();
  readonly invitations = this._invitations.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly properties = this._properties.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  /** Id del miembro o invitación con una acción en curso. */
  readonly busy = this._busy.asReadonly();
  readonly inviting = this._inviting.asReadonly();
  readonly inviteError = this._inviteError.asReadonly();
  readonly justInvited = this._justInvited.asReadonly();

  readonly canManage = computed(() => this.session.can('users.manage'));
  readonly meId = computed(() => this.session.user()?.id ?? null);

  readonly roleCounts = computed(() => {
    const counts: Partial<Record<RoleKey, number>> = {};
    for (const m of this._members()) if (m.status === 'active') counts[m.role_key] = (counts[m.role_key] ?? 0) + 1;
    return counts;
  });

  readonly summary = computed(() => ({
    active: this._members().filter((m) => m.status === 'active').length,
    suspended: this._members().filter((m) => m.status === 'suspended').length,
    pending: this._invitations().length,
  }));

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const [members, invitations, roles, properties] = await Promise.all([
        this.api.members(),
        this.api.invitations(),
        this.api.roles(),
        this.api.propertyOptions(),
      ]);
      this._members.set(members.items);
      this._invitations.set(invitations.items);
      this._roles.set(roles.items);
      this._properties.set(properties.items);
    } catch (err) {
      this._error.set(toApiError(err).detail);
    } finally {
      this._loading.set(false);
    }
  }

  filter(q: string, role: string, status: string): Member[] {
    const needle = norm(q.trim());
    return this._members().filter(
      (m) =>
        (role === 'all' || m.role_key === role) &&
        (status === 'all' || m.status === status) &&
        (needle.length < 2 || norm(`${m.full_name} ${m.email}`).includes(needle)),
    );
  }

  async changeRole(member: Member, role: RoleKey): Promise<void> {
    if (member.role_key === role) return;
    const previous = member.role_key;
    await this.run(member.id, async () => {
      this.replace(await this.api.changeRole(member.id, role));
      this.toast.success(`${firstName(member)} ahora es ${this.roleName(role)}.`, {
        label: 'Deshacer',
        run: () => void this.run(member.id, async () => this.replace(await this.api.changeRole(member.id, previous))),
      });
    });
  }

  async toggleSuspend(member: Member): Promise<void> {
    const suspend = member.status === 'active';
    if (suspend) {
      const ok = await this.confirm.ask({
        title: `¿Suspender a ${member.full_name}?`,
        message:
          'Perderá el acceso a la app y a la web de inmediato y se cerrarán sus sesiones. Sus tareas asignadas quedan sin responsable. Puedes reactivar su acceso después.',
        confirmLabel: 'Suspender',
        tone: 'danger',
      });
      if (!ok) return;
    }
    await this.run(member.id, async () => {
      this.replace(await this.api.setSuspended(member.id, suspend));
      if (suspend) {
        this.toast.success(`Se suspendió el acceso de ${member.full_name}.`, {
          label: 'Deshacer',
          run: () => void this.run(member.id, async () => this.replace(await this.api.setSuspended(member.id, false))),
        });
      } else {
        this.toast.success(`${member.full_name} vuelve a tener acceso.`);
      }
    });
  }

  async revokeSessions(member: Member): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Cerrar todas sus sesiones',
      message: `${member.full_name} tendrá que iniciar sesión de nuevo en todos sus dispositivos.`,
      confirmLabel: 'Cerrar sesiones',
      tone: 'danger',
    });
    if (!ok) return;
    await this.run(member.id, async () => {
      await this.api.revokeSessions(member.id);
      this.toast.success('Sesiones cerradas.');
    });
  }

  async invite(draft: InviteDraft): Promise<boolean> {
    this._inviting.set(true);
    this._inviteError.set(null);
    try {
      const inv = await this.api.invite(draft);
      this._invitations.update((list) => [inv, ...list]);
      this._justInvited.set(inv.id);
      setTimeout(() => this._justInvited.set(null), 2600);
      this.toast.success(`Invitación enviada a ${inv.email}.`);
      return true;
    } catch (err) {
      this._inviteError.set(toApiError(err));
      return false;
    } finally {
      this._inviting.set(false);
    }
  }

  clearInviteError(): void {
    this._inviteError.set(null);
  }

  async resend(inv: Invitation): Promise<void> {
    await this.run(inv.id, async () => {
      const updated = await this.api.resend(inv.id);
      this._invitations.update((list) => list.map((i) => (i.id === inv.id ? updated : i)));
      this.toast.success(`Reenviamos la invitación a ${inv.email}. Vence en 7 días.`);
    });
  }

  async revoke(inv: Invitation): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Revocar la invitación?',
      message: `El enlace que recibió ${inv.email} dejará de funcionar. Podrás invitarle de nuevo cuando quieras.`,
      confirmLabel: 'Revocar',
      tone: 'danger',
    });
    if (!ok) return;
    await this.run(inv.id, async () => {
      await this.api.revoke(inv.id);
      this._invitations.update((list) => list.filter((i) => i.id !== inv.id));
      this.toast.show('Invitación revocada.');
    });
  }

  roleName(key: RoleKey): string {
    return this._roles().find((r) => r.key === key)?.name ?? key;
  }

  private replace(m: Member): void {
    this._members.update((list) => list.map((x) => (x.id === m.id ? m : x)));
  }

  private async run(id: string, fn: () => Promise<void>): Promise<void> {
    this._busy.set(id);
    try {
      await fn();
    } catch (err) {
      this.toast.error(toApiError(err).detail);
    } finally {
      this._busy.set(null);
    }
  }
}

function firstName(m: Member): string {
  return m.full_name.split(' ')[0];
}
