import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, isoFromToday, latency } from '../../../core/mocks/mock-utils';
import { opsProperties } from '../../../core/mocks/demo-ops';
import { ApiError } from '../../../core/http/api-error';
import { Alert, AlertSummary, AlertType, AlertsApi, Severity } from './alerts-api.service';

const SEED: readonly [AlertType, Severity, string, string, number][] = [
  ['asset_failure', 'high', 'asset', 'Bomba de la piscina {p}: fuera de servicio', 1],
  ['task_late', 'high', 'task', 'Limpieza de salida retrasada en {p}', 0],
  ['maintenance_overdue', 'medium', 'maintenance_plan', 'Preventivo vencido: Purga del tanque de Calentador ({p})', 3],
  ['low_stock', 'medium', 'inventory_item', 'Toallas de baño: 4 de 20 pza en Bodega central', 0],
  ['discrepancy_open', 'medium', 'inventory_discrepancy', 'Faltan 2 juegos de sábanas en la custodia de {p}', 2],
  ['asset_failure', 'medium', 'asset', 'A/C de la sala en {p}: necesita atención', 5],
];

/** Mock de alertas por empresa (solo el build de demostración). */
@Injectable()
export class MockAlertsApi extends AlertsApi {
  private readonly session = inject(SessionStore);

  private table(): MockTable<Alert> {
    const t = mockTenantKey(this.session.tenant());
    return new MockTable<Alert>(`alerts_v2_${t}`, () => {
      const props = opsProperties(t);
      return SEED.map(([type, severity, entity, msg, days], i) => {
        const p = entity === 'inventory_item' ? null : props[(i * 3) % Math.max(1, props.length)] ?? null;
        const at = isoFromToday(-days, 8 + i);
        return {
          id: `al_${t}_${i}`, type, severity, status: i === 5 ? 'acknowledged' : 'active', entity_type: entity, entity_id: `${entity}_${i}`,
          property_id: p?.id ?? null, property_code: p?.code ?? null, property_name: p?.name ?? null,
          message: msg.replace('{p}', p?.code ?? ''), created_at: at, updated_at: at,
          acknowledged_at: i === 5 ? at : null, acknowledged_by_name: i === 5 ? 'Jorge Peña' : null, resolved_at: null, resolved_by_name: null,
        } satisfies Alert;
      });
    });
  }

  async list(status: 'open' | 'resolved'): Promise<readonly Alert[]> {
    await latency();
    return this.table().all().filter((a) => (status === 'open' ? a.status !== 'resolved' : a.status === 'resolved'));
  }

  async summary(): Promise<AlertSummary> {
    const open = (await this.list('open'));
    const types = [...new Set(open.map((a) => a.type))];
    return {
      open: open.length, high: open.filter((a) => a.severity === 'high').length, fresh: open.filter((a) => a.status === 'active').length,
      by_type: types.map((type) => {
        const of = open.filter((a) => a.type === type);
        return { type, open: of.length, high: of.filter((a) => a.severity === 'high').length, fresh: of.filter((a) => a.status === 'active').length };
      }),
    };
  }

  acknowledge(id: string): Promise<Alert> {
    return this.patch(id, (a) => ({ ...a, status: 'acknowledged', acknowledged_at: new Date().toISOString(), acknowledged_by_name: this.session.user()?.nombre ?? 'Tú' }));
  }

  resolve(id: string): Promise<Alert> {
    return this.patch(id, (a) => ({ ...a, status: 'resolved', resolved_at: new Date().toISOString(), resolved_by_name: this.session.user()?.nombre ?? 'Tú' }));
  }

  private async patch(id: string, fn: (a: Alert) => Alert): Promise<Alert> {
    await latency(240, 420);
    let out: Alert | null = null;
    this.table().update((rows) => rows.map((a) => (a.id === id ? (out = fn(a)) : a)));
    if (!out) throw new ApiError(404, 'La alerta no existe.');
    return out;
  }
}
