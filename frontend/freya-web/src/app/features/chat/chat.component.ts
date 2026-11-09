import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatUnreadService } from '../../core/chat-unread.service';
import {
  ChatMessage,
  ConversationSummary,
  Friend,
  SocialService
} from '../../core/social.service';
import { NavIconComponent } from '../../shared/nav-icon/nav-icon.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, NavIconComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {
  private readonly social = inject(SocialService);
  private readonly chatUnread = inject(ChatUnreadService);

  readonly conversations = signal<ConversationSummary[]>([]);
  readonly friends = signal<Friend[]>([]);
  readonly messages = signal<ChatMessage[]>([]);
  readonly selected = signal<ConversationSummary | null>(null);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal('');
  readonly view = signal<'list' | 'thread'>('list');

  draft = '';
  private pollTimer: number | null = null;

  constructor() {
    effect(() => {
      const selected = this.selected();
      if (selected) {
        this.startPolling(selected.id);
      } else {
        this.stopPolling();
      }
    });
  }

  ngOnInit(): void {
    this.refreshLists();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  refreshLists(): void {
    this.loading.set(true);
    this.error.set('');
    this.social.conversations().subscribe({
      next: (list) => {
        this.conversations.set(list);
        this.chatUnread.applyConversations(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les conversations.');
        this.loading.set(false);
      }
    });
    this.social.friends().subscribe({
      next: (list) => this.friends.set(list),
      error: () => this.friends.set([])
    });
  }

  openConversation(item: ConversationSummary): void {
    this.selected.set({ ...item, unreadCount: 0 });
    this.view.set('thread');
    this.conversations.update((list) =>
      list.map((c) => (c.id === item.id ? { ...c, unreadCount: 0 } : c))
    );
    this.chatUnread.markConversationRead(item.id);
    this.loadMessages(item.id);
  }

  backToList(): void {
    this.selected.set(null);
    this.view.set('list');
    this.messages.set([]);
    this.draft = '';
    this.refreshLists();
  }

  startWithFriend(friend: Friend): void {
    this.error.set('');
    this.social.startConversation(friend.userId).subscribe({
      next: (conversation) => {
        this.conversations.update((list) => {
          if (list.some((c) => c.id === conversation.id)) return list;
          return [conversation, ...list];
        });
        this.openConversation(conversation);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Impossible d’ouvrir la conversation.');
      }
    });
  }

  send(): void {
    const selected = this.selected();
    const body = this.draft.trim();
    if (!selected || !body || this.sending()) return;

    this.sending.set(true);
    this.social.sendMessage(selected.id, body).subscribe({
      next: (message) => {
        this.messages.update((list) => [...list, message]);
        this.draft = '';
        this.sending.set(false);
        this.conversations.update((list) =>
          list
            .map((c) =>
              c.id === selected.id
                ? { ...c, lastMessage: message.body, lastMessageAtUtc: message.sentAtUtc }
                : c
            )
            .sort((a, b) =>
              String(b.lastMessageAtUtc ?? '').localeCompare(String(a.lastMessageAtUtc ?? ''))
            )
        );
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Envoi impossible.');
        this.sending.set(false);
      }
    });
  }

  formatTime(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private loadMessages(conversationId: string): void {
    this.social.messages(conversationId).subscribe({
      next: (list) => {
        this.messages.set(list);
        // GET messages marque déjà la conversation comme lue côté API
        this.chatUnread.refresh();
      },
      error: () => this.error.set('Impossible de charger les messages.')
    });
  }

  private startPolling(conversationId: string): void {
    this.stopPolling();
    this.pollTimer = window.setInterval(() => {
      if (this.selected()?.id !== conversationId) return;
      this.social.messages(conversationId).subscribe({
        next: (list) => this.messages.set(list),
        error: () => undefined
      });
    }, 4000);
  }

  private stopPolling(): void {
    if (this.pollTimer != null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
