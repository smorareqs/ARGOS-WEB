import { RoleKey } from '../auth/permissions';
import { DemoPerson, peopleOf } from './demo-people';
import { DEMO_BUILDINGS, DEMO_PROPERTY_ROWS, seededPropertyId } from './demo-properties';
import { PropertySeedSetting } from './demo-properties.types';

export { addDays, dayKey, gtq, hhmm, minutes, mondayOf, toDayKey } from '../../shared/utils/time';

/**
 * Base común de los mocks de operación (itinerario, inventario, mantenimiento,
 * reservas, RRHH…). Todo se deriva de las propiedades y las personas de cada
 * empresa demo, así los módulos cuentan la misma historia: la limpieza que se
 * retrasa en el itinerario es la que aparece en alertas y en métricas.
 */

export interface OpsProperty {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly buildingId: string | null;
  readonly buildingName: string | null;
  readonly zone: string;
  readonly setting: PropertySeedSetting;
  readonly assigned: readonly string[];
  readonly status: string;
  readonly active: boolean;
}

export interface OpsPerson {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly role: RoleKey;
}

export function opsProperties(tenant: string, includeInactive = false): OpsProperty[] {
  const buildings = DEMO_BUILDINGS[tenant] ?? [];
  return (DEMO_PROPERTY_ROWS[tenant] ?? [])
    .map((r, i) => {
      const b = buildings.find((x) => x.id === r.building) ?? null;
      return {
        id: seededPropertyId(tenant, i),
        code: r.code,
        name: r.name,
        buildingId: b?.id ?? null,
        buildingName: b?.name ?? null,
        zone: b?.zone ?? r.zone ?? '',
        setting: b?.setting ?? r.setting ?? 'city',
        assigned: r.assigned,
        status: r.status,
        active: r.active !== false,
      };
    })
    .filter((p) => includeInactive || p.active);
}

export function opsPeople(tenant: string, roles?: readonly RoleKey[]): OpsPerson[] {
  return peopleOf(tenant)
    .filter((p: DemoPerson) => p.status === 'active' && (!roles || roles.includes(p.role)))
    .map((p) => ({ id: p.id, name: p.name, initials: personInitials(p.name), role: p.role }));
}

export function personInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

/** Generador pseudoaleatorio estable (mulberry32) para semillas repetibles. */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rnd: () => number, list: readonly T[]): T {
  return list[Math.floor(rnd() * list.length) % list.length];
}
