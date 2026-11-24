import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ChatApi } from '../../services/chat-api.service';
import { ChatMessage, ChatPerson, Conversation, ConversationKind, DEFAULT_REPLIES, dayLabel } from '../../models/chat.model';
import { toApiError } from '../../../../core/http/api-error';
import { ToastService } from '../../../../core/services/toast.service';
import { SessionStore } from '../../../../core/store/session.store';
import { AvatarComponent } from '../../../../shared/atoms/avatar/avatar.component';
import { BadgeComponent } from '../../../../shared/atoms/badge/badge.component';
import { ButtonComponent } from '../../../../shared/atoms/button/button.component';
import { CheckboxComponent } from '../../../../shared/atoms/checkbox/checkbox.component';
import { IconComponent } from '../../../../shared/atoms/icon/icon.component';
import { InputComponent } from '../../../../shared/atoms/input/input.component';
import { DemoDataNoteComponent } from '../../../../shared/molecules/demo-data-note/demo-data-note.component';
import { EmptyStateComponent } from '../../../../shared/molecules/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/molecules/page-header/page-header.component';
import { SegmentedComponent } from '../../../../shared/molecules/segmented/segmented.component';
import { DrawerComponent } from '../../../../shared/organisms/drawer/drawer.component';

const POLL_MS = 15_000;
const STATUS: Record<string, string> = { pending: 'Por confirmar', confirmed: 'Confirmada', checked_in: 'Hospedado', checked_out: 'Salió', cancelled: 'Cancelada' };

/**
 * Screen · Chat (W-M1): conversaciones internas y con huéspedes a tres
 * columnas (lista con no leídos y búsqueda, conversación y contexto de la
 * reserva). Respuestas rápidas editables. En móvil, lista o conversación.
 */
@Component({
  selector: 'app-chat-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    RouterLink,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    CheckboxComponent,
    IconComponent,
    InputComponent,
    DemoDataNoteComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    SegmentedComponent,
    DrawerComponent,
  ],
  template: `
    <app-page-header title="Chat" eyebrow="Operación" [subtitle]="subtitle()" />
    <app-demo-data-note module="chat" label="El chat" />

    <div class="shell grid overflow-hidden rounded-card border border-border-card bg-surface shadow-e1 lg:grid-cols-[320px_1fr] 2xl:grid-cols-[320px_1fr_300px]">
      <!-- Lista -->
      <aside class="min-h-0 flex-col border-divider lg:border-r" [class]="current() ? 'hidden lg:flex' : 'flex'">
        <div class="space-y-3 border-b border-divider p-4">
          <div class="flex items-center gap-2">
            <app-segmented class="flex-1" [options]="kinds()" [value]="kind()" (valueChange)="setKind($event)" ariaLabel="Tipo de conversación" />
            @if (kind() === 'internal' && canInternal()) {
              <app-button variant="icon" size="sm" ariaLabel="Nueva conversación" (pressed)="openNew()"><app-icon name="plus" [size]="16" /></app-button>
            }
          </div>
          <app-input icon="search" placeholder="Buscar por nombre o reserva" [compact]="true" [value]="q()" (valueChange)="q.set($event)" ariaLabel="Buscar conversación" />
        </div>
        <ul class="min-h-0 flex-1 overflow-y-auto">
          @for (c of filtered(); track c.id) {
            <li>
              <button type="button" class="conv flex w-full items-start gap-3 px-4 py-3 text-left" [class.is-on]="c.id === selected()" (click)="open(c.id)">
                <app-avatar [initials]="c.title.slice(0, 1)" [name]="c.title" [size]="38" [tone]="c.kind === 'guest' ? 'secondary' : 'primary'" />
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="truncate text-[13.5px] font-bold text-primary">{{ c.title }}</span>
                    <span class="shrink-0 text-[11px] text-text-secondary">{{ when(c.last_message_at) }}</span>
                  </div>
                  @if (c.reservation; as r) { <div class="truncate text-[11.5px] text-secondary">{{ r.property_code }} · {{ r.code }}</div> }
                  <div class="flex items-center gap-2">
                    <span class="min-w-0 flex-1 truncate text-[12.5px]" [class]="c.unread ? 'font-bold text-text-body' : 'text-text-secondary'">{{ preview(c) }}</span>
                    @if (c.unread) { <span class="unread tabular">{{ c.unread }}</span> }
                  </div>
                </div>
              </button>
            </li>
          } @empty {
            <li class="px-4 py-10 text-center text-[12.5px] text-text-secondary">{{ list() ? 'No hay conversaciones aquí.' : 'Cargando…' }}</li>
          }
        </ul>
      </aside>

      <!-- Conversacion -->
      <section class="min-h-0 flex-col" [class]="current() ? 'flex' : 'hidden lg:flex'">
        @if (current(); as c) {
          <header class="flex items-center gap-3 border-b border-divider px-4 py-3">
            <app-button class="lg:hidden" variant="icon" size="sm" ariaLabel="Volver a la lista" (pressed)="open(null)"><app-icon name="arrow-left" [size]="16" /></app-button>
            <app-avatar [initials]="c.title.slice(0, 1)" [name]="c.title" [size]="34" [tone]="c.kind === 'guest' ? 'secondary' : 'primary'" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-[14px] font-bold text-primary">{{ c.title }}</div>
              <div class="truncate text-[12px] text-text-secondary">
                @if (c.reservation; as r) { {{ r.property_code }} · {{ asDate(r.check_in_date) | date: 'd MMM' }} – {{ asDate(r.check_out_date) | date: 'd MMM' }} }
                @else { {{ names(c) }} }
              </div>
            </div>
            @if (c.reservation; as r) { <a class="hidden text-[12.5px] font-bold text-action sm:block 2xl:hidden" routerLink="/reservas" [queryParams]="{ ver: r.code }">Ver reserva</a> }
          </header>
          <div #scroller class="min-h-0 flex-1 space-y-1 overflow-y-auto bg-surface-soft px-4 py-4">
            @if (messages(); as list) {
              @for (m of list; track m.id; let i = $index) {
                @if (i === 0 || day(list[i - 1].created_at) !== day(m.created_at)) {
                  <div class="py-2 text-center text-[11px] font-bold uppercase tracking-[1px] text-text-secondary">{{ day(m.created_at) }}</div>
                }
                <div class="flex" [class.justify-end]="m.mine">
                  <div class="bubble max-w-[78%]" [class.mine]="m.mine">
                    @if (!m.mine && c.kind === 'internal' && (i === 0 || list[i - 1].sender_id !== m.sender_id)) {
                      <div class="mb-0.5 text-[11px] font-bold text-secondary">{{ m.sender_name }}</div>
                    }
                    <div class="whitespace-pre-wrap break-words text-[13.5px] leading-[1.45]">{{ m.body }}</div>
                    <div class="mt-0.5 text-right text-[10.5px] opacity-70">{{ m.created_at | date: 'HH:mm' }}</div>
                  </div>
                </div>
              } @empty {
                <p class="py-10 text-center text-[12.5px] text-text-secondary">Todavía no hay mensajes. Escribe el primero.</p>
              }
            } @else {
              <div class="skeleton mx-auto h-[120px] w-2/3 !rounded-card"></div>
            }
          </div>
          <footer class="border-t border-divider px-4 py-3">
            <div class="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              @for (r of replies(); track r) {
                <button type="button" class="chip shrink-0" (click)="draft.set(r)">{{ r.length > 42 ? r.slice(0, 40) + '…' : r }}</button>
              }
              <button type="button" class="chip shrink-0 !text-text-secondary" (click)="editing.set(true)"><app-icon name="pencil" [size]="12" /> Editar</button>
            </div>
            <form class="flex items-end gap-2" (submit)="$event.preventDefault(); send()">
              <textarea class="composer min-h-[44px] flex-1 resize-none rounded-[10px] border border-border-field bg-surface px-3 py-2.5 text-[13.5px] outline-none" rows="1"
                [value]="draft()" (input)="draft.set($any($event.target).value)" (keydown.enter)="enter($event)" placeholder="Escribe un mensaje" aria-label="Mensaje"></textarea>
              <app-button type="submit" [loading]="sending()" [disabled]="!draft().trim()" ariaLabel="Enviar"><app-icon name="send" [size]="16" /></app-button>
            </form>
          </footer>
        } @else {
          <div class="flex flex-1 items-center justify-center p-6"><app-empty-state kind="soon" title="Elige una conversación" message="Los mensajes de huéspedes llegan aquí en tiempo real; los no leídos van arriba." /></div>
        }
      </section>

      <!-- Contexto -->
      <aside class="hidden min-h-0 flex-col overflow-y-auto border-l border-divider 2xl:flex">
        @if (current(); as c) {
          @if (c.reservation; as r) {
            <div class="space-y-4 p-5">
              <div class="text-[11px] uppercase tracking-[1.4px] text-text-secondary">Reserva</div>
              <div>
                <div class="font-mono text-[13px] font-bold text-primary">{{ r.code }}</div>
                <app-badge size="sm" [tone]="r.status === 'checked_in' ? 'success' : 'info'">{{ status(r.status) }}</app-badge>
              </div>
              <dl class="space-y-2.5 text-[12.5px]">
                <div><dt class="text-text-secondary">Propiedad</dt><dd class="font-bold text-primary">{{ r.property_code }} · {{ r.property_name }}</dd></div>
                <div><dt class="text-text-secondary">Fechas</dt><dd class="text-text-body">{{ asDate(r.check_in_date) | date: "EEE d 'de' MMM" }} → {{ asDate(r.check_out_date) | date: "EEE d 'de' MMM" }}</dd></div>
                <div><dt class="text-text-secondary">Huéspedes</dt><dd class="text-text-body">{{ r.guests_count }}</dd></div>
              </dl>
              <div class="flex flex-col gap-2">
                <a class="rounded-[8px] bg-teal-washed px-3 py-2 text-center text-[12.5px] font-bold text-primary" routerLink="/reservas" [queryParams]="{ ver: r.code }">Abrir la reserva</a>
                <a class="rounded-[8px] bg-teal-washed px-3 py-2 text-center text-[12.5px] font-bold text-primary" routerLink="/mantenimiento" [queryParams]="{ nueva: 1 }">Reportar una incidencia</a>
              </div>
            </div>
          } @else {
            <div class="p-5">
              <div class="text-[11px] uppercase tracking-[1.4px] text-text-secondary">Participantes</div>
              <ul class="mt-3 space-y-2.5">
                @for (p of c.participants; track p.id) {
                  <li class="flex items-center gap-2.5"><app-avatar [initials]="p.name.slice(0, 1)" [name]="p.name" [size]="28" /><div><div class="text-[12.5px] font-bold text-primary">{{ p.name }}</div><div class="text-[11px] text-text-secondary">{{ p.role ?? '' }}</div></div></li>
                }
              </ul>
            </div>
          }
        }
      </aside>
    </div>

    <app-drawer [open]="editing()" (openChange)="editing.set($event)" label="Respuestas rápidas" [width]="460">
      @if (editing()) {
        <div class="flex h-full flex-col">
          <div class="border-b border-divider px-6 py-5">
            <h2 class="font-display text-[20px] font-semibold text-primary">Respuestas rápidas</h2>
            <p class="mt-1 text-[12.5px] text-text-secondary">Se guardan en este navegador para tu empresa.</p>
          </div>
          <ul class="flex-1 space-y-2 overflow-y-auto px-6 py-5">
            @for (r of replies(); track r; let i = $index) {
              <li class="flex items-start gap-2 rounded-[10px] bg-surface-soft px-3 py-2.5 text-[13px]"><span class="flex-1">{{ r }}</span>
                <app-button variant="icon" size="sm" ariaLabel="Quitar" (pressed)="removeReply(i)"><app-icon name="trash" [size]="14" /></app-button></li>
            }
          </ul>
          <form class="flex gap-2 border-t border-divider px-6 py-4" (submit)="$event.preventDefault(); addReply()">
            <app-input class="flex-1" placeholder="Nueva respuesta" [value]="newReply()" (valueChange)="newReply.set($event)" ariaLabel="Nueva respuesta" />
            <app-button type="submit" [disabled]="!newReply().trim()">Agregar</app-button>
          </form>
        </div>
      }
    </app-drawer>

    <app-drawer [open]="creating()" (openChange)="creating.set($event)" label="Nueva conversación" [width]="460">
      @if (creating()) {
        <form class="flex h-full flex-col" (submit)="$event.preventDefault(); create()">
          <div class="border-b border-divider px-6 py-5">
            <h2 class="font-display text-[20px] font-semibold text-primary">Nueva conversación</h2>
            <p class="mt-1 text-[12.5px] text-text-secondary">Con una persona o un grupo del equipo.</p>
            <div class="mt-3"><app-input placeholder="Nombre del grupo (opcional)" [value]="groupName()" (valueChange)="groupName.set($event)" ariaLabel="Nombre del grupo" /></div>
          </div>
          <ul class="flex-1 space-y-2 overflow-y-auto px-6 py-5">
            @for (p of people(); track p.id) {
              <li><app-checkbox [checked]="picked().includes(p.id)" (checkedChange)="pick(p.id, $event)">{{ p.name }}{{ p.role ? ' · ' + p.role : '' }}</app-checkbox></li>
            }
          </ul>
          <div class="flex justify-end gap-2.5 border-t border-divider px-6 py-4">
            <app-button variant="tertiary" (pressed)="creating.set(false)">Cancelar</app-button>
            <app-button type="submit" [disabled]="!picked().length">Crear</app-button>
          </div>
        </form>
      }
    </app-drawer>
  `,
  styles: `
    .shell { height: calc(100dvh - 300px); min-height: 480px; }
    .conv { transition: background-color var(--dur-fast); }
    .conv:hover { background: var(--color-surface-soft); }
    .conv.is-on { background: var(--color-teal-washed); box-shadow: inset 3px 0 0 var(--color-primary); }
    .unread { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--color-action); color: var(--color-on-action); font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
    .bubble { padding: 8px 12px 6px; border-radius: 14px 14px 14px 4px; background: var(--color-surface); color: var(--color-text-body); box-shadow: 0 1px 2px rgba(0, 56, 65, 0.06); }
    .bubble.mine { border-radius: 14px 14px 4px 14px; background: var(--color-primary); color: #fff; }
    .chip { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px; background: var(--color-teal-washed); color: var(--color-primary); font-size: 12px; }
    .composer:focus { border-color: var(--color-secondary); box-shadow: 0 0 0 2px rgba(197, 135, 60, 0.18); }
  `,
})
export class ChatComponent {
  private readonly api = inject(ChatApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  readonly c = input<string | undefined>();
  readonly tipo = input<string | undefined>();

  protected readonly canInternal = computed(() => this.session.can('chat.internal'));
  protected readonly canGuest = computed(() => this.session.can('chat.guest') && this.session.hasFeature('guest_chat'));
  protected readonly kinds = computed(() => [
    ...(this.canGuest() ? [{ value: 'guest', label: 'Huéspedes' }] : []),
    ...(this.canInternal() ? [{ value: 'internal', label: 'Equipo' }] : []),
  ]);
  protected readonly kind = computed<ConversationKind>(() => {
    const t = this.tipo() === 'equipo' ? 'internal' : this.tipo() === 'huespedes' ? 'guest' : null;
    return t ?? (this.canGuest() ? 'guest' : 'internal');
  });
  protected readonly list = signal<readonly Conversation[] | null>(null);
  protected readonly messages = signal<readonly ChatMessage[] | null>(null);
  protected readonly q = signal('');
  protected readonly draft = signal('');
  protected readonly sending = signal(false);
  protected readonly selected = computed(() => this.c() ?? null);
  protected readonly current = computed(() => this.list()?.find((x) => x.id === this.selected()) ?? null);
  protected readonly filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    return (this.list() ?? []).filter((c) => !q || `${c.title} ${c.reservation?.code ?? ''} ${c.reservation?.property_code ?? ''}`.toLowerCase().includes(q));
  });
  protected readonly subtitle = computed(() => {
    const n = (this.list() ?? []).reduce((a, c) => a + c.unread, 0);
    return n ? `${n} ${n === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}` : 'Huéspedes y equipo, al día';
  });

  // Respuestas rápidas (por empresa, en este navegador).
  private readonly replyKey = `argos.chat.replies.${this.session.tenant()?.id ?? 'demo'}`;
  protected readonly replies = signal<readonly string[]>(this.loadReplies());
  protected readonly editing = signal(false);
  protected readonly newReply = signal('');
  // Conversacion nueva.
  protected readonly creating = signal(false);
  protected readonly people = signal<readonly ChatPerson[]>([]);
  protected readonly picked = signal<string[]>([]);
  protected readonly groupName = signal('');

  constructor() {
    effect(() => {
      const k = this.kind();
      untracked(() => void this.loadList(k));
    });
    effect(() => {
      const id = this.selected();
      untracked(() => void this.loadMessages(id, true));
    });
    const timer = setInterval(() => {
      void this.loadList(this.kind());
      void this.loadMessages(this.selected(), false);
    }, POLL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  private async loadList(kind: ConversationKind): Promise<void> {
    try {
      this.list.set(await this.api.conversations(kind));
    } catch (e) {
      this.toast.error(toApiError(e).detail);
      this.list.set([]);
    }
  }

  private async loadMessages(id: string | null, reset: boolean): Promise<void> {
    if (!id) {
      this.messages.set(null);
      return;
    }
    if (reset) this.messages.set(null);
    try {
      const page = await this.api.messages(id);
      const before = this.messages()?.length ?? 0;
      this.messages.set(page.items);
      if (reset || page.items.length !== before) this.scrollDown();
      if (this.current()?.unread) {
        await this.api.read(id);
        this.list.update((l) => (l ?? []).map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
      }
    } catch (e) {
      if (reset) this.toast.error(toApiError(e).detail);
    }
  }

  private scrollDown(): void {
    setTimeout(() => {
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  protected setKind(v: string): void {
    void this.router.navigate([], { queryParams: { tipo: v === 'internal' ? 'equipo' : 'huespedes', c: null }, queryParamsHandling: 'merge' });
  }

  protected open(id: string | null): void {
    void this.router.navigate([], { queryParams: { c: id }, queryParamsHandling: 'merge' });
  }

  protected enter(e: Event): void {
    const k = e as KeyboardEvent;
    if (k.shiftKey) return;
    k.preventDefault();
    void this.send();
  }

  protected async send(): Promise<void> {
    const id = this.selected();
    const body = this.draft().trim();
    if (!id || !body || this.sending()) return;
    this.sending.set(true);
    try {
      const m = await this.api.send(id, body);
      this.messages.update((l) => [...(l ?? []), m]);
      this.list.update((l) => (l ?? []).map((c) => (c.id === id ? { ...c, last_message: m, last_message_at: m.created_at } : c)));
      this.draft.set('');
      this.scrollDown();
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    } finally {
      this.sending.set(false);
    }
  }

  protected preview(c: Conversation): string {
    const m = c.last_message;
    if (!m) return 'Sin mensajes';
    return `${m.mine ? 'Tú: ' : c.kind === 'internal' ? m.sender_name.split(' ')[0] + ': ' : ''}${m.body ?? 'Foto'}`;
  }
  protected names(c: Conversation): string {
    return c.participants.map((p) => p.name.split(' ')[0]).join(', ');
  }
  protected when(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return dayLabel(iso) === 'Hoy' ? d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false }) : d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });
  }
  protected day(iso: string): string {
    return dayLabel(iso);
  }
  protected status(s: string): string {
    return STATUS[s] ?? s;
  }
  protected asDate(k: string): Date {
    return new Date(`${k}T12:00:00`);
  }

  private loadReplies(): readonly string[] {
    try {
      const raw = localStorage.getItem(this.replyKey);
      if (raw) return JSON.parse(raw) as string[];
    } catch {
      /* sin almacenamiento: las de arranque */
    }
    return DEFAULT_REPLIES;
  }
  private saveReplies(list: readonly string[]): void {
    this.replies.set(list);
    try {
      localStorage.setItem(this.replyKey, JSON.stringify(list));
    } catch {
      /* duran hasta recargar */
    }
  }
  protected addReply(): void {
    const r = this.newReply().trim();
    if (!r) return;
    this.saveReplies([...this.replies(), r]);
    this.newReply.set('');
  }
  protected removeReply(i: number): void {
    this.saveReplies(this.replies().filter((_, j) => j !== i));
  }

  protected async openNew(): Promise<void> {
    this.picked.set([]);
    this.groupName.set('');
    this.creating.set(true);
    try {
      const me = this.session.user()?.id;
      this.people.set((await this.api.people()).filter((p) => p.id !== me));
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    }
  }
  protected pick(id: string, on: boolean): void {
    this.picked.update((l) => (on ? [...l.filter((x) => x !== id), id] : l.filter((x) => x !== id)));
  }
  protected async create(): Promise<void> {
    try {
      const c = await this.api.create({ title: this.groupName().trim() || undefined, user_ids: this.picked() });
      this.creating.set(false);
      this.list.update((l) => [c, ...(l ?? [])]);
      this.open(c.id);
    } catch (e) {
      this.toast.error(toApiError(e).detail);
    }
  }
}
