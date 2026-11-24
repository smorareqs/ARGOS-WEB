import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, latency } from '../../../core/mocks/mock-utils';
import { ApiError } from '../../../core/http/api-error';
import { Page } from '../../../core/http/page';
import {
  addDays,
  hhmm,
  minutes,
  mondayOf,
  opsPeople,
  opsProperties,
  pick,
  seeded,
  toDayKey,
} from '../../../core/mocks/demo-ops';
import { ROLE_NAMES } from '../../../core/auth/permissions';
import { Assignable, ItineraryApi, PropertyOption } from './itinerary-api.service';
import { ChecklistSection, Task, TaskDraft, TaskMove, TaskStatus, TaskType } from '../models/task.model';

const SECTIONS: readonly [string, number][] = [
  ['Cocina', 8],
  ['Baños', 6],
  ['Habitaciones', 9],
  ['Sala y comedor', 5],
  ['Entrega', 4],
];

/** Mock de `/tasks`: tres semanas de tareas por empresa, regeneradas cada lunes. */
@Injectable()
export class MockItineraryApi extends ItineraryApi {
  private readonly session = inject(SessionStore);

  private get tenant(): string {
    return mockTenantKey(this.session.tenant());
  }

  private table(): MockTable<Task> {
    const t = this.tenant;
    const week = toDayKey(mondayOf(new Date()));
    return new MockTable<Task>(`tasks_${t}_${week}`, () => seedTasks(t));
  }

  async list(from: string, to: string): Promise<Page<Task>> {
    await latency(450, 800);
    return { items: this.table().all().filter((x) => x.date >= from && x.date <= to), next_cursor: null };
  }

  async people(): Promise<readonly Assignable[]> {
    await latency(120, 240);
    return opsPeople(this.tenant, ['cleaner', 'maintenance', 'supervisor']).map((p) => ({
      id: p.id,
      name: p.name,
      initials: p.initials,
      role: ROLE_NAMES[p.role],
    }));
  }

  async properties(): Promise<readonly PropertyOption[]> {
    await latency(120, 240);
    return opsProperties(this.tenant).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      building_id: p.buildingId,
      building_name: p.buildingName,
    }));
  }

  async create(d: TaskDraft): Promise<Task> {
    await latency(500, 850);
    if (minutes(d.end) <= minutes(d.start)) {
      throw new ApiError(422, 'Revisa los datos marcados.', [
        { location: 'body.end', message: 'La hora de fin debe ser posterior a la de inicio.' },
      ]);
    }
    const prop = opsProperties(this.tenant).find((p) => p.id === d.property_id);
    if (!prop) throw new ApiError(422, 'Elige una propiedad.', [{ location: 'body.property_id', message: 'Elige una propiedad.' }]);
    const person = opsPeople(this.tenant).find((p) => p.id === d.assignee_id) ?? null;
    const rows = this.table().all();
    const task: Task = {
      id: `tk_${Date.now().toString(36)}`,
      number: Math.max(1000, ...rows.map((r) => r.number)) + 1,
      type: d.type,
      status: 'pending',
      priority: d.priority,
      property_id: prop.id,
      property_code: prop.code,
      property_name: prop.name,
      building_id: prop.buildingId,
      assignee_id: person?.id ?? null,
      assignee_name: person?.name ?? null,
      date: d.date,
      start: d.start,
      end: d.end,
      checklist: checklistFor(d.type, 'pending'),
      photos: 0,
      started_at: null,
      finished_at: null,
      reservation_code: null,
      notes: d.notes,
      consumption: [],
      discrepancy: null,
      timeline: [{ at: new Date().toISOString(), text: person ? `Creada y asignada a ${person.name}` : 'Creada sin asignar', actor: this.me() }],
    };
    this.table().update((list) => [...list, task]);
    return task;
  }

  async move(id: string, m: TaskMove): Promise<Task> {
    await latency(300, 600);
    const person = m.assignee_id === undefined ? undefined : (opsPeople(this.tenant).find((p) => p.id === m.assignee_id) ?? null);
    return this.patch(id, (t) => {
      const parts: string[] = [];
      let next: Task = t;
      if (m.date && m.date !== t.date) {
        parts.push(`Reprogramada al ${m.date.split('-').reverse().slice(0, 2).join('/')}`);
        next = { ...next, date: m.date };
      }
      if (person !== undefined && (person?.id ?? null) !== t.assignee_id) {
        parts.push(person ? `Reasignada a ${person.name}` : 'Quedó sin asignar');
        next = { ...next, assignee_id: person?.id ?? null, assignee_name: person?.name ?? null };
      }
      return { ...next, timeline: [...t.timeline, { at: new Date().toISOString(), text: `${parts.join(' · ')} · ${m.reason}`, actor: this.me() }] };
    });
  }

  async setStatus(id: string, status: TaskStatus, note?: string): Promise<Task> {
    await latency(300, 550);
    const verb: Partial<Record<TaskStatus, string>> = { validated: 'Validada', returned: 'Devuelta al colaborador', cancelled: 'Cancelada' };
    return this.patch(id, (t) => ({
      ...t,
      status,
      timeline: [...t.timeline, { at: new Date().toISOString(), text: `${verb[status] ?? status}${note ? ` · ${note}` : ''}`, actor: this.me() }],
    }));
  }

  async generateFromReservations(from: string, to: string): Promise<{ created: number }> {
    await latency(700, 1100);
    const flag = new MockTable<string>(`tasks_generated_${this.tenant}`, () => []);
    const key = `${from}_${to}`;
    if (flag.all().includes(key)) return { created: 0 };
    const rnd = seeded(`gen-${this.tenant}-${from}`);
    const rows = this.table().all();
    const props = opsProperties(this.tenant);
    const created: Task[] = [];
    let n = Math.max(1000, ...rows.map((r) => r.number));
    for (let i = 0; i < 6 && created.length < 3; i++) {
      const p = pick(rnd, props);
      const date = toDayKey(addDays(new Date(), 1 + Math.floor(rnd() * 4)));
      if (rows.some((r) => r.property_id === p.id && r.date === date) || created.some((c) => c.property_id === p.id)) continue;
      created.push({
        ...baseTask(++n, 'checkout_cleaning', p, null, date, '11:00', '14:00'),
        reservation_code: reservationCode(rnd),
        timeline: [{ at: new Date().toISOString(), text: 'Generada desde la reserva (salida)', actor: 'ARGOS' }],
      });
    }
    this.table().update((list) => [...list, ...created]);
    flag.update((k) => [...k, key]);
    return { created: created.length };
  }

  private patch(id: string, fn: (t: Task) => Task): Task {
    let out: Task | null = null;
    this.table().update((list) => list.map((t) => (t.id === id ? (out = fn(t)) : t)));
    if (!out) throw new ApiError(404, 'La tarea ya no existe.');
    return out;
  }

  private me(): string {
    return this.session.user()?.nombre ?? 'Tú';
  }
}

type Prop = ReturnType<typeof opsProperties>[number];

function baseTask(n: number, type: TaskType, p: Prop, person: { id: string; name: string } | null, date: string, start: string, end: string): Task {
  return {
    id: `tk_${n}`,
    number: n,
    type,
    status: 'pending',
    priority: 'normal',
    property_id: p.id,
    property_code: p.code,
    property_name: p.name,
    building_id: p.buildingId,
    assignee_id: person?.id ?? null,
    assignee_name: person?.name ?? null,
    date,
    start,
    end,
    checklist: checklistFor(type, 'pending'),
    photos: 0,
    started_at: null,
    finished_at: null,
    reservation_code: null,
    notes: null,
    consumption: [],
    discrepancy: null,
    timeline: [],
  };
}

function checklistFor(type: TaskType, status: TaskStatus, ratio = 0.5): ChecklistSection[] {
  const sections = type === 'maintenance' ? [['Diagnóstico', 3], ['Reparación', 4], ['Prueba y fotos', 2]] as [string, number][]
    : type === 'inspection' ? [['Estado general', 6], ['Inventario', 8], ['Daños', 4]] as [string, number][]
    : type === 'touch_up' ? SECTIONS.slice(0, 3).map(([n, c]) => [n, Math.ceil(c / 2)] as [string, number])
    : SECTIONS;
  const finished = status === 'done' || status === 'validated';
  return sections.map(([name, total], i) => ({
    name,
    total,
    done: finished ? total : status === 'in_progress' || status === 'returned' ? Math.min(total, Math.round(total * ratio * (i < 2 ? 1.6 : 0.6))) : 0,
  }));
}

function reservationCode(rnd: () => number): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'HM' + Array.from({ length: 6 }, () => abc[Math.floor(rnd() * abc.length)]).join('');
}

const iso = (date: string, hm: string, plusMin = 0) => {
  const [y, mo, d] = date.split('-').map(Number);
  const m = minutes(hm) + plusMin;
  return new Date(y, mo - 1, d, Math.floor(m / 60), m % 60).toISOString();
};

function seedTasks(tenant: string): Task[] {
  const rnd = seeded(`tasks-${tenant}-${toDayKey(mondayOf(new Date()))}`);
  const props = opsProperties(tenant);
  const cleaners = opsPeople(tenant, ['cleaner']);
  const maint = opsPeople(tenant, ['maintenance']);
  const sup = opsPeople(tenant, ['supervisor', 'admin']);
  const today = toDayKey(new Date());
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const first = addDays(mondayOf(new Date()), -7);
  const out: Task[] = [];
  let n = 1040;
  const windows = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00'];

  for (let d = 0; d < 21; d++) {
    const date = toDayKey(addDays(first, d));
    props.forEach((p, pi) => {
      if ((d + pi) % 3 !== 0 && rnd() > 0.22) return;
      const pool = cleaners.filter((c) => p.assigned.includes(c.id));
      let person: { id: string; name: string } | null = pick(rnd, pool.length ? pool : cleaners);
      if (date > today && rnd() < 0.1) person = null;
      const roll = rnd();
      const type: TaskType = roll < 0.66 ? 'checkout_cleaning' : roll < 0.8 ? 'touch_up' : roll < 0.9 ? 'deep_cleaning' : 'inspection';
      if (type === 'inspection') person = sup.length ? pick(rnd, sup) : person;
      const start = pick(rnd, windows);
      const dur = type === 'deep_cleaning' ? 240 : type === 'touch_up' ? 60 : type === 'inspection' ? 45 : 150 + Math.floor(rnd() * 3) * 30;
      out.push(finish({ ...baseTask(++n, type, p, person, date, start, hhmm(minutes(start) + dur)), reservation_code: type === 'checkout_cleaning' ? reservationCode(rnd) : null }, today, nowMin, rnd));
    });
    if (maint.length && d % 2 === 0) {
      const p = pick(rnd, props);
      out.push(finish(baseTask(++n, 'maintenance', p, pick(rnd, maint), date, '15:00', '17:00'), today, nowMin, rnd));
    }
  }

  // Hoy siempre cuenta algo: una tarea retrasada y una finalizada por validar.
  const todays = out.filter((t) => t.date === today && t.type !== 'maintenance');
  if (todays.length) {
    const late = todays[0];
    const lateIdx = out.indexOf(late);
    out[lateIdx] = finish({ ...late, start: '07:00', end: hhmm(Math.max(Math.floor((nowMin - 40) / 15) * 15, 8 * 60)), priority: 'high' }, today, nowMin, () => 0.99, 'in_progress');
  }
  if (todays.length > 1) {
    const idx = out.indexOf(todays[1]);
    out[idx] = finish({ ...todays[1], start: '06:30', end: '08:30' }, today, nowMin, () => 0.5, 'done');
  }
  // Siempre hay algo por asignar en los próximos días (fila "Sin asignar").
  out
    .filter((t) => t.date > today && t.type !== 'maintenance')
    .slice(0, 3)
    .forEach((t) => {
      const i = out.indexOf(t);
      out[i] = { ...t, assignee_id: null, assignee_name: null, timeline: [{ ...t.timeline[0], text: 'Creada sin asignar' }] };
    });
  return out;
}

function finish(t: Task, today: string, nowMin: number, rnd: () => number, force?: TaskStatus): Task {
  let status: TaskStatus = 'pending';
  if (force) status = force;
  else if (t.date < today) status = rnd() < 0.82 ? 'validated' : 'done';
  else if (t.date === today) {
    if (minutes(t.end) <= nowMin) status = rnd() < 0.55 ? 'validated' : 'done';
    else if (minutes(t.start) <= nowMin) status = 'in_progress';
  }
  const ratio = 0.35 + rnd() * 0.5;
  const started = status !== 'pending' ? iso(t.date, t.start, 4 + Math.floor(rnd() * 14)) : null;
  const finished = status === 'done' || status === 'validated' ? iso(t.date, t.end, -10 + Math.floor(rnd() * 25)) : null;
  const timeline = [
    { at: iso(t.date, '07:00', -60 * 24), text: t.assignee_name ? `Creada y asignada a ${t.assignee_name}` : 'Creada sin asignar', actor: 'Jorge Peña' },
    ...(started ? [{ at: started, text: 'Iniciada en la propiedad', actor: t.assignee_name ?? '—' }] : []),
    ...(finished ? [{ at: finished, text: 'Finalizada con evidencias', actor: t.assignee_name ?? '—' }] : []),
    ...(status === 'validated' && finished ? [{ at: new Date(new Date(finished).getTime() + 50 * 60000).toISOString(), text: 'Validada', actor: 'Jorge Peña' }] : []),
  ];
  const cleaning = t.type !== 'maintenance' && t.type !== 'inspection';
  const doneish = status === 'done' || status === 'validated';
  return {
    ...t,
    status,
    checklist: checklistFor(t.type, status, ratio),
    photos: doneish ? 6 + Math.floor(rnd() * 9) : status === 'in_progress' ? 2 + Math.floor(rnd() * 4) : 0,
    started_at: started,
    finished_at: finished,
    consumption: doneish && cleaning ? [
      { item: 'Juego de toallas', qty: 2 + Math.floor(rnd() * 3), unit: 'juegos' },
      { item: 'Papel higiénico', qty: 2 + Math.floor(rnd() * 4), unit: 'rollos' },
      { item: 'Jabón de manos', qty: 1, unit: 'unidades' },
    ] : [],
    discrepancy: doneish && cleaning && rnd() < 0.12 ? 'Devolvió 4 de 5 juegos de toallas' : null,
    timeline,
  };
}
