import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { ApiError } from '../../../../core/http/api-error';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { FormFieldComponent } from '../../../../shared/molecules/form-field/form-field.component';
import { ChecklistTemplate, TemplateDraft } from '../../models/property.model';

interface EditItem {
  readonly key: number;
  text: string;
  photo: boolean;
  pair: boolean;
}

interface EditSection {
  readonly key: number;
  title: string;
  items: EditItem[];
}

type DragRef = { kind: 'section'; s: number } | { kind: 'item'; s: number; i: number };

let seq = 0;

/**
 * Organismo · checklist-editor (ux-ui.md W-C4): secciones e ítems que se
 * reordenan arrastrando (o con las flechas, en teclado y en móvil), cada ítem
 * con "Foto" y "Antes y después", y a la derecha la vista previa tal como la
 * verá el colaborador en la app (ref. Hospitable "Preview tasks"). El orden de
 * la lista es el orden en la app.
 */
@Component({
  selector: 'app-checklist-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CheckboxComponent, IconComponent, InputComponent, FormFieldComponent],
  template: `
    <form novalidate class="flex min-h-full flex-col" (submit)="submit($event)">
      <div class="px-6 pb-2 pt-7 pr-14">
        <div class="text-[11px] uppercase tracking-[1.6px] text-secondary">Checklists</div>
        <h2 class="mt-1 font-display text-[28px] font-semibold leading-tight tracking-display text-primary">
          {{ initial() ? 'Editar plantilla' : 'Nueva plantilla' }}
        </h2>
        <p class="mt-1 text-[13px] text-text-body">Las tareas copian la plantilla al empezar: editarla no cambia las que ya están en curso.</p>
      </div>

      <div class="grid flex-1 gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div class="flex min-w-0 flex-col gap-5">
          <app-form-field label="Nombre" for="ce-name" [required]="true" [error]="nameError()">
            <app-input inputId="ce-name" [compact]="true" placeholder="Limpieza estándar" [invalid]="!!nameError()" [(value)]="name" />
          </app-form-field>
          <app-form-field label="Descripción" for="ce-desc" [optional]="true">
            <app-input inputId="ce-desc" [compact]="true" placeholder="Entre huéspedes" [(value)]="description" />
          </app-form-field>
          <app-checkbox [(checked)]="isDefault">Usarla por defecto en las propiedades nuevas</app-checkbox>

          <div class="flex flex-col gap-3">
            @for (sec of sections(); track sec.key; let s = $index; let firstS = $first; let lastS = $last) {
              <section
                class="sec rounded-tile border border-border-card bg-surface"
                [class.is-over]="over() === 's' + s"
                (dragover)="allow($event, 's' + s)"
                (dragleave)="over.set(null)"
                (drop)="dropOn($event, s, null)"
              >
                <div class="flex items-center gap-1.5 border-b border-divider px-2 py-2">
                  <span class="grip" draggable="true" (dragstart)="start($event, { kind: 'section', s })" title="Arrastra para mover la sección" aria-hidden="true">
                    <app-icon name="grip" [size]="16" />
                  </span>
                  <input class="sec-title min-w-0 flex-1" [value]="sec.title" (input)="setTitle(s, $any($event.target).value)" placeholder="Nombre de la sección" [attr.aria-label]="'Sección ' + (s + 1)" />
                  <app-button variant="icon" size="sm" ariaLabel="Subir sección" [disabled]="firstS" (pressed)="moveSection(s, -1)"><app-icon name="chevron-up" [size]="15" /></app-button>
                  <app-button variant="icon" size="sm" ariaLabel="Bajar sección" [disabled]="lastS" (pressed)="moveSection(s, 1)"><app-icon name="chevron-down" [size]="15" /></app-button>
                  <app-button variant="icon" size="sm" ariaLabel="Quitar sección" (pressed)="removeSection(s)"><app-icon name="trash" [size]="15" /></app-button>
                </div>
                <ul class="flex flex-col">
                  @for (it of sec.items; track it.key; let i = $index; let firstI = $first; let lastI = $last) {
                    <li
                      class="item flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-divider px-2 py-1.5 last:border-0"
                      [class.is-over]="over() === s + '.' + i"
                      (dragover)="allow($event, s + '.' + i)"
                      (drop)="dropOn($event, s, i)"
                    >
                      <span class="grip" draggable="true" (dragstart)="start($event, { kind: 'item', s, i })" title="Arrastra para mover" aria-hidden="true">
                        <app-icon name="grip" [size]="15" />
                      </span>
                      <input class="item-text min-w-[160px] flex-1" [value]="it.text" (input)="setText(s, i, $any($event.target).value)" placeholder="Qué hay que hacer" [attr.aria-label]="'Punto ' + (i + 1) + ' de ' + (sec.title || 'la sección')" />
                      <span class="flex items-center gap-1">
                        <button type="button" class="tog" [class.is-on]="it.photo" [attr.aria-pressed]="it.photo" (click)="toggle(s, i, 'photo')">
                          <app-icon name="camera" [size]="13" /> Foto
                        </button>
                        <button type="button" class="tog" [class.is-on]="it.pair" [attr.aria-pressed]="it.pair" (click)="toggle(s, i, 'pair')">Antes y después</button>
                        <app-button variant="icon" size="sm" ariaLabel="Subir punto" [disabled]="firstI" (pressed)="moveItem(s, i, -1)"><app-icon name="chevron-up" [size]="14" /></app-button>
                        <app-button variant="icon" size="sm" ariaLabel="Bajar punto" [disabled]="lastI" (pressed)="moveItem(s, i, 1)"><app-icon name="chevron-down" [size]="14" /></app-button>
                        <app-button variant="icon" size="sm" ariaLabel="Quitar punto" (pressed)="removeItem(s, i)"><app-icon name="x" [size]="14" /></app-button>
                      </span>
                    </li>
                  }
                </ul>
                <button type="button" class="add flex w-full items-center gap-1.5 px-3 py-2 text-[12.5px] font-bold" (click)="addItem(s)">
                  <app-icon name="plus" [size]="14" /> Agregar punto
                </button>
              </section>
            }
            <app-button variant="tertiary" (pressed)="addSection()"><app-icon name="plus" [size]="16" /> Agregar sección</app-button>
          </div>

          @if (generalError(); as e) {
            <p class="rounded-field bg-danger-soft px-4 py-3 text-[13px] text-danger" role="alert">{{ e }}</p>
          }
        </div>

        <!-- Vista previa como en la app -->
        <aside class="lg:sticky lg:top-4 lg:self-start" aria-label="Vista previa en la app">
          <div class="mb-2 text-[10.5px] uppercase tracking-[1px] text-text-secondary">Así la ve el colaborador</div>
          <div class="phone rounded-[26px] border-[6px] border-primary bg-background p-3 shadow-e2">
            <div class="font-display text-[16px] font-semibold text-primary">{{ name() || 'Plantilla' }}</div>
            <div class="mb-3 text-[11px] text-text-secondary">{{ counts().items }} puntos · {{ counts().photos }} con foto</div>
            @for (sec of sections(); track sec.key) {
              @if (sec.items.length) {
                <div class="mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-[1px] text-teal-muted">{{ sec.title || 'Sin nombre' }}</div>
                <div class="overflow-hidden rounded-tile bg-surface">
                  @for (it of sec.items; track it.key) {
                    <div class="flex items-center gap-2.5 border-b border-divider px-2.5 py-2 last:border-0">
                      <span class="h-[18px] w-[18px] shrink-0 rounded-pill border-2 border-border-field"></span>
                      <span class="min-w-0 flex-1 text-[11.5px] leading-snug text-text-body">{{ it.text || '…' }}</span>
                      @if (it.pair) {
                        <span class="shrink-0 rounded-xs bg-warning-soft px-1 text-[9.5px] font-bold text-warning">ANTES · DESPUÉS</span>
                      } @else if (it.photo) {
                        <app-icon name="camera" [size]="14" class="shrink-0 text-secondary" />
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
        </aside>
      </div>

      <div class="material-glass sticky bottom-0 flex justify-end gap-2.5 border-t border-divider px-6 py-4">
        <app-button variant="tertiary" (pressed)="cancel.emit()">Cancelar</app-button>
        <app-button variant="primary" type="submit" [loading]="saving()">{{ initial() ? 'Guardar cambios' : 'Crear plantilla' }}</app-button>
      </div>
    </form>
  `,
  styles: `
    :host { display: block; min-height: 100%; }
    .grip { display: flex; padding: 4px 2px; color: var(--color-text-muted); cursor: grab; border-radius: 4px; }
    .grip:hover { color: var(--color-primary); background: var(--color-background); }
    .sec-title { font-weight: 700; font-size: 13.5px; color: var(--color-primary); background: transparent; padding: 4px 6px; border-radius: 6px; }
    .item-text { font-size: 13px; color: var(--color-text-body); background: transparent; padding: 6px; border-radius: 6px; }
    .sec-title:focus, .item-text:focus { outline: 2px solid var(--color-secondary); outline-offset: 0; background: var(--color-surface-soft); }
    .tog { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 8px; border-radius: 6px; font-size: 11.5px; font-weight: 600;
      color: var(--color-text-secondary); border: 1px solid var(--color-border-field); transition: all var(--dur-fast); white-space: nowrap; }
    .tog.is-on { color: var(--color-primary); background: var(--color-teal-washed); border-color: var(--color-teal-muted); }
    .add { color: var(--color-teal-muted); border-top: 1px dashed var(--color-divider); }
    .add:hover { color: var(--color-primary); background: var(--color-surface-soft); }
    .is-over { box-shadow: inset 0 2px 0 var(--color-secondary); }
    .phone { max-height: 560px; overflow: auto; }
  `,
})
export class ChecklistEditorComponent {
  readonly initial = input<ChecklistTemplate | null>(null);
  readonly saving = input<boolean>(false);
  readonly serverError = input<ApiError | null>(null);
  readonly submitted = output<TemplateDraft>();
  readonly cancel = output<void>();

  protected readonly name = signal('');
  protected readonly description = signal('');
  protected readonly isDefault = signal(false);
  protected readonly sections = signal<EditSection[]>([]);
  protected readonly over = signal<string | null>(null);
  private readonly tried = signal(false);
  private drag: DragRef | null = null;

  constructor() {
    effect(() => {
      const t = this.initial();
      untracked(() => {
        this.name.set(t?.name ?? '');
        this.description.set(t?.description ?? '');
        this.isDefault.set(t?.is_default ?? false);
        this.sections.set(t ? toSections(t) : [newSection('Habitaciones'), newSection('Baños')]);
      });
    });
  }

  protected readonly counts = computed(() => {
    const items = this.sections().flatMap((s) => s.items);
    return { items: items.length, photos: items.filter((i) => i.photo || i.pair).length };
  });

  protected readonly nameError = computed(() => {
    const server = this.serverError()?.field('name');
    if (server) return server;
    return this.tried() && this.name().trim().length < 2 ? 'Ponle un nombre (2 letras o más).' : null;
  });

  protected readonly generalError = computed(() => {
    const e = this.serverError();
    if (e && !e.field('name')) return e.errors[0]?.message ?? e.detail;
    if (this.tried() && !this.counts().items) return 'Agrega al menos un punto a revisar.';
    return null;
  });

  // --- Edición (cada cambio crea un arreglo nuevo para que la señal avise) ---

  private edit(fn: (list: EditSection[]) => void): void {
    const copy = this.sections().map((s) => ({ ...s, items: s.items.map((i) => ({ ...i })) }));
    fn(copy);
    this.sections.set(copy);
  }

  protected setTitle(s: number, v: string): void {
    this.edit((l) => (l[s].title = v));
  }
  protected setText(s: number, i: number, v: string): void {
    this.edit((l) => (l[s].items[i].text = v));
  }
  protected toggle(s: number, i: number, k: 'photo' | 'pair'): void {
    this.edit((l) => {
      const it = l[s].items[i];
      it[k] = !it[k];
      if (k === 'pair' && it.pair) it.photo = true;
    });
  }
  protected addItem(s: number): void {
    this.edit((l) => l[s].items.push(newItem()));
    queueMicrotask(() => {
      const inputs = document.querySelectorAll('app-checklist-editor section')[s]?.querySelectorAll<HTMLInputElement>('.item-text');
      inputs?.[inputs.length - 1]?.focus();
    });
  }
  protected removeItem(s: number, i: number): void {
    this.edit((l) => l[s].items.splice(i, 1));
  }
  protected addSection(): void {
    this.edit((l) => l.push(newSection('')));
  }
  protected removeSection(s: number): void {
    this.edit((l) => l.splice(s, 1));
  }
  protected moveSection(s: number, d: number): void {
    this.edit((l) => l.splice(s + d, 0, ...l.splice(s, 1)));
  }
  protected moveItem(s: number, i: number, d: number): void {
    this.edit((l) => l[s].items.splice(i + d, 0, ...l[s].items.splice(i, 1)));
  }

  // --- Arrastrar y soltar (HTML5) ---

  protected start(e: DragEvent, ref: DragRef): void {
    this.drag = ref;
    e.dataTransfer?.setData('text/plain', 'checklist');
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  protected allow(e: DragEvent, key: string): void {
    if (!this.drag) return;
    e.preventDefault();
    e.stopPropagation();
    this.over.set(key);
  }

  /** Suelta antes del ítem i de la sección s (i null = al final de la sección). */
  protected dropOn(e: DragEvent, s: number, i: number | null): void {
    e.preventDefault();
    e.stopPropagation();
    const d = this.drag;
    this.drag = null;
    this.over.set(null);
    if (!d) return;
    this.edit((l) => {
      if (d.kind === 'section') {
        const [moved] = l.splice(d.s, 1);
        l.splice(s, 0, moved);
        return;
      }
      const [it] = l[d.s].items.splice(d.i, 1);
      const target = l[s].items;
      const at = i === null ? target.length : d.s === s && d.i < i ? i - 1 : i;
      target.splice(at, 0, it);
    });
  }

  protected submit(e: Event): void {
    e.preventDefault();
    this.tried.set(true);
    if (this.nameError() || !this.counts().items) return;
    const items = this.sections().flatMap((sec) =>
      sec.items
        .filter((it) => it.text.trim())
        .map((it) => ({
          section: sec.title.trim() || 'General',
          text: it.text.trim(),
          requires_photo: it.photo || it.pair,
          requires_before_after: it.pair,
        })),
    );
    this.submitted.emit({
      name: this.name().trim(),
      description: this.description().trim() || null,
      is_default: this.isDefault(),
      items,
    });
  }
}

function newItem(): EditItem {
  return { key: ++seq, text: '', photo: false, pair: false };
}

function newSection(title: string): EditSection {
  return { key: ++seq, title, items: [newItem()] };
}

/** Agrupa los ítems consecutivos de la misma sección. */
function toSections(t: ChecklistTemplate): EditSection[] {
  const out: EditSection[] = [];
  for (const it of [...t.items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
    let sec = out[out.length - 1];
    if (!sec || sec.title !== it.section) {
      sec = { key: ++seq, title: it.section, items: [] };
      out.push(sec);
    }
    sec.items.push({ key: ++seq, text: it.text, photo: it.requires_photo, pair: it.requires_before_after });
  }
  return out;
}
