import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/tokens/api.tokens';
import { SessionStore } from '../../../core/store/session.store';
import { toApiError } from '../../../core/http/api-error';
import { RoleKey } from '../../../core/auth/permissions';
import { Page } from '../../../core/http/page';
import { Invitation, InviteDraft, Member, PropertyOption, Role } from '../models/team.model';

/** Servicio puro de miembros, invitaciones y roles del tenant activo. */
export abstract class TeamApi {
  abstract members(): Promise<Page<Member>>;
  abstract invitations(): Promise<Page<Invitation>>;
  abstract roles(): Promise<Page<Role>>;
  abstract propertyOptions(): Promise<Page<PropertyOption>>;
  abstract changeRole(memberId: string, role: RoleKey): Promise<Member>;
  abstract setSuspended(memberId: string, suspended: boolean): Promise<Member>;
  abstract revokeSessions(memberId: string): Promise<void>;
  abstract invite(draft: InviteDraft): Promise<Invitation>;
  abstract resend(invitationId: string): Promise<Invitation>;
  abstract revoke(invitationId: string): Promise<void>;
}

@Injectable()
export class HttpTeamApi extends TeamApi {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionStore);
  private readonly api = `${inject(API_BASE_URL)}/api/v1`;

  private get base(): string {
    return `${this.api}/tenants/${this.session.tenant()?.id}`;
  }

  members() {
    return this.call(this.http.get<Page<Member>>(`${this.base}/members`, { params: { limit: 200 } }));
  }
  invitations() {
    return this.call(this.http.get<Page<Invitation>>(`${this.base}/invitations`, { params: { status: 'pending' } }));
  }
  roles() {
    return this.call(this.http.get<Page<Role>>(`${this.base}/roles`));
  }
  propertyOptions() {
    return this.call(
      this.http.get<Page<PropertyOption>>(`${this.api}/properties`, { params: { fields: 'id,code,name', limit: 500 } }),
    );
  }
  changeRole(memberId: string, role: RoleKey) {
    return this.call(this.http.patch<Member>(`${this.base}/members/${memberId}/role`, { role_key: role }));
  }
  setSuspended(memberId: string, suspended: boolean) {
    return this.call(
      this.http.post<Member>(`${this.base}/members/${memberId}/${suspended ? 'suspend' : 'reactivate'}`, {}),
    );
  }
  revokeSessions(memberId: string) {
    return this.call(this.http.delete<void>(`${this.base}/members/${memberId}/sessions`));
  }
  invite(draft: InviteDraft) {
    return this.call(this.http.post<Invitation>(`${this.base}/invitations`, draft));
  }
  resend(invitationId: string) {
    return this.call(this.http.post<Invitation>(`${this.base}/invitations/${invitationId}/resend`, {}));
  }
  revoke(invitationId: string) {
    return this.call(this.http.delete<void>(`${this.base}/invitations/${invitationId}`));
  }

  private async call<T>(req: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(req);
    } catch (e) {
      throw toApiError(e);
    }
  }
}
