import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../store/session.store';
import { ROLE_NAMES } from '../auth/permissions';
import { AuditApi, AuditQuery, AuditRecord } from '../http/audit-api';
import { Page } from '../http/page';
import { mockTenantKey } from './demo-seed';
import { latency } from './mock-utils';
import { opsPeople, opsProperties, pick, seeded } from './demo-ops';

type Maker = (ctx: { code: string; propId: string; person: string }) => Pick<
  AuditRecord,
  'action' | 'entity' | 'entity_label' | 'before' | 'after'
> & { readonly onProperty: boolean };

const MAKERS: readonly Maker[] = [
  ({ code }) => ({ action: 'property.access_viewed', entity: 'property', entity_label: code, before: null, after: { code }, onProperty: true }),
  ({ code }) => ({ action: 'property.updated', entity: 'property', entity_label: code, before: { max_guests: 4, notes: null }, after: { max_guests: 5, notes: 'Cuna disponible' }, onProperty: true }),
  ({ code }) => ({ action: 'property.assignments_changed', entity: 'property', entity_label: code, before: { user_ids: [] }, after: { user_ids: ['1'] }, onProperty: true }),
  ({ person }) => ({ action: 'member.role_changed', entity: 'membership', entity_label: person, before: { role_key: 'cleaner' }, after: { role_key: 'supervisor' }, onProperty: false }),
  ({ person }) => ({ action: 'employee.schedule_changed', entity: 'employee', entity_label: person, before: null, after: { schedule: [] }, onProperty: false }),
  () => ({ action: 'checklist_template.updated', entity: 'checklist_template', entity_label: 'Limpieza estándar', before: { items: 11 }, after: { items: 12 }, onProperty: false }),
  ({ person }) => ({ action: 'invitation.created', entity: 'invitation', entity_label: person.toLowerCase().replace(/\s+/g, '.') + '@correo.gt', before: null, after: { role_key: 'cleaner' }, onProperty: false }),
];

const AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1) Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0) Edg/131.0',
];

/** Bitácora simulada (modo demo): 14 días de cambios creíbles por empresa. */
@Injectable()
export class MockAuditApi extends AuditApi {
  private readonly session = inject(SessionStore);

  async page(q: AuditQuery): Promise<Page<AuditRecord>> {
    await latency(400, 700);
    const rows = this.rows().filter(
      (r) =>
        (!q.property_id || r.property_id === q.property_id) &&
        (!q.actor_id || r.actor_id === q.actor_id) &&
        (!q.entity || r.entity === q.entity) &&
        (!q.action || r.action.startsWith(q.action)) &&
        (!q.from || r.created_at >= q.from) &&
        (!q.to || r.created_at < q.to),
    );
    return { items: rows.slice(0, q.limit ?? 50), next_cursor: null };
  }

  private rows(): AuditRecord[] {
    const tenant = mockTenantKey(this.session.tenant());
    const rnd = seeded(`audit2-${tenant}`);
    const staff = opsPeople(tenant, ['admin', 'supervisor', 'cleaner', 'maintenance']);
    const props = opsProperties(tenant);
    const out: AuditRecord[] = [];
    for (let i = 0; i < 80; i++) {
      const actor = pick(rnd, staff);
      const prop = pick(rnd, props);
      const made = pick(rnd, MAKERS)({ code: prop.code, propId: prop.id, person: pick(rnd, staff).name });
      const at = new Date(Date.now() - Math.floor((i * 14 * 24 * 60) / 80 + rnd() * 60) * 60000);
      out.push({
        id: `au_${i}`,
        actor_id: actor.id,
        actor_name: actor.name,
        actor_email: null,
        actor_role: ROLE_NAMES[actor.role],
        action: made.action,
        entity: made.entity,
        entity_id: null,
        entity_label: made.entity_label,
        property_id: made.onProperty ? prop.id : null,
        property_code: made.onProperty ? prop.code : null,
        property_name: made.onProperty ? prop.name : null,
        before: made.before,
        after: made.after,
        ip: `190.56.${Math.floor(rnd() * 200)}.${Math.floor(rnd() * 250)}`,
        user_agent: pick(rnd, AGENTS),
        created_at: at.toISOString(),
      });
    }
    return out;
  }
}
