import { Provider, inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { HttpPayrollApi, PayrollApi } from './services/payroll-api.service';
import { MockPayrollApi } from './services/payroll-api.mock';
import { DisciplinaryApi, HttpDisciplinaryApi } from './services/disciplinary-api.service';
import { MockDisciplinaryApi } from './services/disciplinary-api.mock';
import { AttendanceApi, HttpAttendanceApi } from './services/attendance-api.service';
import { MockAttendanceApi } from './services/attendance-api.mock';

/**
 * Servicios de RRHH para las rutas que los usan (RRHH y la ficha del
 * colaborador): nómina y disciplina con la bandera `hr`, asistencia con
 * `attendance` (Persona B).
 */
export function hrProviders(): Provider[] {
  return [
    { provide: PayrollApi, useFactory: () => (inject(MOCK_MODULES).hr ? new MockPayrollApi() : new HttpPayrollApi()) },
    { provide: DisciplinaryApi, useFactory: () => (inject(MOCK_MODULES).hr ? new MockDisciplinaryApi() : new HttpDisciplinaryApi()) },
    { provide: AttendanceApi, useFactory: () => (inject(MOCK_MODULES).attendance ? new MockAttendanceApi() : new HttpAttendanceApi()) },
  ];
}
