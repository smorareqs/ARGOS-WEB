import { Injectable, computed, signal } from '@angular/core';
import { DashboardData } from '../models/dashboard.model';

/** Datos mock del Inicio (1:1 con ARGOS Web · Frame 02). */
const MOCK_DASHBOARD: DashboardData = {
  greetingName: 'Carlos',
  teamsInField: 9,
  highPriorityCount: 2,
  totalAlerts: 5,
  alerts: [
    {
      icon: 'alert-chat',
      title: 'Cámara de seguridad averiada — Casa Dunas',
      meta: 'Reportada por Ana Solís · hace 12 min',
      action: 'Asignar',
    },
    {
      icon: 'alert-triangle',
      title: 'Mantenimiento vencido — Apto 304 · filtro de agua',
      meta: 'Vencido hace 4 días',
      action: 'Programar',
    },
  ],
  compliance: { percent: 58, done: 22, total: 38, inProgress: 9, pending: 7 },
  mapPins: [
    { kind: 'in-progress', left: 18, top: 30 },
    { kind: 'finished', left: 40, top: 58 },
    { kind: 'incident', left: 64, top: 40 },
    { kind: 'finished', left: 30, top: 72 },
    { kind: 'in-progress', left: 78, top: 66 },
    { kind: 'finished', left: 54, top: 18 },
  ],
  mapActiveCount: 8,
  ranking: [
    { position: 1, nombre: 'María Ramos', iniciales: 'MR', score: 48, progress: 96, leader: true },
    { position: 2, nombre: 'Jorge Peña', iniciales: 'JP', score: 41, progress: 82, leader: false },
    { position: 3, nombre: 'Ana Solís', iniciales: 'AS', score: 37, progress: 74, leader: false },
    { position: 4, nombre: 'Luis Torres', iniciales: 'LT', score: 31, progress: 61, leader: false },
  ],
  maintenance: [
    {
      property: 'Casa Dunas',
      system: 'Cámara de seguridad',
      status: 'incident',
      statusLabel: 'Requiere atención',
    },
    {
      property: 'Apto 304 · Marbella Bay',
      system: 'Sistema de agua',
      status: 'overdue',
      statusLabel: 'Vencido',
    },
    {
      property: 'Apto 12A · Vista Verde',
      system: 'Climatización (A/C)',
      status: 'repairing',
      statusLabel: 'En reparación',
    },
    {
      property: 'Apto 201 · Sol Naciente',
      system: 'Pintura exterior',
      status: 'operational',
      statusLabel: 'Operativo',
    },
  ],
};

/**
 * Tienda del dominio de dashboard. Expone los datos del Inicio vía Signals de
 * sólo lectura (§5). Hoy sirve datos mock; mañana un `dashboard-api.service.ts`
 * puro hará la petición y esta tienda procesará y publicará el resultado.
 *
 * Se provee a nivel de ruta (lifecycle de la sección) → se destruye al salir.
 */
@Injectable()
export class DashboardStore {
  private readonly _data = signal<DashboardData>(MOCK_DASHBOARD);

  readonly data = this._data.asReadonly();
  readonly greeting = computed(() => `Buenos días, ${this._data().greetingName}`);
}
