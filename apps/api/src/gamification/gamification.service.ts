// ============================================================
// Path: apps/api/src/gamification/gamification.service.ts
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { BadgeCode } from '../generated/prisma/client';
import { DateUtil, LevelUtil } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { BADGE_DEFINITIONS } from '../../prisma/seed';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------
  // Award XP and recompute level
  // ----------------------------------------------------------
  async awardXp(userId: string, xp: number) {
    if (xp <= 0) return { xp: 0, level: 1, gained: 0 };

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });
    if (!user) return { xp: 0, level: 1, gained: 0 };

    const newXp = user.xp + xp;
    const newLevel = LevelUtil.levelFromXp(newXp);

    await this.prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel },
    });

    return { xp: newXp, level: newLevel, gained: xp, leveledUp: newLevel > user.level };
  }

  // ----------------------------------------------------------
  // Check and grant eligible badges (idempotent)
  // ----------------------------------------------------------
  async checkAndGrantBadges(userId: string) {
    const granted: BadgeCode[] = [];

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true },
    });
    if (!user) return { granted };

    // 1) FIRST_STUDY_ENTRY
    const entryCount = await this.prisma.studyEntry.count({ where: { userId } });
    if (entryCount >= 1) granted.push(BadgeCode.FIRST_STUDY_ENTRY);

    // 2/3) Streak badges
    if (user.longestStreak >= 7) granted.push(BadgeCode.SEVEN_DAY_STREAK);
    if (user.longestStreak >= 30) granted.push(BadgeCode.THIRTY_DAY_STREAK);

    // 4) HUNDRED_HOURS (6000 minutes)
    const totalAgg = await this.prisma.studyEntry.aggregate({
      where: { userId },
      _sum: { durationMinutes: true },
    });
    const totalMinutes = totalAgg._sum.durationMinutes ?? 0;
    if (totalMinutes >= 6000) granted.push(BadgeCode.HUNDRED_HOURS);

    // 5) MATH_HERO — 20 hours on "গণিত"
    const mathSubject = await this.prisma.subject.findFirst({
      where: { userId, name: 'গণিত' },
      select: { id: true },
    });
    if (mathSubject) {
      const mathAgg = await this.prisma.studyEntry.aggregate({
        where: { userId, subjectId: mathSubject.id },
        _sum: { durationMinutes: true },
      });
      if ((mathAgg._sum.durationMinutes ?? 0) >= 1200) {
        granted.push(BadgeCode.MATH_HERO);
      }
    }

    // 6) SCIENCE_EXPLORER
    const sciSubject = await this.prisma.subject.findFirst({
      where: { userId, name: 'বিজ্ঞান' },
      select: { id: true },
    });
    if (sciSubject) {
      const sciAgg = await this.prisma.studyEntry.aggregate({
        where: { userId, subjectId: sciSubject.id },
        _sum: { durationMinutes: true },
      });
      if ((sciAgg._sum.durationMinutes ?? 0) >= 1200) {
        granted.push(BadgeCode.SCIENCE_EXPLORER);
      }
    }

    // 7) CONSISTENCY_CHAMPION — 25 distinct days in last 30 days
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const distinctDays = await this.prisma.studyEntry.groupBy({
      by: ['date'],
      where: { userId, date: { gte: thirtyAgo } },
    });
    if (distinctDays.length >= 25) granted.push(BadgeCode.CONSISTENCY_CHAMPION);

    // 8) CHAPTER_FINISHER — 20 distinct chapters
    const distinctChapters = await this.prisma.studyEntry.findMany({
      where: { userId, chapter: { not: null } },
      distinct: ['chapter'],
      select: { chapter: true },
    });
    if (distinctChapters.length >= 20) granted.push(BadgeCode.CHAPTER_FINISHER);

    // 9) EARLY_BIRD — studied before 6am local time (we detect via createdAt hour)
    const early = await this.prisma.studyEntry.findFirst({
      where: {
        userId,
        createdAt: { lte: new Date(new Date().setHours(6, 0, 0, 0)) },
      },
      select: { id: true },
    });
    if (early) granted.push(BadgeCode.EARLY_BIRD);

    // 10) NIGHT_OWL — studied after midnight
    const night = await this.prisma.studyEntry.findFirst({
      where: {
        userId,
        createdAt: { gte: new Date(new Date().setHours(23, 0, 0, 0)) },
      },
      select: { id: true },
    });
    if (night) granted.push(BadgeCode.NIGHT_OWL);

    // Filter out already-earned
    const existing = await this.prisma.userBadge.findMany({
      where: { userId, code: { in: granted } },
      select: { code: true },
    });
    const existingSet = new Set(existing.map((b) => b.code));
    const toGrant = granted.filter((code) => !existingSet.has(code));

    if (toGrant.length > 0) {
      await this.prisma.userBadge.createMany({
        data: toGrant.map((code) => ({ userId, code })),
        skipDuplicates: true,
      });

      const bonus = toGrant.length * LevelUtil.xpForBadge();
      if (bonus > 0) await this.awardXp(userId, bonus);

      this.logger.log(
        `🏅 User ${userId} earned ${toGrant.length} badge(s): ${toGrant.join(', ')}`,
      );
    }

    return { granted: toGrant };
  }

  // ----------------------------------------------------------
  // GET /gamification/badges — all defs + earned status
  // ----------------------------------------------------------
  async getAllBadges(userId: string) {
    const earned = await this.prisma.userBadge.findMany({
      where: { userId },
      select: { code: true, earnedAt: true },
    });
    const earnedMap = new Map(earned.map((b) => [b.code, b.earnedAt]));

    const items = (Object.keys(BADGE_DEFINITIONS) as BadgeCode[]).map((code) => {
      const def = BADGE_DEFINITIONS[code];
      const earnedAt = earnedMap.get(code) ?? null;
      return {
        code,
        name: def.name,
        description: def.description,
        icon: def.icon,
        earned: earnedAt !== null,
        earnedAt: earnedAt ? earnedAt.toISOString() : null,
      };
    });

    const earnedCount = items.filter((i) => i.earned).length;

    return {
      data: {
        total: items.length,
        earnedCount,
        items,
      },
    };
  }

  // ----------------------------------------------------------
  // GET /gamification/level — current level & progress
  // ----------------------------------------------------------
  async getLevelInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });
    if (!user) {
      return {
        data: {
          xp: 0,
          level: 1,
          currentLevelXp: 0,
          nextLevelXp: 100,
          xpInLevel: 0,
          xpNeededForLevel: 100,
          progressPercent: 0,
        },
      };
    }

    const { current, next, remaining } = LevelUtil.xpToNextLevel(user.xp);
    const xpInLevel = user.xp - current;
    const xpNeededForLevel = next - current;
    const progressPercent = Math.min(
      100,
      Math.round((xpInLevel / xpNeededForLevel) * 100),
    );

    return {
      data: {
        xp: user.xp,
        level: user.level,
        currentLevelXp: current,
        nextLevelXp: next,
        xpInLevel,
        xpNeededForLevel,
        xpToNextLevel: remaining,
        progressPercent,
      },
    };
  }

  // ----------------------------------------------------------
  // GET /gamification/level-progress — full level table (1-20)
  // ----------------------------------------------------------
  async getLevelTable() {
    const levels = [];
    for (let lvl = 1; lvl <= 20; lvl++) {
      const xpRequired = LevelUtil.xpForLevel(lvl);
      const xpForNext = LevelUtil.xpForLevel(lvl + 1);
      levels.push({
        level: lvl,
        xpRequired,
        xpForNext,
        xpToAdvance: xpForNext - xpRequired,
      });
    }
    return { data: { levels } };
  }

  // ----------------------------------------------------------
  // GET /gamification/leaderboard
  // ----------------------------------------------------------
  async getLeaderboard(currentUserId: string, limit = 20) {
    const users = await this.prisma.user.findMany({
      where: { isActive: true, role: 'STUDENT' },
      orderBy: [{ xp: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        classLevel: true,
        xp: true,
        level: true,
        currentStreak: true,
      },
    });

    // Rank
    const ranked = users.map((u, idx) => ({
      rank: idx + 1,
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl,
      classLevel: u.classLevel,
      xp: u.xp,
      level: u.level,
      currentStreak: u.currentStreak,
      isMe: u.id === currentUserId,
    }));

    // Current user's rank (if not in top N)
    let myRank: any = ranked.find((r) => r.isMe) ?? null;
    if (!myRank) {
      const higherCount = await this.prisma.user.count({
        where: { isActive: true, role: 'STUDENT', xp: { gt: (await this.prisma.user.findUnique({ where: { id: currentUserId }, select: { xp: true } }))?.xp ?? 0 } },
      });
      const me = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: {
          id: true, username: true, fullName: true, avatarUrl: true,
          classLevel: true, xp: true, level: true, currentStreak: true,
        },
      });
      if (me) {
        myRank = {
          rank: higherCount + 1,
          ...me,
          isMe: true,
        };
      }
    }

    return {
      data: {
        items: ranked,
        myRank,
      },
    };
  }

  // ----------------------------------------------------------
  // GET /gamification/recent-achievements
  // ----------------------------------------------------------
  async getRecentAchievements(userId: string, limit = 5) {
    const badges = await this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
      take: limit,
      select: { code: true, earnedAt: true },
    });

    const items = badges.map((b) => ({
      code: b.code,
      ...BADGE_DEFINITIONS[b.code],
      earnedAt: b.earnedAt.toISOString(),
    }));

    return { data: { items } };
  }

  // ----------------------------------------------------------
  // Manual check-badges trigger
  // ----------------------------------------------------------
  async triggerCheck(userId: string) {
    const result = await this.checkAndGrantBadges(userId);
    const items = result.granted.map((code) => ({
      code,
      ...BADGE_DEFINITIONS[code],
    }));
    return {
      data: { granted: items },
    };
  }

  // ----------------------------------------------------------
  // Helper for external use
  // ----------------------------------------------------------
  getAllDefinitions() {
    return Object.entries(BADGE_DEFINITIONS).map(([code, meta]) => ({
      code,
      ...meta,
    }));
  }
}