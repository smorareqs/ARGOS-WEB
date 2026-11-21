import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { RelativeDatePipe } from '../../../../shared/pipes/relative-date.pipe';
import { initials } from '../../../../core/store/session.store';
import { RoleKey } from '../../../../core/auth/permissions';
import { Member, Role } from '../../models/team.model';
import { RolePickerComponent } from '../role-picker/role-picker.component';

/**
 * Drawer de colaborador (W-D1: acciones rápidas — cambiar rol, suspender,
 * cerrar sesiones). Sin `users.manage` es de solo lectura.
 */
@Component({
  selector: 'app-member-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, BadgeComponent, ButtonComponent, IconComponent, RelativeDatePipe, RolePickerComponent],
  template: `
    @let m = member();
    <div class="head relative overflow-hidden px-6 pb-6 pt-10">
      <div class="glow pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-pill"></div>
      <div class="reveal relative flex items-center gap-4">
        <app-avatar [initials]="ini()" [name]="m.full_name" tone="auto" [size]="64" />
        <div class="min-w-0">
          <h2 class="truncate font-display text-[28px] font-semibold leading-tight tracking-display text-white">{{ m.full_name }}</h2>
          <div class="truncate text-[12.5px] text-white/70">{{ m.email }}</div>
        </div>
      </div>
      <div class="reveal relative mt-4 flex flex-wrap gap-2" style="--i: 1">
        <app-badge [tone]="m.status === 'active' ? 'success' : 'danger'" [icon]="m.status === 'active' ? 'check-circle' : 'ban'">
          {{ m.status === 'active' ? 'Con acceso' : 'Sin acceso' }}
        </app-badge>
        <span class="inline-flex items-center rounded-xs bg-white/10 px-2.5 py-[5px] text-[11px] font-bold text-white">{{ m.role_name }}</span>
        @if (isMe()) {
          <span class="inline-flex items-center rounded-xs bg-secondary/30 px-2.5 py-[5px] text-[11px] font-bold text-secondary-light">Tú</span>
        }
      </div>
    </div>

    <div class="px-6 py-6">
      <div class="reveal grid grid-cols-3 gap-2.5" style="--i: 2">
        <div class="rounded-tile border border-border-card bg-surface p-3">
          <div class="font-display text-[22px] font-semibold leading-none text-primary">{{ m.properties_count }}</div>
          <div class="mt-1 text-[10.5px] uppercase tracking-[0.8px] text-text-secondary">Propiedades</div>
        </div>
        <div class="rounded-tile border border-border-card bg-surface p-3">
          <div class="truncate text-[13px] font-bold leading-tight text-primary">{{ m.last_seen_at | relativeDate: 'time' : 'Nunca' }}</div>
          <div class="mt-1 text-[10.5px] uppercase tracking-[0.8px] text-text-secondary">Último acceso</div>
        </div>
        <div class="rounded-tile border border-border-card bg-surface p-3">
          <div class="truncate text-[13px] font-bold leading-tight text-primary">{{ m.joined_at | relativeDate: 'day' }}</div>
          <div class="mt-1 text-[10.5px] uppercase tracking-[0.8px] text-text-secondary">Miembro desde</div>
        </div>
      </div>

      @if (m.phone) {
        <a [href]="'tel:' + m.phone" class="reveal mt-3 flex items-center gap-3 rounded-tile border border-border-card bg-surface px-4 py-3 text-[13px] text-primary hover:bg-surface-soft" style="--i: 3">
          <app-icon name="phone" [size]="16" class="text-teal-muted" /> {{ m.phone }}
        </a>
      }

      <div class="reveal mt-7" style="--i: 4">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="font-display text-[19px] font-semibold text-primary">Rol en la empresa</h3>
          @if (!canManage()) {
            <span class="text-[11.5px] text-text-secondary">Solo lectura</span>
          }
        </div>
        <app-role-picker
          [roles]="roles()"
          [value]="m.role_key"
          (valueChange)="roleChange.emit($any($event))"
          [disabled]="!canManage() || busy() || isMe()"
          [pending]="busy()"
          label="Rol del colaborador"
        />
        @if (isMe() && canManage()) {
          <p class="mt-2 text-[11.5px] text-text-secondary">No puedes cambiar tu propio rol.</p>
        }
      </div>

      @if (canManage() && !isMe()) {
        <div class="reveal mt-7 rounded-tile border border-danger/15 bg-danger-soft/50 p-4" style="--i: 5">
          <div class="text-[13px] font-bold text-danger">Acceso</div>
          <p class="mt-1 text-[12px] leading-snug text-text-body">
            Suspender corta el acceso en la app y la web de inmediato. Cerrar sesiones obliga a entrar de nuevo.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <app-button [variant]="m.status === 'active' ? 'danger' : 'secondary'" size="sm" [disabled]="busy()" (pressed)="toggleSuspend.emit()">
              <app-icon [name]="m.status === 'active' ? 'ban' : 'check'" [size]="15" />
              {{ m.status === 'active' ? 'Suspender' : 'Reactivar' }}
            </app-button>
            <app-button variant="tertiary" size="sm" [disabled]="busy() || m.status !== 'active'" (pressed)="revokeSessions.emit()">
              <app-icon name="logout" [size]="15" /> Cerrar sesiones
            </app-button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .head { background: radial-gradient(120% 120% at 100% 0%, #0a4954 0%, #003841 60%); }
    .glow { background: radial-gradient(circle, rgba(197,135,60,.28), transparent 70%); }
  `,
})
export class MemberDetailComponent {
  readonly member = input.required<Member>();
  readonly roles = input.required<readonly Role[]>();
  readonly canManage = input<boolean>(false);
  readonly busy = input<boolean>(false);
  readonly meId = input<string | null>(null);

  readonly roleChange = output<RoleKey>();
  readonly toggleSuspend = output<void>();
  readonly revokeSessions = output<void>();

  protected readonly ini = computed(() => initials(this.member().full_name));
  protected readonly isMe = computed(() => this.member().user_id === this.meId());
}
