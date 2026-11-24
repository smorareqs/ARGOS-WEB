import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, latency, uid } from '../../../core/mocks/mock-utils';
import { opsProperties, pick, seeded } from '../../../core/mocks/demo-ops';
import { ApiError } from '../../../core/http/api-error';
import { dayKey } from '../../../shared/utils/time';
import { AssignableStay, AssignmentDraft, ParkingApi, ParkingAssignment, ParkingSpace } from './parking-api.service';

const NAMES = ['Valeria Gómez', 'Emily Carter', 'Lucas Fernández', 'Camila Rojas', 'Thomas Müller', 'Sophie Martin', 'Hannah Lee', 'Martina Silva', 'Daniel Morales', 'Roberto Ixcot'];

/** Mock de parqueos por empresa (localStorage). */
@Injectable()
export class MockParkingApi extends ParkingApi {
  private readonly session = inject(SessionStore);

  private get tenant(): string {
    return mockTenantKey(this.session.tenant());
  }
  private spaceTable(): MockTable<ParkingSpace> {
    const t = this.tenant;
    return new MockTable<ParkingSpace>(`parking_spaces_${t}`, () => seedSpaces(t));
  }
  private assignTable(): MockTable<ParkingAssignment> {
    const t = this.tenant;
    return new MockTable<ParkingAssignment>(`parking_assign_${t}_${dayKey()}`, () => seedAssignments(t, this.spaceTable().all()));
  }

  async spaces(): Promise<readonly ParkingSpace[]> {
    await latency(350, 650);
    return this.spaceTable().all();
  }
  async assignments(from: string, to: string): Promise<readonly ParkingAssignment[]> {
    await latency(300, 550);
    return this.assignTable().all().filter((a) => a.from <= to && a.to > from);
  }
  async stays(): Promise<readonly AssignableStay[]> {
    const props = opsProperties(this.tenant).filter((p) => p.buildingName);
    const rnd = seeded(`stays-${this.tenant}-${dayKey()}`);
    const taken = new Set(this.assignTable().all().map((a) => a.reservation_code));
    return Array.from({ length: 8 }, (_, i) => {
      const p = props[i % props.length];
      const from = dayKey(Math.floor(i / 2));
      return { reservation_code: `R${(48213 + i * 7919).toString(36).toUpperCase().slice(-5)}`, guest_name: pick(rnd, NAMES), property_code: p.code, building: p.buildingName!, from, to: dayKey(Math.floor(i / 2) + 2 + (i % 3)) };
    }).filter((s) => !taken.has(s.reservation_code));
  }

  async assign(d: AssignmentDraft): Promise<ParkingAssignment> {
    await latency(450, 750);
    const plate = d.plate.trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z]{1,3}-?\d{3}[A-Z]{3}$|^[A-Z0-9-]{5,9}$/.test(plate)) {
      throw new ApiError(422, 'Revisa los datos marcados.', [{ location: 'body.plate', message: 'Escribe la placa como P123ABC.' }]);
    }
    const stay = (await this.stays()).find((s) => s.reservation_code === d.reservation_code);
    if (!stay) throw new ApiError(422, 'Revisa los datos marcados.', [{ location: 'body.reservation_code', message: 'Elige una reserva.' }]);
    const clash = this.assignTable().all().find((a) => a.space_id === d.space_id && a.from < stay.to && stay.from < a.to);
    if (clash) throw new ApiError(409, 'Revisa los datos marcados.', [{ location: 'body.space_id', message: `Ocupado por ${clash.plate} (${clash.guest_name}) en esas fechas.` }]);
    const a: ParkingAssignment = { id: uid('pa'), space_id: d.space_id, reservation_code: stay.reservation_code, guest_name: stay.guest_name, property_code: stay.property_code, plate, from: stay.from, to: stay.to };
    this.assignTable().update((rows) => [...rows, a]);
    return a;
  }

  async release(id: string): Promise<void> {
    await latency(250, 450);
    this.assignTable().update((rows) => rows.filter((a) => a.id !== id));
  }

  async setBlocked(spaceId: string, blocked: boolean): Promise<void> {
    await latency(250, 450);
    this.spaceTable().update((rows) => rows.map((s) => (s.id === spaceId ? { ...s, blocked } : s)));
  }
}

function seedSpaces(tenant: string): ParkingSpace[] {
  const buildings = tenant === 'tn_garrent' ? [['Torre Botánica', 'Sótano 2'], ['Residencial Cayalá', 'Nivel 1']] : [['Condominio Marbella', 'Exterior']];
  const out: ParkingSpace[] = [];
  buildings.forEach(([building, level], bi) => {
    const n = bi === 0 ? 12 : 8;
    for (let i = 1; i <= n; i++) {
      out.push({ id: `sp_${bi}_${i}`, code: `${building.split(' ')[0].slice(0, 1)}-${String(i).padStart(2, '0')}`, building, level, kind: i > n - 2 ? 'visitor' : i === 1 ? 'staff' : 'guest', covered: level !== 'Exterior' || i <= 4, blocked: i === 6 && bi === 0 });
    }
  });
  return out;
}

function seedAssignments(tenant: string, spaces: readonly ParkingSpace[]): ParkingAssignment[] {
  const rnd = seeded(`pa-${tenant}-${dayKey()}`);
  const props = opsProperties(tenant);
  const out: ParkingAssignment[] = [];
  for (const s of spaces) {
    if (s.kind !== 'guest' || s.blocked) continue;
    let cursor = -2 + Math.floor(rnd() * 3);
    while (cursor < 9) {
      const gap = Math.floor(rnd() * 3);
      const len = 1 + Math.floor(rnd() * 4);
      if (rnd() < 0.7) {
        const letters = 'BCDFGHJKLMNPRSTVWXYZ';
        const plate = `P${100 + Math.floor(rnd() * 900)}${Array.from({ length: 3 }, () => letters[Math.floor(rnd() * letters.length)]).join('')}`;
        out.push({ id: `pa_${s.id}_${cursor}`, space_id: s.id, reservation_code: `R${Math.floor(rnd() * 0xfffff).toString(36).toUpperCase().padStart(5, '0').slice(0, 5)}`, guest_name: pick(rnd, NAMES), property_code: pick(rnd, props).code, plate, from: dayKey(cursor + gap), to: dayKey(cursor + gap + len) });
      }
      cursor += gap + len;
    }
  }
  return out;
}
