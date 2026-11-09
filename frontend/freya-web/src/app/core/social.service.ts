import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  friendCode: number;
  avatarUrl: string | null;
}

export interface Friend {
  userId: string;
  displayName: string;
  friendCode: number;
  conversationId: string | null;
  avatarUrl: string | null;
}

export interface ConversationSummary {
  id: string;
  peerUserId: string;
  peerDisplayName: string;
  peerFriendCode: number;
  lastMessage: string | null;
  lastMessageAtUtc: string | null;
  peerAvatarUrl: string | null;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  body: string;
  sentAtUtc: string;
  mine: boolean;
}

@Injectable({ providedIn: 'root' })
export class SocialService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  me() {
    return this.http.get<UserProfile>(`${this.base}/auth/me`);
  }

  updateProfile(payload: { avatarUrl: string | null }) {
    return this.http.patch<UserProfile>(`${this.base}/auth/me`, payload);
  }

  friends() {
    return this.http.get<Friend[]>(`${this.base}/friends`);
  }

  addFriend(friendCode: number) {
    return this.http.post<Friend>(`${this.base}/friends`, { friendCode });
  }

  removeFriend(friendUserId: string) {
    return this.http.delete<void>(`${this.base}/friends/${friendUserId}`);
  }

  conversations() {
    return this.http.get<ConversationSummary[]>(`${this.base}/chat/conversations`);
  }

  startConversation(peerUserId: string) {
    return this.http.post<ConversationSummary>(`${this.base}/chat/conversations`, { peerUserId });
  }

  messages(conversationId: string) {
    return this.http.get<ChatMessage[]>(`${this.base}/chat/conversations/${conversationId}/messages`);
  }

  sendMessage(conversationId: string, body: string) {
    return this.http.post<ChatMessage>(`${this.base}/chat/conversations/${conversationId}/messages`, { body });
  }

  markConversationRead(conversationId: string) {
    return this.http.post<{ unreadCount: number }>(
      `${this.base}/chat/conversations/${conversationId}/read`,
      {}
    );
  }
}
