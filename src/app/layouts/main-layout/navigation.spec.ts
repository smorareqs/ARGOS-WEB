import { buildNav } from './navigation';
import { ROLE_PERMISSIONS } from '../../core/mocks/demo-seed';
import { FeatureFlag, Permission, RoleKey } from '../../core/auth/permissions';

function labels(role: RoleKey, flags: Partial<Record<FeatureFlag, boolean>> = {}): string[] {
  const perms = new Set<Permission>(ROLE_PERMISSIONS[role]);
  return buildNav(
    (p) => perms.has(p),
    (f) => !!flags[f],
  ).flatMap((s) => s.items.map((i) => i.label));
}

describe('buildNav (menú por permisos y banderas, ux-ui.md §4.2)', () => {
  it('admin ve configuración y RRHH; los módulos con bandera solo si está activa', () => {
    const nav = labels('admin', { reservations: true });
    expect(nav).toContain('Configuración');
    expect(nav).toContain('RRHH');
    expect(nav).toContain('Reservas');
    expect(nav).not.toContain('Parqueos');
    expect(nav).not.toContain('Áreas comunes');
  });

  it('supervisor no ve Configuración ni RRHH', () => {
    const nav = labels('supervisor', { reservations: true });
    expect(nav).toContain('Colaboradores');
    expect(nav).not.toContain('Configuración');
    expect(nav).not.toContain('RRHH');
  });

  it('colaborador de limpieza no ve Colaboradores, Bitácora ni Alertas', () => {
    const nav = labels('cleaner', { reservations: true, parking: true });
    expect(nav).toEqual(['Inicio', 'Propiedades', 'Itinerario', 'Inventario', 'Mantenimiento', 'Chat']);
  });

  it('no deja secciones vacías', () => {
    const sections = buildNav(
      () => false,
      () => false,
    );
    expect(sections.every((s) => s.items.length > 0)).toBe(true);
    expect(sections.flatMap((s) => s.items.map((i) => i.label))).toEqual(['Inicio']);
  });
});
