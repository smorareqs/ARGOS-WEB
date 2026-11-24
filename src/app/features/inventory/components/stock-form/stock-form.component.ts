import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { ApiError } from '../../../../core/http/api-error';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { SelectComponent, SelectOption } from '../../../../shared/atoms/select/select.component';
import { Item, StockChange, Warehouse } from '../../models/inventory.model';

type Kind = StockChange['kind'];

/** Formulario de entrada, traslado o ajuste de existencias (W-F2). El ajuste exige motivo. */
@Component({
  selector: 'app-stock-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormSheetComponent, FormFieldComponent, SegmentedComponent, SelectComponent],
  template: `
    <app-form-sheet
      eyebrow="Existencias"
      [title]="titles[kind()]"
      [subtitle]="subtitles[kind()]"
      spot="inventory"
      [submitLabel]="titles[kind()]"
      [saving]="saving()"
      [error]="generalError()"
      (submitted)="submit()"
      (cancel)="cancel.emit()"
    >
      <app-segmented [options]="kinds" [value]="kind()" (valueChange)="kind.set($any($event))" ariaLabel="Tipo de movimiento" />
      <app-form-field label="Artículo" for="sf-item" [required]="true" [error]="tried() && !item() ? 'Elige un artículo.' : null">
        <app-select selectId="sf-item" [compact]="true" placeholder="Elige un artículo" [options]="itemOptions()" [(value)]="item" />
      </app-form-field>
      <div class="grid grid-cols-1 gap-3" [class.sm:grid-cols-2]="kind() === 'transfer'">
        <app-form-field [label]="kind() === 'transfer' ? 'Desde' : 'Bodega'" [required]="true" [hint]="item() ? 'Hay ' + have() + ' ' + unit() + ' aquí.' : null">
          <app-select [compact]="true" [options]="whOptions()" [(value)]="from" ariaLabel="Bodega" />
        </app-form-field>
        @if (kind() === 'transfer') {
          <app-form-field label="Hacia" [required]="true" [error]="tried() && to() === from() ? 'Elige otra bodega.' : null">
            <app-select [compact]="true" [options]="whOptions()" [(value)]="to" ariaLabel="Bodega destino" />
          </app-form-field>
        }
      </div>
      <app-form-field label="Cantidad" for="sf-qty" [required]="true" [hint]="kind() === 'adjustment' ? 'Usa un número negativo si falta mercadería.' : null" [error]="qtyError()">
        <input id="sf-qty" type="number" inputmode="numeric" class="field-native tabular" [attr.aria-invalid]="!!qtyError()" [value]="qty()" (input)="qty.set($any($event.target).value)" />
      </app-form-field>
      <app-form-field [label]="kind() === 'adjustment' ? 'Motivo' : 'Nota'" for="sf-note" [required]="kind() === 'adjustment'" [optional]="kind() !== 'adjustment'" [error]="tried() && kind() === 'adjustment' && !note().trim() ? 'El ajuste necesita un motivo.' : null">
        <textarea id="sf-note" rows="2" class="field-native" [placeholder]="kind() === 'entry' ? 'Proveedor o número de factura' : 'Ej.: conteo físico del viernes'" [value]="note()" (input)="note.set($any($event.target).value)"></textarea>
      </app-form-field>
    </app-form-sheet>
  `,
})
export class StockFormComponent {
  readonly items = input.required<readonly Item[]>();
  readonly warehouses = input.required<readonly Warehouse[]>();
  readonly stockOf = input.required<(item: string, wh: string) => number>();
  readonly initialKind = input<Kind>('entry');
  readonly initialItem = input<string | null>(null);
  readonly saving = input<boolean>(false);
  readonly serverError = input<ApiError | null>(null);
  readonly submitted = output<StockChange>();
  readonly cancel = output<void>();

  protected readonly titles: Record<Kind, string> = { entry: 'Registrar entrada', transfer: 'Trasladar', adjustment: 'Ajustar existencia' };
  protected readonly subtitles: Record<Kind, string> = {
    entry: 'Mercadería que llega a bodega por compra o donación.',
    transfer: 'Mueve existencias entre bodegas sin cambiar el total.',
    adjustment: 'Corrige la existencia después de un conteo. Queda en la bitácora.',
  };
  protected readonly kinds = [
    { value: 'entry', label: 'Entrada' },
    { value: 'transfer', label: 'Traslado' },
    { value: 'adjustment', label: 'Ajuste' },
  ];
  protected readonly kind = signal<Kind>('entry');
  protected readonly item = signal('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly qty = signal('');
  protected readonly note = signal('');
  protected readonly tried = signal(false);

  protected readonly itemOptions = computed<SelectOption[]>(() => this.items().map((i) => ({ value: i.id, label: `${i.sku} · ${i.name}` })));
  protected readonly whOptions = computed<SelectOption[]>(() => this.warehouses().map((w) => ({ value: w.id, label: w.name })));
  protected readonly unit = computed(() => this.items().find((i) => i.id === this.item())?.unit ?? 'unidades');
  protected readonly have = computed(() => (this.item() && this.from() ? this.stockOf()(this.item(), this.from()) : 0));
  protected readonly qtyError = computed(() => {
    const server = this.serverError()?.errors.find((e) => e.location === 'body.qty')?.message;
    if (server) return server;
    if (!this.tried()) return null;
    const n = Number(this.qty());
    if (!this.qty() || !Number.isInteger(n) || n === 0) return 'Escribe una cantidad entera distinta de cero.';
    if (this.kind() !== 'adjustment' && n < 0) return 'Debe ser positiva.';
    return null;
  });
  protected readonly generalError = computed(() => {
    const e = this.serverError();
    return e && !e.errors.length ? e.detail : null;
  });

  constructor() {
    effect(() => {
      const k = this.initialKind();
      const it = this.initialItem();
      const ws = this.warehouses();
      untracked(() => {
        this.kind.set(k);
        if (it) this.item.set(it);
        this.from.set(ws[0]?.id ?? '');
        this.to.set(ws[1]?.id ?? ws[0]?.id ?? '');
      });
    });
  }

  protected submit(): void {
    this.tried.set(true);
    if (!this.item() || this.qtyError() || (this.kind() === 'adjustment' && !this.note().trim()) || (this.kind() === 'transfer' && this.to() === this.from())) return;
    this.submitted.emit({
      kind: this.kind(),
      item_id: this.item(),
      warehouse_id: this.from(),
      to_warehouse_id: this.kind() === 'transfer' ? this.to() : undefined,
      qty: Number(this.qty()),
      note: this.note().trim() || null,
    });
  }
}
