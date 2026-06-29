import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Molécula · tarjeta blanca elevada (radio 18px, borde de tarjeta).
 * Contenedor base de los paneles del dashboard. El padding lo controla
 * el consumidor con utilidades para respetar cada caso del diseño.
 */
@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    class: 'block rounded-card border border-border-card bg-surface',
  },
})
export class CardComponent {}
