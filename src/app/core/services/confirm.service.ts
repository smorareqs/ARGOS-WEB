import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
  /** 'danger' → botón rojo a la derecha (ux-ui.md §3.5). */
  readonly tone?: 'danger' | 'primary';
  /**
   * Motivos sugeridos. Si se pasan, el diálogo pide un motivo obligatorio
   * (chips + "Otro" con texto): reprogramar, ajustar existencias, corregir
   * marcajes… quedan explicados en la bitácora.
   */
  readonly reasons?: readonly string[];
}

interface PendingConfirm extends ConfirmRequest {
  readonly resolve: (ok: boolean, reason?: string) => void;
}

/** Diálogo de confirmación imperativo: `await confirm.ask({...})`. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _current = signal<PendingConfirm | null>(null);
  readonly current = this._current.asReadonly();

  ask(req: ConfirmRequest): Promise<boolean> {
    this._current()?.resolve(false);
    return new Promise((resolve) => this._current.set({ ...req, resolve: (ok) => resolve(ok) }));
  }

  /** Igual que `ask`, pero exige un motivo: devuelve el texto o null si se cancela. */
  askReason(req: ConfirmRequest & { readonly reasons: readonly string[] }): Promise<string | null> {
    this._current()?.resolve(false);
    return new Promise((resolve) =>
      this._current.set({ ...req, resolve: (ok, reason) => resolve(ok && reason ? reason : null) }),
    );
  }

  settle(ok: boolean, reason?: string): void {
    const c = this._current();
    this._current.set(null);
    c?.resolve(ok, reason);
  }
}
