// ============================================================
// Path: apps/web/src/lib/types/friends.ts
// ============================================================

export interface FriendSummary {
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
    classLevel: number;
    level: number;
    xp: number;
    currentStreak: number;
    longestStreak: number;
    joinedAt: string;
  };
  today: { minutes: number; entries: number };
  week: { minutes: number; daysStudied: number };
  month: { minutes: number };
  badgeCount: number;
  subjectCount: number;
  isInSameGroup: boolean;
}

export interface FriendBadge {
  code: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}