import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth.store';
import { AuthApi } from '../../../core/auth/auth-api.service';
import { MockAuthApi } from '../../../core/mocks/mock-auth-api';
import { SessionStore } from '../../../core/store/session.store';
import { DEMO_PASSWORD, DEMO_TOTP_CODE } from '../../../core/mocks/demo-seed';

/** Flujo de acceso contra el mock que implementa el contrato de fase01.md §3.7.1. */
describe('AuthStore', () => {
  let store: AuthStore;
  let session: SessionStore;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthApi, useClass: MockAuthApi }, AuthStore],
    });
    store = TestBed.inject(AuthStore);
    session = TestBed.inject(SessionStore);
  });

  it('valida el correo antes de llamar al backend', async () => {
    store.fill('no-es-correo', 'x');
    expect(await store.submitCredentials()).toBe(false);
    expect(store.emailError()).toContain('Revisa el correo');
    expect(store.loading()).toBe(false);
  });

  it('401: credenciales incorrectas no abren sesión', async () => {
    store.fill('ana.lopez@garrent.gt', 'incorrecta');
    expect(await store.submitCredentials()).toBe(false);
    expect(store.error()).toBe('Correo o contraseña incorrectos.');
    expect(session.isAuthenticated()).toBe(false);
  }, 10_000);

  it('una membresía: entra directo y carga permisos del rol', async () => {
    store.fill('ana.lopez@garrent.gt', DEMO_PASSWORD);
    expect(await store.submitCredentials()).toBe(true);
    expect(session.isAuthenticated()).toBe(true);
    expect(session.tenant()?.name).toBe('Garrent');
    expect(session.can('users.manage')).toBe(true);
  }, 10_000);

  it('428: pide el código TOTP y entra con el correcto', async () => {
    store.fill('marta.diaz@garrent.gt', DEMO_PASSWORD);
    expect(await store.submitCredentials()).toBe(false);
    expect(store.step()).toBe('totp');

    store.totp.set('000000');
    expect(await store.submitTotp()).toBe(false);
    expect(store.error()).toContain('no es válido');

    store.totp.set(DEMO_TOTP_CODE);
    expect(await store.submitTotp()).toBe(true);
    expect(session.isAuthenticated()).toBe(true);
  }, 15_000);

  it('varias membresías: elige empresa y la sesión queda en ese tenant con su rol', async () => {
    store.fill('carlos.ruiz@argos.gt', DEMO_PASSWORD);
    expect(await store.submitCredentials()).toBe(false);
    expect(store.step()).toBe('tenant');
    expect(store.memberships().map((m) => m.tenant_name)).toEqual(['Garrent', 'Costa Limpia S.A.']);

    expect(await store.chooseTenant('tn_costa')).toBe(true);
    expect(session.tenant()?.name).toBe('Costa Limpia S.A.');
    expect(session.user()?.roleKey).toBe('supervisor');
    expect(session.can('users.manage')).toBe(false);
  }, 15_000);
});
