import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReservationsStore } from '../../store/reservations.store';
import { Inspection, InspectionKind, ReservationDetail, SEVERITY, Severity } from '../../models/reservation.model';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { PhotoPickerComponent } from '../../../../shared/molecules/photo-picker/photo-picker.component';
import { gtq } from '../../../../shared/utils/time';

const KIND: Record<InspectionKind, { title: string; when: string }> = {
  pre_arrival: { title: 'Antes de la llegada', when: 'Se registra al terminar la limpieza previa, antes del check-in: así queda cómo se entregó.' },
  post_departure: { title: 'Después de la salida', when: 'Se registra después del check-out. Sin ella no se devuelve ni se retiene el depósito.' },
};

const AREAS = ['Sala', 'Cocina', 'Comedor', 'Dormitorio principal', 'Dormitorio 2', 'Baño principal', 'Baño de visitas', 'Terraza', 'Piscina', 'Jardín'];

/**
 * Inspecciones de la reserva (W-H3): antes de la llegada y después de la
 * salida, con fotos y hallazgos. Un hallazgo puede ir con cargo al depósito y
 * abrir su incidencia en Mantenimiento.
 */
@Component({
  selector: 'app-inspections-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, BadgeComponent, ButtonComponent, CheckboxComponent, IconComponent, FormFieldComponent, PhotoPickerComponent],
  template: `
    @let r = reservation();
    @for (k of kinds; track k) {
      @let insp = of(k);
      <section class="mb-4 rounded-card border border-border-card p-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-[14px] font-bold text-primary">{{ meta[k].title }}</h3>
          @if (insp) { <span class="text-[12px] text-text-secondary">{{ insp.performed_by_name ?? 'ARGOS' }} · {{ insp.performed_at | date: 'd MMM, HH:mm' }}</span> }
        </div>
        @if (insp) {
          @if (insp.notes) { <p class="mt-2 whitespace-pre-line text-[13px] text-text-body">{{ insp.notes }}</p> }
          @if (insp.photos.length) {
            <div class="mt-3 grid grid-cols-4 gap-2">
              @for (p of insp.photos; track p.file_id) {
                <a class="thumb block aspect-square overflow-hidden rounded-field" [href]="p.url" target="_blank" rel="noopener"><img [src]="p.url" alt="Foto de la inspección" class="h-full w-full object-cover" loading="lazy" /></a>
              }
            </div>
          }
          <ul class="mt-3 space-y-2">
            @for (f of insp.findings; track f.id) {
              <li class="rounded-field bg-surface-soft px-3.5 py-3 text-[13px]">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-bold text-primary">{{ f.area }}</span>
                  <app-badge [tone]="sev(f.severity).tone" size="sm">{{ sev(f.severity).label }}</app-badge>
                  @if (f.charge_to_deposit) { <app-badge tone="danger" size="sm">Cargo al depósito</app-badge> }
                  @if (f.estimated_cost) { <span class="tabular ml-auto font-bold text-primary">{{ money(f.estimated_cost) }}</span> }
                </div>
                <p class="mt-1 text-text-body">{{ f.description }}</p>
                <div class="mt-1.5 flex flex-wrap items-center gap-3 text-[12px]">
                  @if (f.ticket_id) {
                    <a class="link inline-flex items-center gap-1 font-bold" routerLink="/mantenimiento" [queryParams]="{ ver: f.ticket_id }"><app-icon name="wrench" [size]="13" /> Incidencia #{{ f.ticket_number }}</a>
                  }
                  @for (p of f.photos; track p.file_id) {
                    <a class="link inline-flex items-center gap-1" [href]="p.url" target="_blank" rel="noopener"><app-icon name="camera" [size]="13" /> Foto</a>
                  }
                  @if (store.canInspect() && !settled()) {
                    <app-button class="ml-auto" variant="link" size="sm" (pressed)="store.removeFinding(r, insp.id, f.id)">Quitar</app-button>
                  }
                </div>
              </li>
            }
          </ul>
          @if (store.canInspect() && !settled()) {
            @if (findingFor() === insp.id) {
              <div class="mt-3 grid gap-3 border-t border-divider pt-3">
                <div class="grid grid-cols-[1fr_auto] gap-3">
                  <app-form-field label="Área" for="if-area">
                    <input id="if-area" class="field-native" list="if-areas" maxlength="64" placeholder="Sala, cocina, baño…" [value]="fArea()" (input)="fArea.set($any($event.target).value)" />
                    <datalist id="if-areas">@for (a of areas; track a) { <option [value]="a"></option> }</datalist>
                  </app-form-field>
                  <app-form-field label="Costo (Q)" for="if-cost" [optional]="true">
                    <input id="if-cost" type="number" min="0" step="50" class="field-native tabular w-[110px]" [value]="fCost()" (input)="fCost.set($any($event.target).value)" />
                  </app-form-field>
                </div>
                <app-form-field label="Qué se encontró" for="if-desc">
                  <textarea id="if-desc" rows="2" class="field-native" maxlength="2000" placeholder="Ej.: mancha de vino en el sofá" [value]="fDesc()" (input)="fDesc.set($any($event.target).value)"></textarea>
                </app-form-field>
                <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Gravedad">
                  @for (s of severities; track s) {
                    <button type="button" role="radio" class="sev h-8 rounded-pill px-3 text-[12px] font-bold" [attr.aria-checked]="fSev() === s" (click)="fSev.set(s)">{{ sev(s).label }}</button>
                  }
                </div>
                @if (k === 'post_departure') { <app-checkbox [(checked)]="fCharge">Cargo al depósito</app-checkbox> }
                <app-checkbox [(checked)]="fTicket">Abrir incidencia en Mantenimiento</app-checkbox>
                <app-photo-picker label="Fotos del hallazgo" [max]="10" [(files)]="fPhotos" />
                @if (generalError(); as e) { <p class="text-[12.5px] font-bold text-danger">{{ e }}</p> }
                <div class="flex justify-end gap-2">
                  <app-button variant="tertiary" size="sm" (pressed)="findingFor.set(null)">Cancelar</app-button>
                  <app-button variant="primary" size="sm" [disabled]="fArea().trim().length < 2 || fDesc().trim().length < 3" [loading]="store.busy() === 'finding'" (pressed)="saveFinding(insp)">Agregar hallazgo</app-button>
                </div>
              </div>
            } @else {
              <app-button class="mt-3 block" variant="link" size="sm" (pressed)="startFinding(insp)"><app-icon name="plus" [size]="14" /> Agregar hallazgo</app-button>
            }
          }
        } @else if (creating() === k) {
          <div class="mt-3 grid gap-3">
            <app-form-field label="Notas" for="in-notes" [optional]="true">
              <textarea id="in-notes" rows="2" class="field-native" maxlength="4000" placeholder="Cómo quedó la propiedad" [value]="fNotes()" (input)="fNotes.set($any($event.target).value)"></textarea>
            </app-form-field>
            <app-photo-picker label="Fotos por área" [max]="30" [(files)]="fPhotos" />
            @if (generalError(); as e) { <p class="text-[12.5px] font-bold text-danger">{{ e }}</p> }
            <div class="flex justify-end gap-2">
              <app-button variant="tertiary" size="sm" (pressed)="creating.set(null)">Cancelar</app-button>
              <app-button variant="primary" size="sm" [loading]="store.busy() === 'inspection'" (pressed)="saveInspection(k)">Registrar inspección</app-button>
            </div>
          </div>
        } @else {
          <p class="mt-1.5 text-[12.5px] text-text-secondary">{{ meta[k].when }}</p>
          @if (store.canInspect() && allowed(k)) {
            <app-button class="mt-3 block" variant="secondary" size="sm" (pressed)="startInspection(k)"><app-icon name="camera" [size]="15" /> Registrar inspección</app-button>
          }
        }
      </section>
    }
  `,
  styles: `
    .thumb { background: var(--color-surface-soft); }
    .link { color: var(--color-action); }
    .link:hover { color: var(--color-primary); }
    .sev { border: 1px solid var(--color-border-field); color: var(--color-text-body); background: var(--color-surface); }
    .sev[aria-checked='true'] { border-color: var(--color-primary); color: var(--color-primary); box-shadow: inset 0 0 0 1px var(--color-primary); }
  `,
})
export class InspectionsPanelComponent {
  protected readonly store = inject(ReservationsStore);
  readonly reservation = input.required<ReservationDetail>();

  protected readonly kinds: InspectionKind[] = ['pre_arrival', 'post_departure'];
  protected readonly meta = KIND;
  protected readonly areas = AREAS;
  protected readonly severities: Severity[] = ['low', 'medium', 'high'];
  protected readonly sev = (s: Severity) => SEVERITY[s];
  protected readonly money = (v: number) => gtq(v, 0);

  protected readonly creating = signal<InspectionKind | null>(null);
  protected readonly findingFor = signal<string | null>(null);
  protected readonly fNotes = signal('');
  protected readonly fPhotos = signal<readonly File[]>([]);
  protected readonly fArea = signal('');
  protected readonly fDesc = signal('');
  protected readonly fCost = signal('');
  protected readonly fSev = signal<Severity>('medium');
  protected readonly fCharge = signal(false);
  protected readonly fTicket = signal(false);

  protected readonly settled = computed(() => ['returned', 'retained_partial', 'retained_full'].includes(this.reservation().deposit_status));
  protected readonly generalError = computed(() => {
    const e = this.store.saveError();
    return e ? (e.errors.length ? e.errors.map((x) => x.message).join(' ') : e.detail) : null;
  });

  protected of(kind: InspectionKind): Inspection | null {
    return this.reservation().inspections.find((i) => i.kind === kind) ?? null;
  }

  protected allowed(kind: InspectionKind): boolean {
    const s = this.reservation().status;
    return kind === 'pre_arrival' ? s === 'pending' || s === 'confirmed' : s === 'checked_out';
  }

  protected startInspection(kind: InspectionKind): void {
    this.store.clearSaveError();
    this.fNotes.set('');
    this.fPhotos.set([]);
    this.creating.set(kind);
  }

  protected async saveInspection(kind: InspectionKind): Promise<void> {
    if (await this.store.createInspection(this.reservation(), kind, this.fNotes().trim() || null, this.fPhotos())) this.creating.set(null);
  }

  protected startFinding(i: Inspection): void {
    this.store.clearSaveError();
    this.fArea.set('');
    this.fDesc.set('');
    this.fCost.set('');
    this.fSev.set('medium');
    this.fCharge.set(i.kind === 'post_departure');
    this.fTicket.set(false);
    this.fPhotos.set([]);
    this.findingFor.set(i.id);
  }

  protected async saveFinding(i: Inspection): Promise<void> {
    const cost = Number(this.fCost());
    const ok = await this.store.addFinding(this.reservation(), i.id, {
      area: this.fArea().trim(), description: this.fDesc().trim(), severity: this.fSev(),
      estimated_cost: this.fCost() && cost >= 0 ? cost : null,
      charge_to_deposit: i.kind === 'post_departure' && this.fCharge(), create_ticket: this.fTicket(),
    }, this.fPhotos());
    if (ok) this.findingFor.set(null);
  }
}
