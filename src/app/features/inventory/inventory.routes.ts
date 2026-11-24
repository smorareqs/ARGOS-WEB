import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { HttpInventoryApi, InventoryApi } from './services/inventory-api.service';
import { MockInventoryApi } from './services/inventory-api.mock';

/** Rutas de Inventario (W-F1–W-F6: pestañas por query param). */
export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Inventario' },
    providers: [{ provide: InventoryApi, useFactory: () => (inject(MOCK_MODULES).inventory ? new MockInventoryApi() : new HttpInventoryApi()) }],
    loadComponent: () => import('./pages/inventory/inventory.component').then((m) => m.InventoryComponent),
  },
];
