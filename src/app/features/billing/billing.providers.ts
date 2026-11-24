import { Provider, inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { BillingApi, HttpBillingApi } from './services/billing-api.service';
import { MockBillingApi } from './services/billing-api.mock';

/** Facturación y claves API (fase 6) con la bandera `billing` de MOCK_MODULES. */
export function billingProviders(): Provider[] {
  return [{ provide: BillingApi, useFactory: () => (inject(MOCK_MODULES).billing ? new MockBillingApi() : new HttpBillingApi()) }];
}
