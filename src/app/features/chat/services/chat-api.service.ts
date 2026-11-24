import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../../core/http/http-api';
import { Page } from '../../../core/http/page';
import { ChatMessage, ChatPerson, Conversation, ConversationKind, NewConversation } from '../models/chat.model';

/**
 * Chat interno y con huéspedes (W-M1). Contrato que la web espera de
 * Persona B (fase06.md §2.3, detalle en avance.md "Para B"):
 * `GET /chat/conversations?kind=`, `GET /chat/conversations/{id}/messages?before=`,
 * `POST /chat/conversations/{id}/messages`, `POST /chat/conversations/{id}/read` y
 * `POST /chat/conversations`. El tiempo real llega por `WS /ws` (evento
 * `chat.message`); sin socket, la pantalla consulta cada 15 s.
 */
export abstract class ChatApi {
  abstract conversations(kind: ConversationKind): Promise<readonly Conversation[]>;
  abstract messages(conversationId: string, before?: string): Promise<Page<ChatMessage>>;
  abstract send(conversationId: string, body: string): Promise<ChatMessage>;
  abstract read(conversationId: string): Promise<void>;
  abstract create(c: NewConversation): Promise<Conversation>;
  /** Personas de la empresa para una conversación interna nueva. */
  abstract people(): Promise<readonly ChatPerson[]>;
}

@Injectable()
export class HttpChatApi extends ChatApi {
  private readonly http = inject(ApiClient);

  async conversations(kind: ConversationKind): Promise<readonly Conversation[]> {
    return (await this.http.get<Page<Conversation>>('/chat/conversations', { kind })).items;
  }
  messages(id: string, before?: string): Promise<Page<ChatMessage>> {
    return this.http.get(`/chat/conversations/${id}/messages`, before ? { before, limit: '50' } : { limit: '50' });
  }
  send(id: string, body: string): Promise<ChatMessage> {
    return this.http.post(`/chat/conversations/${id}/messages`, { body });
  }
  async read(id: string): Promise<void> {
    await this.http.post(`/chat/conversations/${id}/read`);
  }
  create(c: NewConversation): Promise<Conversation> {
    return this.http.post('/chat/conversations', { kind: 'internal', ...c });
  }
  async people(): Promise<readonly ChatPerson[]> {
    const page = await this.http.get<Page<{ user_id: string | null; full_name: string; position: string | null; termination_date: string | null }>>('/employees', { limit: '500' });
    return page.items.filter((e) => e.user_id && !e.termination_date).map((e) => ({ id: e.user_id as string, name: e.full_name, role: e.position }));
  }
}
