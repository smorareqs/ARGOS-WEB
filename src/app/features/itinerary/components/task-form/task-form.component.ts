import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { ApiError } from '../../../../core/http/api-error';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { SelectComponent, SelectOption } from '../../../../shared/atoms/select/select.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { SpotIconComponent } from '../../../../shared/atoms/spot-icon/spot-icon.component';
import { dayKey } from '../../../../shared/utils/time';
import { Task, TaskDraft, TaskType, TYPE_META } from '../../models/task.model';
import { Assignable, PropertyOption } from '../../services/itinerary-api.service';

/**
 * Formulario "Nueva tarea" en drawer (W-E4). El selector de persona muestra
 * cuántas tareas tiene ese día, para repartir la carga sin abrir el calendario.
 */
@Component({
  selector: 'app-task-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormFieldComponent, SegmentedComponent, SelectComponent, ButtonComponent, SpotIconComponent],
  template: `
    <form novalidate class="flex min-h-full flex-col" (submit)="submit($event)">
      <div class="flex items-start gap-4 px-6 pb-2 pt-7">
        <app-spot-icon [name]="types[type()].spot" [size]="56" />
        <div>
          <div class="text-[11px] uppercase tracking-[1.6px] text-secondary">Itinerario</div>
          <h2 class="mt-1 font-display text-[28px] font-semibold leading-tight tracking-display text-primary">Nueva tarea</h2>
          <p class="mt-1 text-[13px] text-text-body">La persona asignada la recibe en la app al guardar.</p>
        </div>
      </div>
      <div class="flex flex-1 flex-col gap-5 px-6 py-6">
        <app-form-field label="Tipo" [required]="true">
          <app-select [compact]="true" [options]="typeOptions" [(value)]="type" ariaLabel="Tipo de tarea" />
        </app-form-field>
        <app-form-field label="Propiedad" for="tf-prop" [required]="true" [error]="propError()">
          <app-select selectId="tf-prop" [compact]="true" [options]="propertyOptions()" placeholder="Elige una propiedad" [invalid]="!!propError()" [(value)]="property" (blurred)="touched.set(true)" />
        </app-form-field>
        <div class="grid grid-cols-[1.3fr_1fr_1fr] gap-3">
          <app-form-field label="Fecha" for="tf-date" [required]="true">
            <input id="tf-date" type="date" class="field" [value]="date()" (input)="date.set($any($event.target).value)" />
          </app-form-field>
          <app-form-field label="Desde" for="tf-start" [required]="true">
            <input id="tf-start" type="time" step="900" class="field" [value]="start()" (input)="start.set($any($event.target).value)" />
          </app-form-field>
          <app-form-field label="Hasta" for="tf-end" [required]="true" [error]="endError()">
            <input id="tf-end" type="time" step="900" class="field" [class.is-bad]="!!endError()" [value]="end()" (input)="end.set($any($event.target).value)" />
          </app-form-field>
        </div>
        <app-form-field label="Asignar a" [optional]="true" hint="Entre paréntesis, sus tareas de ese día.">
          <app-select [compact]="true" [options]="peopleOptions()" [(value)]="assignee" ariaLabel="Asignar a" />
        </app-form-field>
        <app-form-field label="Prioridad">
          <app-segmented [options]="priorities" [(value)]="priority" [compact]="true" ariaLabel="Prioridad" />
        </app-form-field>
        <app-form-field label="Notas para el colaborador" for="tf-notes" [optional]="true">
          <textarea id="tf-notes" rows="3" class="field !h-auto py-2.5" placeholder="Ej.: el huésped pidió cuna para la llegada" [value]="notes()" (input)="notes.set($any($event.target).value)"></textarea>
        </app-form-field>
        @if (serverError() && !serverError()!.errors.length) {
          <p class="rounded-field bg-danger-soft px-4 py-3 text-[13px] text-danger" role="alert">{{ serverError()!.detail }}</p>
        }
      </div>
      <div class="material-glass sticky bottom-0 flex justify-end gap-2.5 border-t border-divider px-6 py-4">
        <app-button variant="tertiary" (pressed)="cancel.emit()">Cancelar</app-button>
        <app-button variant="primary" type="submit" [loading]="saving()">Crear tarea</app-button>
      </div>
    </form>
  `,
  styles: `
    :host { display: block; min-height: 100%; }
    .field { width: 100%; height: 40px; border-radius: var(--radius-field); border: 1px solid var(--color-border-field); background: var(--color-surface); padding: 0 12px; font-size: 13.5px; color: var(--color-primary); }
    .field:focus { outline: 2px solid var(--color-secondary); outline-offset: 1px; }
    .field.is-bad { border-color: var(--color-danger); }
  `,
})
export class TaskFormComponent {
  readonly properties = input.required<readonly PropertyOption[]>();
  readonly people = input.required<readonly Assignable[]>();
  readonly tasks = input<readonly Task[]>([]);
  readonly saving = input<boolean>(false);
  readonly serverError = input<ApiError | null>(null);
  /** Valores iniciales (por ejemplo, desde "Programar limpieza" en Propiedades). */
  readonly preset = input<Partial<TaskDraft> | null>(null);
  readonly submitted = output<TaskDraft>();
  readonly cancel = output<void>();

  protected readonly types = TYPE_META;
  protected readonly type = signal<TaskType>('checkout_cleaning');
  protected readonly property = signal('');
  protected readonly date = signal(dayKey());
  protected readonly start = signal('11:00');
  protected readonly end = signal('14:00');
  protected readonly assignee = signal('');
  protected readonly priority = signal('normal');
  protected readonly notes = signal('');
  protected readonly touched = signal(false);
  private readonly tried = signal(false);

  protected readonly typeOptions: SelectOption[] = (Object.keys(TYPE_META) as TaskType[]).map((t) => ({ value: t, label: TYPE_META[t].label }));
  protected readonly priorities = [
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Alta' },
  ];
  protected readonly propertyOptions = computed<SelectOption[]>(() =>
    this.properties().map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` })),
  );
  protected readonly peopleOptions = computed<SelectOption[]>(() => {
    const day = this.date();
    const load = (id: string) => this.tasks().filter((t) => t.assignee_id === id && t.date === day && t.status !== 'cancelled').length;
    return [{ value: '', label: 'Sin asignar (queda arriba en el calendario)' }, ...this.people().map((p) => ({ value: p.id, label: `${p.name} · ${p.role} (${load(p.id)})` }))];
  });
  protected readonly propError = computed(() => ((this.touched() || this.tried()) && !this.property() ? 'Elige una propiedad.' : this.fieldError('property_id')));
  protected readonly endError = computed(() => (this.end() <= this.start() ? 'Debe ser después del inicio.' : this.fieldError('end')));

  constructor() {
    effect(() => {
      const p = this.preset();
      if (!p) return;
      untracked(() => {
        if (p.property_id) this.property.set(p.property_id);
        if (p.date) this.date.set(p.date);
        if (p.type) this.type.set(p.type);
        if (p.assignee_id) this.assignee.set(p.assignee_id);
      });
    });
  }

  private fieldError(field: string): string | null {
    return this.serverError()?.errors.find((e) => e.location === `body.${field}`)?.message ?? null;
  }

  protected submit(e: Event): void {
    e.preventDefault();
    this.tried.set(true);
    if (!this.property() || this.end() <= this.start()) return;
    this.submitted.emit({
      type: this.type(),
      property_id: this.property(),
      date: this.date(),
      start: this.start(),
      end: this.end(),
      assignee_id: this.assignee() || null,
      priority: this.priority() as 'normal' | 'high',
      notes: this.notes().trim() || null,
    });
  }
}
