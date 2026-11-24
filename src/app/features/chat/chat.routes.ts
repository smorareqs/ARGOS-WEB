import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { MOCK_MODULES } from '../../core/tokens/api.tokens';
import { ChatApi, HttpChatApi } from './services/chat-api.service';
import { MockChatApi } from './services/chat-api.mock';

/** Chat (W-M1). La API es de Persona B: mock con la bandera `chat`. */
export const CHAT_ROUTES: Routes = [
  {
    path: '',
    data: { title: 'Chat' },
    providers: [{ provide: ChatApi, useFactory: () => (inject(MOCK_MODULES).chat ? new MockChatApi() : new HttpChatApi()) }],
    loadComponent: () => import('./pages/chat/chat.component').then((m) => m.ChatComponent),
  },
];
