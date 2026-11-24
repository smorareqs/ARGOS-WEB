import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, latency } from '../../../core/mocks/mock-utils';
import { opsPeople, opsProperties, seeded } from '../../../core/mocks/demo-ops';
import { ROLE_NAMES } from '../../../core/auth/permissions';
import { dayKey } from '../../../shared/utils/time';
import { Goal, Incentive, MetricsApi, MetricsBoard, MetricsRange } from './metrics-api.service';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Mock de métricas por empresa (determinista por período). */
@Injectable()
export class MockMetricsApi extends MetricsApi {
  private readonly session = inject(SessionStore);

  private get tenant(): string {
    return mockTenantKey(this.session.tenant());
  }
  private incentiveTable(): MockTable<Incentive> {
    const t = this.tenant;
    return new MockTable<Incentive>(`incentives_${t}_${dayKey().slice(0, 7)}`, () => seedIncentives(t));
  }

  async board(range: MetricsRange): Promise<MetricsBoard> {
    await latency(450, 800);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : new Date().getDate();
    const rnd = seeded(`met-${this.tenant}-${range}-${dayKey()}`);
    const people = opsPeople(this.tenant, ['cleaner', 'maintenance']);
    const props = opsProperties(this.tenant);
    const per_day = Array.from({ length: days }, (_, i) => {
      const date = dayKey(i - days + 1);
      const dow = new Date(`${date}T12:00:00`).getDay();
      return { date, count: Math.round((dow === 0 ? 2 : dow === 6 ? 8 : 5) * (props.length / 6) + rnd() * 4) };
    });
    const total = per_day.reduce((a, d) => a + d.count, 0);
    const weights = people.map(() => 0.6 + rnd());
    const wsum = weights.reduce((a, b) => a + b, 0);
    return {
      range,
      per_day,
      people: people.map((p, i) => {
        const cleanings = Math.round((total * weights[i]) / wsum);
        const late = Math.round(cleanings * (0.02 + rnd() * 0.12));
        return { id: p.id, name: p.name, role: ROLE_NAMES[p.role], cleanings, on_time: Math.round(((cleanings - late) / Math.max(1, cleanings)) * 100), avg_minutes: Math.round(110 + rnd() * 70), late, returned: Math.floor(rnd() * 3) };
      }),
      properties: props.map((p) => ({ code: p.code, name: p.name, cleanings: Math.round((total / props.length) * (0.5 + rnd())), avg_minutes: Math.round(90 + rnd() * 110) })),
    };
  }

  async goals(): Promise<readonly Goal[]> {
    await latency(250, 450);
    const people = opsPeople(this.tenant, ['cleaner']);
    const d = new Date().getDate();
    const month = MONTHS[new Date().getMonth()];
    return [
      { id: 'gl_team', title: 'Limpiezas a tiempo', scope: 'Todo el equipo', target: 95, current: 92, unit: '%', reward: 'Almuerzo de equipo' },
      { id: 'gl_eval', title: 'Sin devoluciones de supervisor', scope: 'Todo el equipo', target: 3, current: 5, unit: 'devoluciones máx.', reward: 'Q 100 por persona' },
      ...people.map((p, i) => ({ id: `gl_${p.id}`, title: `${30} limpiezas en ${month}`, scope: p.name, target: 30, current: Math.min(30, Math.round(d * (0.8 + i * 0.25))), unit: 'limpiezas', reward: 'Q 300' })),
    ];
  }

  async incentives(): Promise<readonly Incentive[]> {
    await latency(250, 450);
    return this.incentiveTable().all();
  }

  async decide(ids: readonly string[], status: 'approved' | 'rejected'): Promise<readonly Incentive[]> {
    await latency(400, 700);
    return this.incentiveTable().update((rows) => rows.map((r) => (ids.includes(r.id) ? { ...r, status } : r)));
  }
}

function seedIncentives(tenant: string): Incentive[] {
  const people = opsPeople(tenant, ['cleaner', 'maintenance']);
  const prev = MONTHS[(new Date().getMonth() + 11) % 12];
  return people.flatMap((p, i) => [
    { id: `in_${p.id}_a`, person_name: p.name, goal_title: `30 limpiezas en ${prev}`, amount: 300, status: i === 0 ? ('approved' as const) : ('pending' as const), period: prev },
    ...(i % 2 === 0 ? [{ id: `in_${p.id}_b`, person_name: p.name, goal_title: 'Calificación 5 estrellas de huéspedes', amount: 150, status: 'pending' as const, period: prev }] : []),
  ]);
}
