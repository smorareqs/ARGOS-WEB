import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';

/** Contrato de métricas (fase05.md §4 · módulo `metrics`). */

export type MetricsRange = '7d' | '30d' | 'month';

export interface PersonMetrics {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly cleanings: number;
  /** 0–100: finalizadas dentro de la ventana. */
  readonly on_time: number;
  readonly avg_minutes: number;
  readonly late: number;
  readonly returned: number;
}

export interface PropertyMetrics {
  readonly code: string;
  readonly name: string;
  readonly cleanings: number;
  readonly avg_minutes: number;
}

export interface MetricsBoard {
  readonly range: MetricsRange;
  readonly per_day: readonly { readonly date: string; readonly count: number }[];
  readonly people: readonly PersonMetrics[];
  readonly properties: readonly PropertyMetrics[];
}

export interface Goal {
  readonly id: string;
  readonly title: string;
  readonly scope: string;
  readonly target: number;
  readonly current: number;
  readonly unit: string;
  readonly reward: string;
}

export interface Incentive {
  readonly id: string;
  readonly person_name: string;
  readonly goal_title: string;
  readonly amount: number;
  readonly status: 'pending' | 'approved' | 'rejected';
  readonly period: string;
}

/** Servicio puro de métricas. Sin estado. */
export abstract class MetricsApi {
  abstract board(range: MetricsRange): Promise<MetricsBoard>;
  abstract goals(): Promise<readonly Goal[]>;
  abstract incentives(): Promise<readonly Incentive[]>;
  abstract decide(ids: readonly string[], status: 'approved' | 'rejected'): Promise<readonly Incentive[]>;
}

@Injectable()
export class HttpMetricsApi extends MetricsApi {
  private readonly http = inject(ApiClient);

  board(range: MetricsRange): Promise<MetricsBoard> {
    return this.http.get<MetricsBoard>('/metrics/board', { range });
  }
  goals(): Promise<readonly Goal[]> {
    return this.http.get<readonly Goal[]>('/metrics/goals');
  }
  incentives(): Promise<readonly Incentive[]> {
    return this.http.get<readonly Incentive[]>('/metrics/incentives');
  }
  decide(ids: readonly string[], status: 'approved' | 'rejected'): Promise<readonly Incentive[]> {
    return this.http.post<readonly Incentive[]>('/metrics/incentives/decide', { ids, status });
  }
}
