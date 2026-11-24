import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { HrStore } from '../../store/hr.store';
import { DISCIPLINE_LABEL, DisciplineType } from '../../models/hr.model';
import { FormSheetComponent } from '../../../../shared/molecules/form-sheet/form-sheet.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { SelectComponent } from '../../../../shared/atoms/select/select.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { dayKey } from '../../../../shared/utils/time';

const MAX_FILES = 10;
const ACCEPT = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

/**
 * Nueva acción disciplinaria (W-J4): colaborador, tipo, fecha, hechos, fechas
 * de suspensión y adjuntos (PDF o fotos). El colaborador la recibe por correo
 * y en la app, donde da su acuse.
 */
@Component({
  selector: 'app-action-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormSheetComponent, FormFieldComponent, SelectComponent, IconComponent],
  template: `
    <app-form-sheet eyebrow="Disciplina" title="Nueva acción" subtitle="Le llega por correo y la ve en la app para dar su acuse. No cambia su salario."
      submitLabel="Registrar" [saving]="store.busy() === 'action'" [error]="generalError()" (submitted)="save()" (cancel)="cancel.emit()">
      <app-form-field label="Colaborador" [required]="true" [error]="tried() && !emp() ? 'Elige a quién va.' : fieldError('body.employee_id')">
        <app-select [compact]="true" placeholder="Elige un colaborador" [options]="staffOptions()" [(value)]="emp" ariaLabel="Colaborador" />
      </app-form-field>
      <div class="grid grid-cols-2 gap-3">
        <app-form-field label="Tipo" [required]="true"><app-select [compact]="true" [options]="types" [(value)]="type" ariaLabel="Tipo" /></app-form-field>
        <app-form-field label="Fecha de los hechos" for="ac-date" [required]="true" [error]="fieldError('body.occurred_on')">
          <input id="ac-date" type="date" class="field-native" [max]="today" [value]="date()" (input)="date.set($any($event.target).value)" />
        </app-form-field>
      </div>
      @if (type() === 'suspension') {
        <div class="grid grid-cols-2 gap-3">
          <app-form-field label="Suspensión desde" for="ac-from" [required]="true" [error]="fieldError('body.suspension_from')">
            <input id="ac-from" type="date" class="field-native" [value]="from()" (input)="from.set($any($event.target).value)" />
          </app-form-field>
          <app-form-field label="Hasta" for="ac-to" [required]="true" [error]="tried() && to() < from() ? 'Debe ser igual o después del inicio.' : fieldError('body.suspension_to')">
            <input id="ac-to" type="date" class="field-native" [min]="from()" [value]="to()" (input)="to.set($any($event.target).value)" />
          </app-form-field>
        </div>
      }
      <app-form-field label="Qué pasó" for="ac-desc" [required]="true" [error]="tried() && desc().trim().length < 10 ? 'Describe los hechos en al menos una frase.' : fieldError('body.description')">
        <textarea id="ac-desc" rows="4" class="field-native" maxlength="4000" placeholder="Hechos, fecha y a quién afectó" [value]="desc()" (input)="desc.set($any($event.target).value)"></textarea>
      </app-form-field>
      <app-form-field label="Adjuntos" [optional]="true" hint="Acta firmada, fotos o capturas. PDF o imagen, hasta 15 MB." [error]="fieldError('body.attachment_file_ids')">
        <label class="drop flex cursor-pointer items-center justify-center gap-2 rounded-field px-3 py-3 text-[12.5px] font-bold" [class.opacity-50]="files().length >= max">
          <app-icon name="upload" [size]="16" /> Elegir archivos
          <input type="file" class="sr-only" multiple [accept]="accept" [disabled]="files().length >= max" (change)="add($event)" />
        </label>
        @if (files().length) {
          <ul class="mt-2 space-y-1.5">
            @for (f of files(); track $index) {
              <li class="flex items-center gap-2 rounded-field bg-surface-soft px-3 py-2 text-[12.5px]">
                <app-icon name="file" [size]="14" class="text-text-secondary" />
                <span class="min-w-0 flex-1 truncate">{{ f.name }}</span>
                <button type="button" class="text-text-secondary hover:text-danger" [attr.aria-label]="'Quitar ' + f.name" (click)="remove($index)"><app-icon name="x" [size]="14" /></button>
              </li>
            }
          </ul>
        }
      </app-form-field>
    </app-form-sheet>
  `,
  styles: `
    .drop { border: 1px dashed var(--color-border-field); color: var(--color-primary); background: var(--color-surface); }
    .drop:hover { border-color: var(--color-secondary); }
  `,
})
export class ActionFormComponent implements OnInit {
  protected readonly store = inject(HrStore);
  /** Colaborador fijo (desde su ficha). */
  readonly employeeId = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancel = output<void>();

  protected readonly today = dayKey();
  protected readonly max = MAX_FILES;
  protected readonly accept = ACCEPT.join(',');
  protected readonly types = (Object.keys(DISCIPLINE_LABEL) as DisciplineType[]).map((t) => ({ value: t, label: DISCIPLINE_LABEL[t] }));
  protected readonly staffOptions = computed(() => this.store.staff().map((e) => ({ value: e.id, label: `${e.full_name} · ${e.position}` })));

  protected readonly emp = signal('');
  protected readonly type = signal<string>('verbal');
  protected readonly date = signal(dayKey());
  protected readonly from = signal(dayKey(1));
  protected readonly to = signal(dayKey(1));
  protected readonly desc = signal('');
  protected readonly files = signal<readonly File[]>([]);
  protected readonly tried = signal(false);

  protected readonly generalError = computed(() => {
    const e = this.store.saveError();
    return e && !e.errors.length ? e.detail : null;
  });

  ngOnInit(): void {
    this.store.clearSaveError();
    if (this.employeeId()) this.emp.set(this.employeeId()!);
  }

  protected fieldError(loc: string): string | null {
    return this.store.saveError()?.errors.find((e) => e.location === loc)?.message ?? null;
  }

  protected add(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const picked = [...(input.files ?? [])].filter((f) => ACCEPT.includes(f.type));
    this.files.set([...this.files(), ...picked].slice(0, MAX_FILES));
    input.value = '';
  }

  protected remove(i: number): void {
    this.files.set(this.files().filter((_, j) => j !== i));
  }

  protected async save(): Promise<void> {
    this.tried.set(true);
    const suspension = this.type() === 'suspension';
    if (!this.emp() || this.desc().trim().length < 10 || (suspension && this.to() < this.from())) return;
    const ok = await this.store.createAction(
      {
        employee_id: this.emp(), type: this.type() as DisciplineType, occurred_on: this.date(), description: this.desc().trim(),
        ...(suspension ? { suspension_from: this.from(), suspension_to: this.to() } : {}),
      },
      this.files(),
    );
    if (ok) this.saved.emit();
  }
}
