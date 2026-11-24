import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, latency, uid } from '../../../core/mocks/mock-utils';
import { opsProperties, pick, seeded } from '../../../core/mocks/demo-ops';
import { ApiError } from '../../../core/http/api-error';
import { dayKey, hhmm, minutes } from '../../../shared/utils/time';
import { AreaBooking, BookingDraft, InHouseGuest, SharedArea, SharedAreasApi } from './shared-areas-api.service';

const NAMES = ['Valeria Gómez', 'Emily Carter', 'Lucas Fernández', 'Camila Rojas', 'Thomas Müller', 'Sophie Martin', 'Hannah Lee', 'Martina Silva', 'Daniel Morales'];

/** Mock de áreas comunes por empresa (localStorage). */
@Injectable()
export class MockSharedAreasApi extends SharedAreasApi {
  private readonly session = inject(SessionStore);

  private get tenant(): string {
    return mockTenantKey(this.session.tenant());
  }
  private areaTable(): MockTable<SharedArea> {
    const t = this.tenant;
    return new MockTable<SharedArea>(`areas_${t}`, () => seedAreas(t));
  }
  private bookingTable(): MockTable<AreaBooking> {
    const t = this.tenant;
    return new MockTable<AreaBooking>(`area_bookings_${t}_${dayKey()}`, () => seedBookings(t, this.areaTable().all()));
  }

  async areas(): Promise<readonly SharedArea[]> {
    await latency(350, 650);
    return this.areaTable().all();
  }
  async bookings(from: string, to: string): Promise<readonly AreaBooking[]> {
    await latency(300, 600);
    return this.bookingTable().all().filter((b) => b.date >= from && b.date <= to);
  }
  async guests(): Promise<readonly InHouseGuest[]> {
    const props = opsProperties(this.tenant);
    return NAMES.slice(0, 6).map((name, i) => ({ name, property_code: props[(i * 2) % props.length].code }));
  }

  async book(d: BookingDraft): Promise<AreaBooking> {
    await latency(450, 750);
    const area = this.areaTable().all().find((a) => a.id === d.area_id);
    if (!area) throw new ApiError(404, 'El área ya no existe.');
    const start = minutes(d.start);
    const end = start + area.block;
    if (start < minutes(area.opens) || end > minutes(area.closes)) {
      throw new ApiError(422, 'Revisa los datos marcados.', [{ location: 'body.start', message: `Abre de ${area.opens} a ${area.closes}.` }]);
    }
    const same = this.bookingTable().all().filter((b) => b.area_id === area.id && b.date === d.date && minutes(b.start) < end && start < minutes(b.end));
    const used = same.reduce((a, b) => a + b.people, 0);
    if (used + d.people > area.capacity) {
      throw new ApiError(422, 'Revisa los datos marcados.', [{ location: 'body.people', message: `Solo quedan ${Math.max(0, area.capacity - used)} lugares en ese horario.` }]);
    }
    const [guest, code] = d.guest.split('|');
    const perDay = this.bookingTable().all().filter((b) => b.area_id === area.id && b.date === d.date && b.guest_name === guest).length;
    if (perDay >= area.max_per_day) {
      throw new ApiError(422, `${guest} ya tiene ${perDay} bloques ese día (máximo ${area.max_per_day}).`);
    }
    const b: AreaBooking = { id: uid('ab'), area_id: area.id, date: d.date, start: d.start, end: hhmm(end), guest_name: guest, property_code: code ?? '—', people: d.people, by_staff: true };
    this.bookingTable().update((rows) => [...rows, b]);
    return b;
  }

  async cancel(id: string): Promise<void> {
    await latency(250, 450);
    this.bookingTable().update((rows) => rows.filter((b) => b.id !== id));
  }

  async saveArea(area: SharedArea): Promise<SharedArea> {
    await latency(400, 700);
    if (minutes(area.closes) <= minutes(area.opens)) {
      throw new ApiError(422, 'Revisa los datos marcados.', [{ location: 'body.closes', message: 'El cierre debe ser después de la apertura.' }]);
    }
    this.areaTable().update((rows) => rows.map((a) => (a.id === area.id ? area : a)));
    return area;
  }
}

function seedAreas(tenant: string): SharedArea[] {
  if (tenant !== 'tn_garrent') {
    return [
      { id: 'ar_pool', name: 'Piscina Marbella', building: 'Condominio Marbella', capacity: 16, opens: '08:00', closes: '20:00', block: 120, max_per_day: 2, advance_hours: 12, rules: 'Niños con un adulto. Sin envases de vidrio.', photo: 'beachPool', active: true },
    ];
  }
  return [
    { id: 'ar_pool', name: 'Piscina de la terraza', building: 'Torre Botánica', capacity: 12, opens: '07:00', closes: '21:00', block: 60, max_per_day: 2, advance_hours: 24, rules: 'Ducha antes de entrar. Niños con un adulto. Sin envases de vidrio.', photo: 'beachPool', active: true },
    { id: 'ar_salon', name: 'Salón social', building: 'Residencial Cayalá', capacity: 30, opens: '09:00', closes: '22:00', block: 180, max_per_day: 1, advance_hours: 48, rules: 'Música hasta las 21:30. Se entrega limpio.', photo: 'brightRoom', active: true },
    { id: 'ar_patio', name: 'Patio colonial', building: 'Hostal Antigua', capacity: 14, opens: '08:00', closes: '21:00', block: 90, max_per_day: 2, advance_hours: 6, rules: 'Desayunos de 8 a 10 para todos los huéspedes.', photo: 'antiguaArch', active: true },
    { id: 'ar_deck', name: 'Muelle y terraza al lago', building: 'Villa Vista al Lago', capacity: 10, opens: '07:00', closes: '19:00', block: 120, max_per_day: 2, advance_hours: 12, rules: 'Chaleco salvavidas para kayak. Sin acceso después del atardecer.', photo: 'lakeRoom', active: true },
  ];
}

function seedBookings(tenant: string, areas: readonly SharedArea[]): AreaBooking[] {
  const rnd = seeded(`ab-${tenant}-${dayKey()}`);
  const props = opsProperties(tenant);
  const out: AreaBooking[] = [];
  for (let d = 0; d < 7; d++) {
    const date = dayKey(d);
    for (const a of areas) {
      const slots = Math.floor((minutes(a.closes) - minutes(a.opens)) / a.block);
      for (let s = 0; s < slots; s++) {
        if (rnd() > (d === 0 ? 0.42 : 0.3)) continue;
        const start = minutes(a.opens) + s * a.block;
        out.push({
          id: `ab_${a.id}_${d}_${s}`,
          area_id: a.id,
          date,
          start: hhmm(start),
          end: hhmm(start + a.block),
          guest_name: pick(rnd, NAMES),
          property_code: pick(rnd, props).code,
          people: 1 + Math.floor(rnd() * Math.min(6, a.capacity / 2)),
          by_staff: rnd() < 0.2,
        });
      }
    }
  }
  return out;
}
