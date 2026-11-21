import { RoleKey } from '../auth/permissions';

/**
 * Personas de las empresas demo (miembros de cada tenant). La usan los mocks
 * de propiedades (asignados, propietarios) y de colaboradores.
 */
export interface DemoPerson {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly email: string;
  readonly role: RoleKey;
  readonly status: 'active' | 'suspended';
  readonly phone: string;
  /** Días desde el último acceso (null = nunca). */
  readonly lastSeenDays: number | null;
  readonly lastSeenHour: number;
}

export const DEMO_PEOPLE: readonly DemoPerson[] = [
  { id: 'us_ana', tenantId: 'tn_garrent', name: 'Ana López', email: 'ana.lopez@garrent.gt', role: 'admin', status: 'active', phone: '+502 5512 0841', lastSeenDays: 0, lastSeenHour: 8 },
  { id: 'us_carlos', tenantId: 'tn_garrent', name: 'Carlos Ruiz', email: 'carlos.ruiz@argos.gt', role: 'admin', status: 'active', phone: '+502 4421 7730', lastSeenDays: 1, lastSeenHour: 17 },
  { id: 'us_marta', tenantId: 'tn_garrent', name: 'Marta Díaz', email: 'marta.diaz@garrent.gt', role: 'admin', status: 'active', phone: '+502 5590 1122', lastSeenDays: 3, lastSeenHour: 10 },
  { id: 'us_jorge', tenantId: 'tn_garrent', name: 'Jorge Peña', email: 'jorge.pena@garrent.gt', role: 'supervisor', status: 'active', phone: '+502 3318 4402', lastSeenDays: 0, lastSeenHour: 7 },
  { id: 'us_maria', tenantId: 'tn_garrent', name: 'María Ramos', email: 'maria.ramos@garrent.gt', role: 'cleaner', status: 'active', phone: '+502 4107 2290', lastSeenDays: 0, lastSeenHour: 9 },
  { id: 'us_luis', tenantId: 'tn_garrent', name: 'Luis Torres', email: 'luis.torres@garrent.gt', role: 'cleaner', status: 'active', phone: '+502 3022 8191', lastSeenDays: 0, lastSeenHour: 8 },
  { id: 'us_sofia', tenantId: 'tn_garrent', name: 'Sofía Méndez', email: 'sofia.mendez@garrent.gt', role: 'cleaner', status: 'active', phone: '+502 5788 3014', lastSeenDays: 0, lastSeenHour: 10 },
  { id: 'us_lucia', tenantId: 'tn_garrent', name: 'Lucía Herrera', email: 'lucia.herrera@garrent.gt', role: 'cleaner', status: 'suspended', phone: '+502 4466 9020', lastSeenDays: 21, lastSeenHour: 16 },
  { id: 'us_diego', tenantId: 'tn_garrent', name: 'Diego Castillo', email: 'diego.castillo@garrent.gt', role: 'maintenance', status: 'active', phone: '+502 3150 6677', lastSeenDays: 0, lastSeenHour: 11 },
  { id: 'us_ernesto', tenantId: 'tn_garrent', name: 'Ernesto Cux', email: 'ernesto.cux@garrent.gt', role: 'security', status: 'active', phone: '+502 5023 4489', lastSeenDays: 1, lastSeenHour: 22 },
  { id: 'us_ricardo', tenantId: 'tn_garrent', name: 'Ricardo Solís', email: 'ricardo.solis@gmail.com', role: 'owner', status: 'active', phone: '+502 5901 3366', lastSeenDays: 6, lastSeenHour: 19 },
  { id: 'us_isabel', tenantId: 'tn_garrent', name: 'Isabel Monzón', email: 'isabel.monzon@outlook.com', role: 'owner', status: 'active', phone: '+502 4230 1158', lastSeenDays: null, lastSeenHour: 0 },

  { id: 'us_carlos', tenantId: 'tn_costa', name: 'Carlos Ruiz', email: 'carlos.ruiz@argos.gt', role: 'supervisor', status: 'active', phone: '+502 4421 7730', lastSeenDays: 2, lastSeenHour: 9 },
  { id: 'us_andrea', tenantId: 'tn_costa', name: 'Andrea Cifuentes', email: 'andrea@costalimpia.com', role: 'admin', status: 'active', phone: '+502 3345 1203', lastSeenDays: 0, lastSeenHour: 8 },
  { id: 'us_pedro', tenantId: 'tn_costa', name: 'Pedro Ajú', email: 'pedro@costalimpia.com', role: 'cleaner', status: 'active', phone: '+502 4011 5532', lastSeenDays: 0, lastSeenHour: 9 },
  { id: 'us_rosa', tenantId: 'tn_costa', name: 'Rosa Xol', email: 'rosa@costalimpia.com', role: 'cleaner', status: 'active', phone: '+502 5170 2241', lastSeenDays: 1, lastSeenHour: 14 },
];

export function peopleOf(tenantId: string): DemoPerson[] {
  return DEMO_PEOPLE.filter((p) => p.tenantId === tenantId);
}
