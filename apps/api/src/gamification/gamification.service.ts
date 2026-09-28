// ============================================================
// Path: apps/api/src/gamification/gamification.service.ts
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { BadgeCode } from '@prisma/client';
import { LevelUtil } from '../common/utils';
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
    if (xp <= 0) return { xp: 0, level: 1 };

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true },
    });
    if (!user) return { xp: 0, level: 1 };

    const newXp = user.xp + xp;
    const newLevel = LevelUtil.levelFromXp(newXp);

    await this.prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, level: newLevel },
    });

    return { xp: newXp, level: newLevel, gained: xp };
  }

  // ----------------------------------------------------------
  // Check and grant eligible badges (idempotent)
  // ----------------------------------------------------------
  async checkAndGrantBadges(userId: string) {
    const granted: BadgeCode[] = [];

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        createdAt: true,
      },
    });
    if (!user) return { granted };

    // 1) FIRST_STUDY_ENTRY
    const entryCount = await this.prisma.studyEntry.count({ where: { userId } });
    if (entryCount >= 1) {
      granted.push(BadgeCode.FIRST_STUDY_ENTRY);
    }

    // 2) SEVEN_DAY_STREAK
    if (user.longestStreak >= 7) granted.push(BadgeCode.SEVEN_DAY_STREAK);

    // 3) THIRTY_DAY_STREAK
    if (user.longestStreak >= 30) granted.push(BadgeCode.THIRTY_DAY_STREAK);

    // 4) HUNDRED_HOURS (6000 minutes)
    const totalAgg = await this.prisma.studyEntry.aggregate({
      where: { userId },
      _sum: { durationMinutes: true },
    });
    const totalMinutes = totalAgg._sum.durationMinutes ?? 0;
    if (totalMinutes >= 6000) granted.push(BadgeCode.HUNDRED_HOURS);

    // 5) MATH_HERO — 20 hours on any subject named "গণিত"
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

    // 6) SCIENCE_EXPLORER — 20 hours on "বিজ্ঞান"
    const scienceSubject = await this.prisma.subject.findFirst({
      where: { userId, name: 'বিজ্ঞান' },
      select: { id: true },
    });
    if (scienceSubject) {
      const sciAgg = await this.prisma.studyEntry.aggregate({
        where: { userId, subjectId: scienceSubject.id },
        _sum: { durationMinutes: true },
      });
      if ((sciAgg._sum.durationMinutes ?? 0) >= 1200) {
        granted.push(BadgeCode.SCIENCE_EXPLORER);
      }
    }

    // 7) CONSISTENCY_CHAMPION — 25 distinct study days in last 30 days
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const distinctDays = await this.prisma.studyEntry.groupBy({
      by: ['date'],
      where: { userId, date: { gte: thirtyAgo } },
    });
    if (distinctDays.length >= 25) {
      granted.push(BadgeCode.CONSISTENCY_CHAMPION);
    }

    // 8) CHAPTER_FINISHER — 20 distinct chapters
    const distinctChapters = await this.prisma.studyEntry.findMany({
      where: { userId, chapter: { not: null } },
      distinct: ['chapter'],
      select: { chapter: true },
    });
    if (distinctChapters.length >= 20) {
      granted.push(BadgeCode.CHAPTER_FINISHER);
    }

    // Filter out already-earned badges
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

      // Bonus XP per badge
      const bonus = toGrant.length * LevelUtil.xpForBadge();
      if (bonus > 0) await this.awardXp(userId, bonus);

      this.logger.log(
        `🏅 User ${userId} earned ${toGrant.length} badge(s): ${toGrant.join(', ')}`,
      );
    }

    return { granted: toGrant };
  }

  // ----------------------------------------------------------
  // Helper: list all badge definitions (for frontend)
  // ----------------------------------------------------------
  getAllDefinitions() {
    return Object.entries(BADGE_DEFINITIONS).map(([code, meta]) => ({
      code,
      ...meta,
    }));
  }
}