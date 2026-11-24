import { ChangeDetectionStrategy, Component, OnDestroy, computed, input, model } from '@angular/core';
import { IconComponent } from '../../atoms/icon/icon.component';

/**
 * Molecule · elegir fotos antes de subirlas: botón "Agregar fotos" y
 * miniaturas con quitar. No sube nada: quien la usa sube `files()` al
 * guardar (FilesApi) y manda los file_id. Úsala en reportes y evidencias.
 */
@Component({
  selector: 'app-photo-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div>
      <div class="mb-1.5 flex items-baseline justify-between">
        <span class="text-[12.5px] font-bold text-primary">{{ label() }}</span>
        <span class="text-[11.5px] text-text-secondary">{{ files().length }} de {{ max() }}</span>
      </div>
      <div class="grid grid-cols-4 gap-2">
        @for (p of previews(); track p.url; let i = $index) {
          <div class="thumb relative overflow-hidden rounded-tile">
            <img [src]="p.url" alt="" class="aspect-square w-full object-cover" />
            <button type="button" class="remove absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-pill" [attr.aria-label]="'Quitar foto ' + (i + 1)" (click)="remove(i)">
              <app-icon name="x" [size]="13" />
            </button>
          </div>
        }
        @if (files().length < max()) {
          <label class="add flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-tile text-[11px] font-bold">
            <app-icon name="camera" [size]="18" />
            Agregar
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple class="sr-only" (change)="add($event)" />
          </label>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .thumb { box-shadow: var(--shadow-e1); }
    .remove { background: rgba(0, 42, 49, 0.72); color: #fff; }
    .remove:hover { background: var(--color-danger); }
    .add { border: 1.5px dashed var(--color-border-field); color: var(--color-teal-muted); background: var(--color-surface-soft); transition: border-color var(--dur-fast), color var(--dur-fast); }
    .add:hover, .add:focus-within { border-color: var(--color-secondary); color: var(--color-primary); }
    @media (prefers-reduced-motion: reduce) { .add { transition: none; } }
  `,
})
export class PhotoPickerComponent implements OnDestroy {
  readonly files = model<readonly File[]>([]);
  readonly label = input<string>('Fotos');
  readonly max = input<number>(10);

  private urls = new Map<File, string>();

  protected readonly previews = computed(() =>
    this.files().map((f) => {
      let url = this.urls.get(f);
      if (!url) {
        url = URL.createObjectURL(f);
        this.urls.set(f, url);
      }
      return { file: f, url };
    }),
  );

  protected add(e: Event): void {
    const input = e.target as HTMLInputElement;
    const picked = [...(input.files ?? [])].filter((f) => f.type.startsWith('image/') && f.size <= 8 * 1024 * 1024);
    this.files.set([...this.files(), ...picked].slice(0, this.max()));
    input.value = '';
  }

  protected remove(i: number): void {
    const f = this.files()[i];
    const url = this.urls.get(f);
    if (url) URL.revokeObjectURL(url);
    this.urls.delete(f);
    this.files.set(this.files().filter((_, j) => j !== i));
  }

  ngOnDestroy(): void {
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
  }
}
