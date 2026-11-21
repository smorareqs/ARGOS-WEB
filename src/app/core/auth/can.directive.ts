import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { Permission } from './permissions';
import { SessionStore } from '../store/session.store';

/**
 * `*argosCan="'users.manage'"` · renderiza el contenido solo si la sesión
 * tiene el permiso (o todos, si es una lista). Principio de ux-ui.md §1.4:
 * "Lo que no puedes hacer, no aparece".
 */
@Directive({ selector: '[argosCan]' })
export class CanDirective {
  private readonly session = inject(SessionStore);
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private shown = false;

  readonly argosCan = input.required<Permission | readonly Permission[]>();

  constructor() {
    effect(() => {
      const allowed = this.session.can(this.argosCan());
      if (allowed && !this.shown) {
        this.vcr.createEmbeddedView(this.tpl);
        this.shown = true;
      } else if (!allowed && this.shown) {
        this.vcr.clear();
        this.shown = false;
      }
    });
  }
}
