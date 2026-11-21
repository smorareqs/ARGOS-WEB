import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  /** 'danger' → botón rojo a la derecha (ux-ui.md §3.5). */
  readonly tone?: 'danger' | 'primary';
}

interface PendingConfirm extends ConfirmRequest {
  readonly resolve: (ok: boolean) => void;
}

/** Diálogo de confirmación imperativo: `await confirm.ask({...})`. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _current = signal<PendingConfirm | null>(null);
  readonly current = this._current.asReadonly();

  ask(req: ConfirmRequest): Promise<boolean> {
    this._current()?.resolve(false);
    return new Promise((resolve) => this._current.set({ ...req, resolve }));
  }

  settle(ok: boolean): void {
    const c = this._current();
    this._current.set(null);
    c?.resolve(ok);
  }
}
