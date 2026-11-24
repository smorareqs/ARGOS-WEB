/**
 * Chat (W-M1, fase06.md §2). El módulo `chat` es de Persona B; la web espera
 * este contrato (documentado en avance.md "Para B") y mientras tanto usa el
 * mock (bandera `chat` de MOCK_MODULES).
 */

export type ConversationKind = 'internal' | 'guest';

export interface ChatParticipant {
  readonly type: 'user' | 'guest';
  readonly id: string;
  readonly name: string;
  readonly role: string | null;
  readonly photo_url: string | null;
}

/** La reserva de una conversación con huésped (panel de contexto). */
export interface ChatReservation {
  readonly id: string;
  readonly code: string;
  readonly property_code: string;
  readonly property_name: string;
  readonly check_in_date: string;
  readonly check_out_date: string;
  readonly status: string;
  readonly guest_name: string;
  readonly guests_count: number;
}

export interface ChatMessage {
  readonly id: string;
  readonly conversation_id: string;
  readonly sender_type: 'user' | 'guest';
  readonly sender_id: string;
  readonly sender_name: string;
  readonly body: string | null;
  readonly file_url: string | null;
  readonly created_at: string;
  /** true: lo mandó quien tiene la sesión. */
  readonly mine: boolean;
}

export interface Conversation {
  readonly id: string;
  readonly kind: ConversationKind;
  readonly title: string;
  readonly reservation: ChatReservation | null;
  readonly participants: readonly ChatParticipant[];
  readonly last_message: ChatMessage | null;
  readonly last_message_at: string | null;
  readonly unread: number;
  readonly is_archived: boolean;
}

export interface ChatPerson {
  readonly id: string;
  readonly name: string;
  readonly role: string | null;
}

export interface NewConversation {
  readonly title?: string;
  readonly user_ids: readonly string[];
}

/** Respuestas rápidas de arranque (cada empresa las edita; se guardan en este navegador). */
export const DEFAULT_REPLIES: readonly string[] = [
  '¡Hola! Bienvenido. Cualquier cosa que necesites, escríbenos por aquí.',
  'Tu check-in es desde las 15:00. Te esperamos.',
  'Recuerda que el check-out es a las 11:00.',
  'Ya va alguien en camino a revisarlo.',
  'Gracias por avisar, lo resolvemos en seguida.',
];

/** "Hoy", "Ayer" o la fecha, para separar los mensajes por día. */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const key = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key(d) === key(now)) return 'Hoy';
  if (key(d) === key(yesterday)) return 'Ayer';
  return d.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });
}
