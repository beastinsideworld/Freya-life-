import { Injectable, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { ConversationSummary, SocialService } from './social.service';

@Injectable({ providedIn: 'root' })
export class ChatUnreadService {
  private readonly social = inject(SocialService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly conversations = signal<ConversationSummary[]>([]);
  private pollTimer: number | null = null;
  private started = false;

  readonly unreadTotal = computed(() =>
    this.conversations().reduce((sum, c) => sum + Math.max(0, Number(c.unreadCount || 0)), 0)
  );

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.ensureStarted();
        this.refresh();
      } else {
        this.stopPolling();
        this.started = false;
        this.conversations.set([]);
      }
    });

    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  refresh(): void {
    if (!this.auth.isAuthenticated()) return;
    this.social.conversations().subscribe({
      next: (list) => this.conversations.set(list),
      error: () => undefined
    });
  }

  markConversationRead(conversationId: string): void {
    this.conversations.update((list) =>
      list.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
    this.social.markConversationRead(conversationId).subscribe({
      next: () => this.refresh(),
      error: () => this.refresh()
    });
  }

  applyConversations(list: ConversationSummary[]): void {
    this.conversations.set(list);
  }

  private ensureStarted(): void {
    if (this.started) return;
    this.started = true;
    this.startPolling();
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = window.setInterval(() => this.refresh(), 8000);
  }

  private stopPolling(): void {
    if (this.pollTimer != null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
