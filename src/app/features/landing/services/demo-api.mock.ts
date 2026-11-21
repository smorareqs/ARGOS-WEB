import { Injectable } from '@angular/core';
import { MockTable, latency, uid } from '../../../core/mocks/mock-utils';
import { DemoApi, DemoRequest } from './demo-api.service';

/** Mock: guarda la solicitud en localStorage (`argos.mock.demo_requests`). */
@Injectable()
export class MockDemoApi extends DemoApi {
  private readonly table = new MockTable<DemoRequest & { id: string; created_at: string }>('demo_requests', () => []);

  async request(body: DemoRequest): Promise<void> {
    await latency(700, 1100);
    this.table.update((rows) => [...rows, { ...body, id: uid('demo'), created_at: new Date().toISOString() }]);
  }
}
