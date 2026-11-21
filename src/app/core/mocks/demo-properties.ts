import { PropertySeedType, PropertySeedSetting, PropertySeedStatus } from './demo-properties.types';

/**
 * Propiedades y edificios de las empresas demo (backend simulado). Los usan
 * el mock de propiedades y el de colaboradores (propiedades asignables).
 */
export interface BuildingSeed {
  readonly id: string;
  readonly name: string;
  readonly zone: string;
  readonly setting: PropertySeedSetting;
}

export interface PropertySeedRow {
  code: string;
  name: string;
  type: PropertySeedType;
  building: string | null;
  zone?: string;
  setting?: PropertySeedSetting;
  rooms: [number, number, number];
  status: PropertySeedStatus;
  incidents?: number;
  last: [number, number, number] | null;
  assigned: string[];
  owners?: string[];
  active?: boolean;
  access?: string;
}

export const DEMO_BUILDINGS: Record<string, BuildingSeed[]> = {
  tn_garrent: [
    { id: 'bd_bot', name: 'Torre Botánica', zone: 'Zona 10, Ciudad de Guatemala', setting: 'city' },
    { id: 'bd_cay', name: 'Residencial Cayalá', zone: 'Zona 16, Ciudad de Guatemala', setting: 'city' },
    { id: 'bd_ant', name: 'Hostal Antigua', zone: 'Antigua Guatemala', setting: 'colonial' },
  ],
  tn_costa: [{ id: 'bd_mar', name: 'Condominio Marbella', zone: 'Puerto de San José, Escuintla', setting: 'beach' }],
};


export const DEMO_PROPERTY_ROWS: Record<string, PropertySeedRow[]> = {
  tn_garrent: [
    { code: 'TB-504', name: 'Torre Botánica 504', type: 'apartment', building: 'bd_bot', rooms: [2, 2, 4], status: 'cleaning', last: [-1, 11, 20], assigned: ['us_maria', 'us_sofia'], owners: ['us_ricardo'], access: 'Caja de llaves en recepción · código 4821\nWifi: Botanica504 · clave verde-palma-72\nParqueo: sótano 2, espacio 31' },
    { code: 'TB-1102', name: 'Torre Botánica 1102', type: 'apartment', building: 'bd_bot', rooms: [3, 2, 6], status: 'pending', incidents: 1, last: [-2, 12, 5], assigned: ['us_luis'], access: 'Cerradura digital · código 0619#\nWifi: TB1102 · clave lago-azul-19' },
    { code: 'TB-207', name: 'Torre Botánica 207', type: 'apartment', building: 'bd_bot', rooms: [1, 1, 2], status: 'ready', last: [0, 8, 10], assigned: ['us_maria'] },
    { code: 'TB-903', name: 'Torre Botánica 903', type: 'apartment', building: 'bd_bot', rooms: [2, 2, 4], status: 'ready', last: [-40, 10, 0], assigned: [], active: false },
    { code: 'CY-12A', name: 'Cayalá 12A', type: 'apartment', building: 'bd_cay', rooms: [2, 2, 4], status: 'occupied', incidents: 1, last: [-3, 15, 40], assigned: ['us_sofia', 'us_diego'], owners: ['us_isabel'], access: 'Llave con el agente de garita · torre B\nWifi: Cayala12A · clave paseo-sol-88' },
    { code: 'CY-08C', name: 'Cayalá 8C', type: 'apartment', building: 'bd_cay', rooms: [1, 1, 3], status: 'ready', last: [0, 10, 15], assigned: ['us_luis'] },
    { code: 'CY-PH1', name: 'Penthouse Cayalá', type: 'apartment', building: 'bd_cay', rooms: [3, 3, 6], status: 'ready', last: [0, 10, 31], assigned: ['us_maria', 'us_jorge', 'us_sofia', 'us_luis'], owners: ['us_ricardo'] },
    { code: 'AN-SEB', name: 'Casa San Sebastián', type: 'house', building: null, zone: 'Antigua Guatemala', setting: 'colonial', rooms: [4, 3, 8], status: 'occupied', incidents: 1, last: [-1, 14, 0], assigned: ['us_sofia', 'us_diego'], owners: ['us_ricardo'], access: 'Portón: control remoto en caja 12\nPuerta principal: llave de bronce en el llavero rojo' },
    { code: 'AN-CAR', name: 'Casa del Carmen', type: 'house', building: null, zone: 'Antigua Guatemala', setting: 'colonial', rooms: [3, 2, 6], status: 'ready', last: [-1, 16, 30], assigned: ['us_maria'] },
    { code: 'AN-H03', name: 'Hostal Antigua · Hab. 3', type: 'room', building: 'bd_ant', rooms: [1, 1, 2], status: 'cleaning', last: [-1, 9, 0], assigned: ['us_luis'] },
    { code: 'AN-H05', name: 'Hostal Antigua · Hab. 5', type: 'room', building: 'bd_ant', rooms: [1, 1, 2], status: 'pending', last: [-2, 9, 40], assigned: ['us_luis'] },
    { code: 'AT-VIS', name: 'Villa Vista al Lago', type: 'house', building: null, zone: 'Panajachel, Sololá', setting: 'lake', rooms: [4, 4, 10], status: 'occupied', last: [-2, 13, 15], assigned: ['us_diego', 'us_sofia'], owners: ['us_isabel'], access: 'Muelle: candado 7731\nCasa: cerradura digital 2468*' },
    { code: 'MT-PLY', name: 'Casa Playa Monterrico', type: 'house', building: null, zone: 'Monterrico, Santa Rosa', setting: 'beach', rooms: [3, 2, 8], status: 'cleaning', last: [-4, 12, 0], assigned: ['us_maria', 'us_luis'] },
  ],
  tn_costa: [
    { code: 'MB-3B', name: 'Marbella 3B', type: 'apartment', building: 'bd_mar', rooms: [2, 2, 5], status: 'cleaning', last: [-1, 12, 0], assigned: ['us_pedro'] },
    { code: 'MB-5A', name: 'Marbella 5A', type: 'apartment', building: 'bd_mar', rooms: [2, 1, 4], status: 'ready', last: [0, 10, 12], assigned: ['us_rosa'] },
    { code: 'MB-7C', name: 'Marbella 7C', type: 'apartment', building: 'bd_mar', rooms: [3, 2, 6], status: 'pending', last: [-3, 11, 0], assigned: ['us_pedro', 'us_rosa'] },
    { code: 'MT-SOL', name: 'Casa Sol · Monterrico', type: 'house', building: null, zone: 'Monterrico, Santa Rosa', setting: 'beach', rooms: [4, 3, 10], status: 'occupied', last: [-2, 15, 0], assigned: ['us_rosa'] },
  ],
};

/** Id estable de la propiedad sembrada en la posición i (lo comparten los mocks). */
export function seededPropertyId(tenantId: string, i: number): string {
  return `pr_${tenantId.slice(3)}_${i + 1}`;
}
