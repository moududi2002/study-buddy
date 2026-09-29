// ============================================================
// Path: apps/web/src/lib/types/groups.ts
// ============================================================

export interface GroupListItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  isMuted: boolean;
  memberCount: number;
  weeklyTargetMinutes: number | null;
  joinedAt: string;
}

export interface GroupMemberItem {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  classLevel: number;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  isMuted: boolean;
  joinedAt: string;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  weekMinutes: number;
  badgeCount: number;
  rank?: number;
}

export interface GroupInvitationItem {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  invitee: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ownerId: string;
  owner: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
  };
  myRole: 'OWNER' | 'ADMIN' | 'MEMBER' | null;
  isMuted: boolean;
  memberCount: number;
  weeklyTargetMinutes: number | null;
  weeklyTargetChapters: number | null;
  weekStart: string;
  weekEnd: string;
  groupTotalMinutes: number;
  targetProgressPercent: number;
  members: GroupMemberItem[];
  leaderboard: GroupMemberItem[];
  invitations: GroupInvitationItem[];
  createdAt: string;
  conversationId?: string | null;
}

export interface MyInvitation {
  id: string;
  group: { id: string; name: string; imageUrl: string | null; description: string | null };
  inviter: { id: string; username: string; fullName: string; avatarUrl: string | null };
  message: string | null;
  createdAt: string;
  expiresAt: string;
}