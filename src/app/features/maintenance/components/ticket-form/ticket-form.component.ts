import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { MaintenanceStore } from '../../store/maintenance.store';
import { toApiError } from '../../../../core/http/api-error';
import { CATEGORY_META, TicketDetail, URGENCY_META, Urgency } from '../../models/maintenance.model';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { PhotoPickerComponent } from '../../../../shared/molecules/photo-picker/photo-picker.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';

const URGENCIES: readonly Urgency[] = ['low', 'medium', 'high', 'critical'];

/**
 * Reportar incidencia (W-G1 "Reportar" y flujo F3 de ux-ui.md): qué pasa,
 * propiedad, activo (de la propiedad o de su edificio), urgencia con cuatro
 * chips de color, detalle y fotos. Las fotos se suben al enviar.
 */
@Component({
  selector: 'app-ticket-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormSheetComponent, FormFieldComponent, PhotoPickerComponent, InputComponent, SelectComponent],
  template: `
    <app-form-sheet eyebrow="Mantenimiento" title="Reportar incidencia" subtitle="Administración la ve al instante en el tablero y en alertas." spot="maintenance"
      submitLabel="Reportar" [saving]="saving()" [error]="uploadError() ?? store.saveError()?.detail ?? null" (submitted)="submit()" (cancel)="cancel.emit()">
      <app-form-field label="Qué pasa" for="tf-title" [required]="true" [error]="tried() && fTitle().trim().length < 3 ? 'Describe el problema en una línea.' : null">
        <app-input inputId="tf-title" [compact]="true" [maxlength]="160" placeholder="Ej.: no hay agua caliente en el baño" [(value)]="fTitle" />
      </app-form-field>
      <app-form-field label="Propiedad" [required]="true" [error]="tried() && !fProp() ? 'Elige dónde pasa.' : null">
        <app-select [compact]="true" placeholder="Elige una propiedad" [options]="propOptions()" [(value)]="fProp" ariaLabel="Propiedad" />
      </app-form-field>
      <app-form-field label="Activo" [optional]="true" [hint]="fProp() && assetOptions().length === 1 ? 'Esta propiedad aún no tiene activos registrados.' : null">
        <app-select [compact]="true" [options]="assetOptions()" [(value)]="fAsset" [disabled]="!fProp()" ariaLabel="Activo" />
      </app-form-field>
      <fieldset>
        <legend class="mb-1.5 text-[12.5px] font-bold text-primary">Urgencia</legend>
        <div class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Urgencia">
          @for (u of urgencies; track u) {
            <button type="button" role="radio" class="urg flex h-10 items-center justify-center gap-1.5 rounded-field text-[12.5px] font-bold" [attr.aria-checked]="fUrg() === u" [style.--c]="meta[u].dot" (click)="fUrg.set(u)">
              <span class="h-2 w-2 rounded-pill" [style.background]="meta[u].dot"></span>{{ meta[u].label }}
            </button>
          }
        </div>
      </fieldset>
      <app-form-field label="Detalle" for="tf-desc" [optional]="true">
        <textarea id="tf-desc" rows="3" class="field-native" maxlength="4000" placeholder="Desde cuándo pasa, qué se intentó, si afecta al huésped" [value]="fDesc()" (input)="fDesc.set($any($event.target).value)"></textarea>
      </app-form-field>
      <app-photo-picker label="Fotos" [(files)]="fPhotos" />
    </app-form-sheet>
  `,
  styles: `
    .urg { border: 1px solid var(--color-border-field); color: var(--color-text-body); background: var(--color-surface); transition: border-color var(--dur-fast), background var(--dur-fast); }
    .urg:hover { border-color: var(--c); }
    .urg[aria-checked='true'] { border-color: var(--c); background: color-mix(in srgb, var(--c) 10%, var(--color-surface)); color: var(--color-primary); box-shadow: inset 0 0 0 1px var(--c); }
    @media (prefers-reduced-motion: reduce) { .urg { transition: none; } }
  `,
})
export class TicketFormComponent {
  protected readonly store = inject(MaintenanceStore);

  /** Propiedad y activo precargados (desde la ficha de un activo). */
  readonly propertyId = input<string | null>(null);
  readonly assetId = input<string | null>(null);
  readonly cancel = output<void>();
  readonly created = output<TicketDetail>();

  protected readonly urgencies = URGENCIES;
  protected readonly meta = URGENCY_META;
  protected readonly tried = signal(false);
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly fTitle = signal('');
  protected readonly fProp = signal('');
  protected readonly fAsset = signal('');
  protected readonly fUrg = signal<Urgency>('medium');
  protected readonly fDesc = signal('');
  protected readonly fPhotos = signal<readonly File[]>([]);

  constructor() {
    this.store.clearSaveError();
    effect(() => {
      const p = this.propertyId();
      const a = this.assetId();
      untracked(() => {
        if (p) this.fProp.set(p);
        if (a) this.fAsset.set(a);
      });
    });
  }

  protected readonly saving = computed(() => this.uploading() || this.store.busy() === 'create');

  protected readonly propOptions = computed(() =>
    [...this.store.properties()].sort((a, b) => a.code.localeCompare(b.code)).map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })),
  );

  /** Los de la propiedad y los de su edificio (el elevador). */
  protected readonly assetOptions = computed(() => {
    const prop = this.store.properties().find((p) => p.id === this.fProp());
    const list = this.store.assets().filter((a) => a.is_active && (a.property_id === this.fProp() || (!a.property_id && !!prop?.building_id && a.building_id === prop.building_id)));
    return [{ value: '', label: 'Ninguno en particular' }, ...list.map((a) => ({ value: a.id, label: `${a.name} · ${CATEGORY_META[a.category].label}` }))];
  });

  protected async submit(): Promise<void> {
    this.tried.set(true);
    if (this.fTitle().trim().length < 3 || !this.fProp()) return;
    this.uploading.set(true);
    this.uploadError.set(null);
    let ids: string[];
    try {
      ids = [];
      for (const f of this.fPhotos()) ids.push(await this.store.uploadPhoto(f, 'ticket_photo'));
    } catch (e) {
      this.uploadError.set(toApiError(e).detail);
      this.uploading.set(false);
      return;
    }
    this.uploading.set(false);
    const t = await this.store.createTicket({
      property_id: this.fProp(), asset_id: this.fAsset() || null, title: this.fTitle().trim(),
      description: this.fDesc().trim() || undefined, urgency: this.fUrg(), photo_file_ids: ids,
    });
    if (t) this.created.emit(t);
  }
}
