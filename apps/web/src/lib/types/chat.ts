// ============================================================
// Path: apps/web/src/lib/types/chat.ts
// ============================================================

export interface ConversationListItem {
  id: string;
  isGroup: boolean;
  groupId: string | null;
  displayName: string;
  displayImage: string | null;
  participantCount: number;
  otherUser: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  } | null;
  lastMessage: {
    id: string;
    type: 'TEXT' | 'IMAGE' | 'AUDIO';
    content: string | null;
    imageUrl: string | null;
    senderId: string;
    senderName: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  isGroup: boolean;
  groupId: string | null;
  displayName: string;
  displayImage: string | null;
  participants: Array<{
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
    level: number;
    xp: number;
  }>;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;

  sender: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };

  type: 'TEXT' | 'IMAGE' | 'AUDIO';

  content: string | null;
  imageUrl: string | null;

  audioUrl: string | null;
  audioDuration: number | null;

  createdAt: string;

  pending?: boolean;
  failed?: boolean;
}