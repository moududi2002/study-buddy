// ============================================================
// Path: apps/web/src/lib/types/dashboard.ts
// ============================================================

export interface DashboardResponse {
  user: {
    fullName: string;
    avatarUrl: string | null;
    xp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
  };
  today: { minutes: number; entries: number };
  weekTotalMinutes: number;
  motivation: string;
  activeGoals: Array<{
    id: string;
    title: string;
    type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    targetMinutes: number | null;
    targetChapters: number | null;
    endsAt: string;
  }>;
  recentBadges: Array<{ code: string; earnedAt: string }>;
  weeklySummary: {
    topSubject: { name: string; minutes: number } | null;
    leastSubject: { name: string; minutes: number } | null;
    bestDay: { dayLabel: string; minutes: number } | null;
    daysStudied: number;
  };
}

export interface WeeklyAnalytics {
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  daysStudied: number;
  avgPerDay: number;
  subjectBreakdown: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    minutes: number;
    entries: number;
  }>;
  daily: Array<{ date: string; dayLabel: string; minutes: number }>;
  suggestions: string[];
}

export interface LevelInfo {
  xp: number;
  level: number;
  xpInLevel: number;
  xpNeededForLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
}

export interface AiInsight {
  weekStart: string;
  weekEnd: string;
  insight: string;
  source: 'ai' | 'rule-based' | 'cache';
  stats: {
    totalMinutes: number;
    daysStudied: number;
    avgPerDay: number;
    topSubject: { name: string; minutes: number } | null;
    leastSubject: { name: string; minutes: number } | null;
  };
}

export interface BadgeInfo {
  code: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}