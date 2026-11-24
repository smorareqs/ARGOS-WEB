import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DISCIPLINE_LABEL, DisciplinaryAction } from '../../models/hr.model';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { FilterChipsComponent } from '../../../../shared/molecules/filter-chips/filter-chips.component';

/**
 * Lista de acciones disciplinarias (W-J4 y pestaña Disciplina de W-D2): tipo,
 * hechos, quién registró, adjuntos y el estado del acuse con la nota del
 * colaborador. `compact` oculta a la persona (ya se sabe en su ficha).
 */
@Component({
  selector: 'app-discipline-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, AvatarComponent, BadgeComponent, IconComponent, EmptyStateComponent, FilterChipsComponent],
  template: `
    @if (actions().length) {
      <app-filter-chips class="mb-4 block" [options]="chips()" [(value)]="filter" ariaLabel="Filtrar acciones" />
    }
    <div class="space-y-3">
      @for (a of shown(); track a.id; let i = $index) {
        <article class="reveal flex flex-col gap-3 rounded-card border border-border-card bg-surface p-5 shadow-e1 sm:flex-row sm:items-start" [style.--i]="i">
          @if (!compact()) { <app-avatar [initials]="a.employee_name.slice(0, 1)" [name]="a.employee_name" [size]="40" /> }
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              @if (!compact()) { <span class="text-[14px] font-bold text-primary">{{ a.employee_name }}</span> }
              <app-badge size="sm" [tone]="a.type === 'suspension' ? 'danger' : a.type === 'written' ? 'warning' : 'neutral'">{{ label(a) }}</app-badge>
            </div>
            <p class="mt-1.5 text-[13px] leading-relaxed text-text-body">{{ a.description }}</p>
            @if (a.suspension_from && a.suspension_to) {
              <p class="mt-1 text-[12.5px] font-bold text-danger">Suspensión del {{ asDate(a.suspension_from) | date: 'd MMM' }} al {{ asDate(a.suspension_to) | date: 'd MMM y' }}</p>
            }
            <p class="mt-1.5 text-[12px] text-text-secondary">{{ asDate(a.occurred_on) | date: 'd MMM y' }}@if (a.issued_by_name) { · registró {{ a.issued_by_name }} }</p>
            @if (a.attachments.length) {
              <div class="mt-2 flex flex-wrap gap-3 text-[12px]">
                @for (f of a.attachments; track f.file_id) {
                  <a class="link inline-flex items-center gap-1 font-bold" [href]="f.url" target="_blank" rel="noopener"><app-icon name="file" [size]="13" /> {{ f.name }}</a>
                }
              </div>
            }
            @if (a.acknowledgement_note) {
              <blockquote class="mt-2.5 rounded-field bg-surface-soft px-3.5 py-2.5 text-[12.5px] text-text-body">“{{ a.acknowledgement_note }}”</blockquote>
            }
          </div>
          <div class="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <app-badge [tone]="a.acknowledged_at ? 'success' : 'warning'" [icon]="a.acknowledged_at ? 'check' : 'clock'">{{ a.acknowledged_at ? 'Acuse recibido' : 'Esperando acuse' }}</app-badge>
            @if (a.acknowledged_at) { <span class="text-[11.5px] text-text-secondary">{{ a.acknowledged_at | date: 'd MMM, HH:mm' }}</span> }
          </div>
        </article>
      } @empty {
        <div class="rounded-card border border-border-card bg-surface">
          <app-empty-state kind="done" [title]="filter() === 'pending' ? 'Nada esperando acuse' : 'Sin acciones disciplinarias'" message="Cuando registres una, el colaborador recibe un correo y la ve en la app para dar su acuse. Nunca toca la nómina." />
        </div>
      }
    </div>
  `,
  styles: `
    .link { color: var(--color-action); }
    .link:hover { color: var(--color-primary); }
  `,
})
export class DisciplineListComponent {
  readonly actions = input.required<readonly DisciplinaryAction[]>();
  readonly compact = input<boolean>(false);

  protected readonly filter = signal('all');
  protected readonly chips = computed(() => [
    { value: 'all', label: 'Todas', count: this.actions().length },
    { value: 'pending', label: 'Esperando acuse', count: this.actions().filter((a) => !a.acknowledged_at).length, dot: 'var(--color-warning)' },
  ]);
  protected readonly shown = computed(() => (this.filter() === 'pending' ? this.actions().filter((a) => !a.acknowledged_at) : this.actions()));

  protected label(a: DisciplinaryAction): string {
    return DISCIPLINE_LABEL[a.type];
  }
  protected asDate(k: string): Date {
    return new Date(`${k}T12:00:00`);
  }
}
