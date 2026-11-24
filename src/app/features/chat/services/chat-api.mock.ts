import { Injectable, inject } from '@angular/core';
import { SessionStore } from '../../../core/store/session.store';
import { mockTenantKey } from '../../../core/mocks/demo-seed';
import { MockTable, latency, uid } from '../../../core/mocks/mock-utils';
import { opsPeople, opsProperties } from '../../../core/mocks/demo-ops';
import { ApiError } from '../../../core/http/api-error';
import { Page } from '../../../core/http/page';
import { dayKey } from '../../../shared/utils/time';
import { ChatMessage, ChatPerson, Conversation, ConversationKind, NewConversation } from '../models/chat.model';
import { ChatApi } from './chat-api.service';

interface Stored {
  readonly conv: Omit<Conversation, 'last_message' | 'last_message_at' | 'unread'>;
  readonly messages: ChatMessage[];
  readonly readAt: string | null;
}

const ME = 'me';
const GUESTS = [
  { name: 'Lucía Pérez', lines: ['¡Hola! Ya vamos en camino, llegamos como a las 2.', '¿Podemos dejar las maletas antes del check-in?'] },
  { name: 'Daniel Ortiz', lines: ['Buenas noches, el agua caliente no sale en la ducha.'] },
  { name: 'Mariana Solís', lines: ['¿Cuál es la clave del wifi?', 'Gracias 🙌'] },
  { name: 'Thomas Weber', lines: ['Hi! Is late check-out possible on Sunday?'] },
];
const INTERNAL = [
  { title: 'Supervisión', lines: ['Hoy entran 3 reservas, revisen que las limpiezas queden validadas antes de las 14:00.', 'Listo, ya revisé las del edificio Norte.'] },
  { title: 'Mantenimiento', lines: ['El A/C de la sala ya quedó, cambié el filtro.'] },
];

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

function seed(tenant: string): Stored[] {
  const props = opsProperties(tenant);
  const staff = opsPeople(tenant);
  const out: Stored[] = [];
  GUESTS.forEach((g, i) => {
    const p = props[i % Math.max(1, props.length)];
    const id = `conv_g${i}`;
    const msgs: ChatMessage[] = g.lines.map((body, j) => ({
      id: `${id}_m${j}`, conversation_id: id, sender_type: 'guest' as const, sender_id: `guest_${i}`, sender_name: g.name, body, file_url: null,
      created_at: minutesAgo(30 + i * 95 - j * 4), mine: false,
    }));
    if (i === 2) {
      msgs.push({ id: `${id}_r`, conversation_id: id, sender_type: 'user', sender_id: ME, sender_name: 'Tú', body: 'La red es «Huéspedes» y la clave está en la tarjeta del refri.', file_url: null, created_at: minutesAgo(30 + i * 95 - 2), mine: true });
      msgs.sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
    out.push({
      readAt: i >= 2 ? minutesAgo(0) : null,
      messages: msgs,
      conv: {
        id, kind: 'guest', title: g.name, is_archived: false,
        participants: [{ type: 'guest', id: `guest_${i}`, name: g.name, role: 'Huésped', photo_url: null }],
        reservation: p ? {
          id: `res_${i}`, code: `ARG-${['7K3P9Q', 'H2M8RX', 'Q4T6WB', 'Z9C3LD'][i]}`, property_code: p.code, property_name: p.name,
          check_in_date: dayKey(i === 0 ? 0 : -1 - i), check_out_date: dayKey(2 + i), status: i === 0 ? 'confirmed' : 'checked_in',
          guest_name: g.name, guests_count: 2 + (i % 2),
        } : null,
      },
    });
  });
  INTERNAL.forEach((c, i) => {
    const id = `conv_i${i}`;
    const people = staff.slice(i * 2, i * 2 + 3);
    out.push({
      readAt: i === 0 ? null : minutesAgo(0),
      messages: c.lines.map((body, j) => {
        const who = people[j % Math.max(1, people.length)];
        return { id: `${id}_m${j}`, conversation_id: id, sender_type: 'user' as const, sender_id: who?.id ?? ME, sender_name: who?.name ?? 'Equipo', body, file_url: null, created_at: minutesAgo(60 + i * 240 - j * 12), mine: false };
      }),
      conv: {
        id, kind: 'internal', title: c.title, reservation: null, is_archived: false,
        participants: people.map((p) => ({ type: 'user' as const, id: p.id, name: p.name, role: p.role, photo_url: null })),
      },
    });
  });
  return out;
}

/** Chat simulado por empresa (localStorage). Los huéspedes contestan solos. */
@Injectable()
export class MockChatApi extends ChatApi {
  private readonly session = inject(SessionStore);
  private readonly tenant = mockTenantKey(this.session.tenant());
  private readonly table = new MockTable<Stored>(`chat_${this.tenant}`, () => seed(this.tenant));

  private view(s: Stored): Conversation {
    const last = s.messages[s.messages.length - 1] ?? null;
    const unread = s.messages.filter((m) => !m.mine && (!s.readAt || m.created_at > s.readAt)).length;
    return { ...s.conv, last_message: last, last_message_at: last?.created_at ?? null, unread };
  }

  async conversations(kind: ConversationKind): Promise<readonly Conversation[]> {
    await latency(250, 450);
    return this.table.all().filter((s) => s.conv.kind === kind).map((s) => this.view(s))
      .sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''));
  }

  async messages(id: string): Promise<Page<ChatMessage>> {
    await latency(200, 400);
    const s = this.table.all().find((x) => x.conv.id === id);
    if (!s) throw new ApiError(404, 'La conversación no existe.');
    return { items: s.messages, next_cursor: null };
  }

  async send(id: string, body: string): Promise<ChatMessage> {
    await latency(150, 300);
    const me = this.session.user();
    const msg: ChatMessage = {
      id: uid('msg'), conversation_id: id, sender_type: 'user', sender_id: me?.id ?? ME, sender_name: me?.nombre ?? 'Tú',
      body: body.trim(), file_url: null, created_at: new Date().toISOString(), mine: true,
    };
    this.push(id, msg, true);
    const conv = this.table.all().find((x) => x.conv.id === id)?.conv;
    if (conv?.kind === 'guest') {
      const guest = conv.participants[0];
      setTimeout(() => this.push(id, {
        id: uid('msg'), conversation_id: id, sender_type: 'guest', sender_id: guest.id, sender_name: guest.name,
        body: '¡Perfecto, muchas gracias!', file_url: null, created_at: new Date().toISOString(), mine: false,
      }, false), 4000);
    }
    return msg;
  }

  private push(id: string, msg: ChatMessage, read: boolean): void {
    this.table.update((rows) => rows.map((r) => (r.conv.id === id ? { ...r, messages: [...r.messages, msg], readAt: read ? msg.created_at : r.readAt } : r)));
  }

  async read(id: string): Promise<void> {
    this.table.update((rows) => rows.map((r) => (r.conv.id === id ? { ...r, readAt: new Date().toISOString() } : r)));
  }

  async create(c: NewConversation): Promise<Conversation> {
    await latency();
    const staff = opsPeople(this.tenant).filter((p) => c.user_ids.includes(p.id));
    if (!staff.length) throw new ApiError(422, 'Elige al menos una persona.');
    const s: Stored = {
      readAt: null, messages: [],
      conv: {
        id: uid('conv'), kind: 'internal', title: c.title?.trim() || staff.map((p) => p.name.split(' ')[0]).join(', '), reservation: null,
        is_archived: false, participants: staff.map((p) => ({ type: 'user' as const, id: p.id, name: p.name, role: p.role, photo_url: null })),
      },
    };
    this.table.update((rows) => [s, ...rows]);
    return this.view(s);
  }

  async people(): Promise<readonly ChatPerson[]> {
    await latency(150, 300);
    return opsPeople(this.tenant).map((p) => ({ id: p.id, name: p.name, role: p.role }));
  }
}
