import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { MockTable, latency } from '../../../core/mocks/mock-utils';
import { DashboardApi } from './dashboard-api.service';
import { DashboardAlert, DashboardData } from '../models/dashboard.model';
import { projectPins } from './map-projection';

const GARRENT: DashboardData = {
  teamsInField: 9,
  totalAlerts: 5,
  alerts: [
    {
      id: 'al_1',
      kind: 'incident',
      title: 'Fuga en el baño principal — Casa San Sebastián',
      meta: 'Reportada por María Ramos · hace 12 min',
      action: 'Asignar',
    },
    {
      id: 'al_2',
      kind: 'late',
      title: 'Limpieza de salida retrasada — Torre Botánica 1102',
      meta: 'Debía terminar a las 11:00 · Luis Torres',
      action: 'Reasignar',
    },
    {
      id: 'al_3',
      kind: 'maintenance',
      title: 'Preventivo vencido — Cayalá 12A · aire acondicionado',
      meta: 'Vencido hace 4 días',
      action: 'Programar',
    },
  ],
  stats: { cleaningsDone: 22, cleaningsTotal: 38, late: 3, incidentsOpen: 5, arrivals: 4, departures: 6 },
  compliance: { done: 22, inProgress: 9, late: 3, pending: 4 },
  ranking: [
    { name: 'María Ramos', initials: 'MR', score: 48, progress: 96 },
    { name: 'Jorge Peña', initials: 'JP', score: 41, progress: 82 },
    { name: 'Sofía Méndez', initials: 'SM', score: 37, progress: 74 },
    { name: 'Luis Torres', initials: 'LT', score: 31, progress: 62 },
    { name: 'Diego Castillo', initials: 'DC', score: 26, progress: 52 },
  ],
  pins: projectPins([
    { id: 'p1', code: 'TB-504', name: 'Torre Botánica 504', type: 'apartment', building: 'Torre Botánica', zone: 'Zona 10', lat: 14.5986, lng: -90.5094, status: 'cleaning' },
    { id: 'p2', code: 'TB-1102', name: 'Torre Botánica 1102', type: 'apartment', building: 'Torre Botánica', zone: 'Zona 10', lat: 14.5986, lng: -90.5094, open_tickets: 1, status: 'incident' },
    { id: 'p3', code: 'CY-12A', name: 'Cayalá 12A', type: 'apartment', building: 'Residencial Cayalá', zone: 'Zona 16', lat: 14.6092, lng: -90.4867, status: 'occupied' },
    { id: 'p4', code: 'CY-PH1', name: 'Penthouse Cayalá', type: 'apartment', building: 'Residencial Cayalá', zone: 'Zona 16', lat: 14.6092, lng: -90.4867, status: 'ready' },
    { id: 'p5', code: 'AN-SEB', name: 'Casa San Sebastián', type: 'house', zone: 'Antigua Guatemala', lat: 14.5611, lng: -90.7381, open_tickets: 1, status: 'incident' },
    { id: 'p6', code: 'AN-CAR', name: 'Casa del Carmen', type: 'house', zone: 'Antigua Guatemala', lat: 14.5547, lng: -90.7299, status: 'ready' },
    { id: 'p7', code: 'AT-VIS', name: 'Villa Vista al Lago', type: 'house', zone: 'Panajachel, Sololá', lat: 14.7409, lng: -91.1577, status: 'occupied' },
    { id: 'p8', code: 'MT-PLY', name: 'Casa Playa Monterrico', type: 'house', zone: 'Monterrico, Santa Rosa', lat: 13.8946, lng: -90.4836, status: 'cleaning' },
  ]),
  activity: [
    { time: '11:24', title: 'Check-in completado', meta: 'Villa Vista al Lago · 6 huéspedes', icon: 'key', tone: 'primary' },
    { time: '11:02', title: 'Custodia conciliada', meta: 'Sofía Méndez devolvió 5 de 5 llaves', icon: 'inventory', tone: 'success' },
    { time: '10:48', title: 'Incidencia reportada', meta: 'Casa San Sebastián · fuga en baño', icon: 'alert', tone: 'danger' },
    { time: '10:31', title: 'Limpieza validada', meta: 'Penthouse Cayalá · por Jorge Peña', icon: 'check-double', tone: 'success' },
    { time: '09:42', title: 'Limpieza iniciada', meta: 'Torre Botánica 504 · María Ramos', icon: 'play', tone: 'gold' },
  ],
  upcoming: [
    { id: 'm1', date: '2026-11-20', property: 'Cayalá 12A', system: 'Aire acondicionado', tone: 'danger', label: 'Vencido' },
    { id: 'm2', date: '2026-11-21', property: 'Torre Botánica', system: 'Elevador · revisión mensual', tone: 'warning', label: 'Mañana' },
    { id: 'm3', date: '2026-11-24', property: 'Villa Vista al Lago', system: 'Bomba de agua', tone: 'info', label: 'Programado' },
    { id: 'm4', date: '2026-11-28', property: 'Casa Playa Monterrico', system: 'Pintura exterior', tone: 'neutral', label: 'Programado' },
  ],
};

const COSTA: DashboardData = {
  teamsInField: 3,
  totalAlerts: 1,
  alerts: [
    {
      id: 'al_c1',
      kind: 'inventory',
      title: 'Discrepancia de inventario — Apto Marbella 3B',
      meta: 'Faltan 2 juegos de toallas · Pedro Ajú',
      action: 'Revisar',
    },
  ],
  stats: { cleaningsDone: 7, cleaningsTotal: 11, late: 0, incidentsOpen: 1, arrivals: 2, departures: 3 },
  compliance: { done: 7, inProgress: 2, late: 0, pending: 2 },
  ranking: [
    { name: 'Andrea Cifuentes', initials: 'AC', score: 22, progress: 88 },
    { name: 'Pedro Ajú', initials: 'PA', score: 18, progress: 72 },
    { name: 'Rosa Xol', initials: 'RX', score: 15, progress: 60 },
  ],
  pins: projectPins([
    { id: 'c1', code: 'MB-3B', name: 'Marbella 3B', type: 'apartment', building: 'Condominio Marbella', zone: 'Puerto de San José', lat: 13.9254, lng: -90.8243, status: 'cleaning' },
    { id: 'c2', code: 'MB-5A', name: 'Marbella 5A', type: 'apartment', building: 'Condominio Marbella', zone: 'Puerto de San José', lat: 13.9254, lng: -90.8243, status: 'ready' },
    { id: 'c3', code: 'MT-SOL', name: 'Casa Sol · Monterrico', type: 'house', zone: 'Monterrico, Santa Rosa', lat: 13.8961, lng: -90.4772, status: 'occupied' },
  ]),
  activity: [
    { time: '10:12', title: 'Limpieza finalizada', meta: 'Marbella 5A · Andrea Cifuentes', icon: 'check-circle', tone: 'success' },
    { time: '09:30', title: 'Limpieza iniciada', meta: 'Marbella 3B · Pedro Ajú', icon: 'play', tone: 'gold' },
  ],
  upcoming: [
    { id: 'mc1', date: '2026-11-22', property: 'Marbella', system: 'Piscina · tratamiento', tone: 'info', label: 'Programado' },
  ],
};

/** Datos de muestra de tareas y reservas para el Inicio con la API real (hasta que existan sus APIs). */
export function sampleOps(tenantKey: string): Pick<DashboardData, 'teamsInField' | 'stats' | 'compliance' | 'ranking'> {
  const base = tenantKey === 'tn_costa' ? COSTA : GARRENT;
  return { teamsInField: base.teamsInField, stats: base.stats, compliance: base.compliance, ranking: base.ranking };
}

/** Mock de `GET /dashboard` por tenant, con alertas reconocibles. */
@Injectable()
export class MockDashboardApi extends DashboardApi {
  private readonly session = inject(SessionStore);
  private readonly acked = new MockTable<string>('dashboard_acked', () => []);

  async get(): Promise<DashboardData> {
    await latency(520, 900);
    const base = mockTenantKey(this.session.tenant()) === 'tn_costa' ? COSTA : GARRENT;
    const acked = new Set(this.acked.all());
    const alerts: DashboardAlert[] = base.alerts.filter((a) => !acked.has(a.id));
    return { ...base, alerts, totalAlerts: base.totalAlerts - (base.alerts.length - alerts.length), simulated: { tasks: true, reservations: true } };
  }

  async acknowledge(alertId: string): Promise<void> {
    await latency(200, 380);
    this.acked.update((ids) => [...new Set([...ids, alertId])]);
  }

}
