import { Injectable, signal } from '@angular/core';

export type ToastTone = 'neutral' | 'success' | 'danger';

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
  readonly action?: { readonly label: string; readonly run: () => void };
  readonly duration: number;
}

/**
 * Avisos efímeros (ux-ui.md §3.5): abajo a la derecha, 3 a 6 s, una acción
 * como máximo, sin robar el foco. El outlet vive en layouts/overlays.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly _toasts = signal<readonly Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, opts: Partial<Omit<Toast, 'id' | 'message'>> = {}): number {
    const toast: Toast = {
      id: ++this.seq,
      message,
      tone: opts.tone ?? 'neutral',
      action: opts.action,
      duration: opts.duration ?? (opts.action ? 6000 : 3800),
    };
    this._toasts.update((list) => [...list.slice(-2), toast]);
    this.timers.set(
      toast.id,
      setTimeout(() => this.dismiss(toast.id), toast.duration),
    );
    return toast.id;
  }

  success(message: string, action?: Toast['action']): number {
    return this.show(message, { tone: 'success', action });
  }

  error(message: string): number {
    return this.show(message, { tone: 'danger', duration: 5200 });
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
