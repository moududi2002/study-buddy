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
}

export interface GroupLeaderboardItem {
  rank: number;
  label: string;
  isMe: boolean;
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

  conversationId: string | null;

  myRole: 'OWNER' | 'ADMIN' | 'MEMBER' | null;
  isMuted: boolean;
  memberCount: number;

  weeklyTargetMinutes: number | null;
  weeklyTargetChapters: number | null;

  weekStart: string;
  weekEnd: string;

  members: GroupMemberItem[];
  leaderboard: GroupLeaderboardItem[];
  invitations: GroupInvitationItem[];

  createdAt: string;
}


export interface MyInvitation {
  id: string;
  group: { id: string; name: string; imageUrl: string | null; description: string | null };
  inviter: { id: string; username: string; fullName: string; avatarUrl: string | null };
  message: string | null;
  createdAt: string;
  expiresAt: string;
}