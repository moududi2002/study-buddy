// ============================================================
// Path: apps/api/src/streak/streak.service.ts
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { MESSAGES } from '../common/messages';
import { DateUtil } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StreakService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ----------------------------------------------------------
  // GET /streak  (current, longest, last 90 days calendar)
  // ----------------------------------------------------------
  async getStreak(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastStudyDate: true,
      },
    });
    if (!user) throw new NotFoundException(MESSAGES.USER_NOT_FOUND);

    const today = DateUtil.toDateOnly(new Date());
    const ninetyAgo = new Date(today);
    ninetyAgo.setDate(today.getDate() - 89);

    // Get distinct study days in last 90 days
    const days = await this.prisma.studyEntry.groupBy({
      by: ['date'],
      where: { userId, date: { gte: ninetyAgo } },
      _sum: { durationMinutes: true },
      _count: { _all: true },
    });

    const dayMap = new Map<string, { minutes: number; entries: number }>();
    for (const d of days) {
      dayMap.set(DateUtil.toISODate(d.date), {
        minutes: d._sum.durationMinutes ?? 0,
        entries: d._count._all,
      });
    }

    // Build 90-day calendar with status
    const calendar: Array<{
      date: string;
      minutes: number;
      entries: number;
      studied: boolean;
      isToday: boolean;
    }> = [];

    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = DateUtil.toISODate(d);
      const info = dayMap.get(key) || { minutes: 0, entries: 0 };
      calendar.push({
        date: key,
        minutes: info.minutes,
        entries: info.entries,
        studied: info.entries > 0,
        isToday: i === 0,
      });
    }

    // Weekly status (this week, Saturday-Friday)
    const { start, end } = DateUtil.getWeekRange(today);
    const weekDays: Array<{
      date: string;
      dayLabel: string;
      studied: boolean;
      minutes: number;
      isToday: boolean;
      isFuture: boolean;
    }> = [];

    const dayLabels = ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = DateUtil.toISODate(d);
      const info = dayMap.get(key) || { minutes: 0, entries: 0 };
      weekDays.push({
        date: key,
        dayLabel: dayLabels[i],
        studied: info.entries > 0,
        minutes: info.minutes,
        isToday: key === DateUtil.toISODate(today),
        isFuture: d.getTime() > today.getTime(),
      });
    }

    // Did user study today?
    const studiedToday = dayMap.has(DateUtil.toISODate(today));

    // Calculate "studied this week"
    const weekStudiedCount = weekDays.filter((d) => d.studied).length;

    return {
      message: MESSAGES.SUCCESS,
      data: {
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        lastStudyDate: user.lastStudyDate
          ? DateUtil.toISODate(user.lastStudyDate)
          : null,
        studiedToday,
        weekStudiedCount,
        weekDays,
        calendar,
        weekStart: DateUtil.toISODate(start),
        weekEnd: DateUtil.toISODate(end),
      },
    };
  }

  // ----------------------------------------------------------
  // GET /streak/heatmap  (GitHub-style)
  // ----------------------------------------------------------
  async getHeatmap(userId: string, days = 365) {
    const cacheKey = `streak:heatmap:${userId}:${days}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { message: MESSAGES.SUCCESS, data: JSON.parse(cached) };
    }

    const today = DateUtil.toDateOnly(new Date());
    const from = new Date(today);
    from.setDate(today.getDate() - (days - 1));

    const grouped = await this.prisma.studyEntry.groupBy({
      by: ['date'],
      where: { userId, date: { gte: from, lte: today } },
      _sum: { durationMinutes: true },
      _count: { _all: true },
    });

    const dataMap = new Map<string, { minutes: number; entries: number }>();
    for (const g of grouped) {
      dataMap.set(DateUtil.toISODate(g.date), {
        minutes: g._sum.durationMinutes ?? 0,
        entries: g._count._all,
      });
    }

    // Build array with intensity level (0-4) based on minutes
    const cells: Array<{
      date: string;
      minutes: number;
      entries: number;
      level: number; // 0 = none, 1-4 = intensity
    }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = DateUtil.toISODate(d);
      const info = dataMap.get(key) || { minutes: 0, entries: 0 };

      let level = 0;
      if (info.minutes > 0) {
        if (info.minutes < 30) level = 1;
        else if (info.minutes < 60) level = 2;
        else if (info.minutes < 120) level = 3;
        else level = 4;
      }

      cells.push({
        date: key,
        minutes: info.minutes,
        entries: info.entries,
        level,
      });
    }

    const totalMinutes = cells.reduce((s, c) => s + c.minutes, 0);
    const activeDays = cells.filter((c) => c.entries > 0).length;

    const payload = {
      days,
      from: DateUtil.toISODate(from),
      to: DateUtil.toISODate(today),
      totalMinutes,
      activeDays,
      maxLevel: 4,
      cells,
    };

    // Cache for 10 minutes
    await this.redis.set(cacheKey, JSON.stringify(payload), 600);

    return { message: MESSAGES.SUCCESS, data: payload };
  }

  // ----------------------------------------------------------
  // GET /streak/weekly-challenge
  // ----------------------------------------------------------
  async getWeeklyChallenge(userId: string) {
    const today = DateUtil.toDateOnly(new Date());
    const { start, end } = DateUtil.getWeekRange(today);

    const cacheKey = `streak:challenge:${userId}:${DateUtil.toISODate(start)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { message: MESSAGES.SUCCESS, data: JSON.parse(cached) };
    }

    const agg = await this.prisma.studyEntry.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { durationMinutes: true },
      _count: { _all: true },
    });

    const totalMinutes = agg._sum.durationMinutes ?? 0;
    const totalEntries = agg._count._all;

    const distinctDays = await this.prisma.studyEntry.groupBy({
      by: ['date'],
      where: { userId, date: { gte: start, lte: end } },
    });
    const daysStudied = distinctDays.length;

    // Weekly challenges (out of 3 goals)
    const challenges = [
      {
        code: 'WEEKLY_5_DAYS',
        title: '৫ দিন পড়াশোনা',
        description: 'এই সপ্তাহে ৫ দিন পড়াশোনা করো',
        target: 5,
        progress: daysStudied,
        unit: 'দিন',
        completed: daysStudied >= 5,
        reward: '+50 XP',
      },
      {
        code: 'WEEKLY_10_HOURS',
        title: '১০ ঘণ্টা ক্লাব',
        description: 'এই সপ্তাহে মোট ১০ ঘণ্টা পড়ো',
        target: 600,
        progress: totalMinutes,
        unit: 'মিনিট',
        completed: totalMinutes >= 600,
        reward: '+100 XP',
      },
      {
        code: 'WEEKLY_3_SUBJECTS',
        title: 'তিন বিষয়ে পড়া',
        description: 'এই সপ্তাহে অন্তত ৩টি বিষয়ে পড়ো',
        target: 3,
        progress: await this.countDistinctSubjects(userId, start, end),
        unit: 'বিষয়',
        completed: false,
        reward: '+30 XP',
      },
    ];

    // Mark 3rd complete based on progress
    challenges[2].completed = challenges[2].progress >= challenges[2].target;

    const completedCount = challenges.filter((c) => c.completed).length;

    const payload = {
      weekStart: DateUtil.toISODate(start),
      weekEnd: DateUtil.toISODate(end),
      totalMinutes,
      totalEntries,
      daysStudied,
      completedCount,
      totalChallenges: challenges.length,
      challenges,
    };

    // Cache 5 minutes
    await this.redis.set(cacheKey, JSON.stringify(payload), 300);

    return { message: MESSAGES.SUCCESS, data: payload };
  }

  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------
  private async countDistinctSubjects(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const rows = await this.prisma.studyEntry.findMany({
      where: { userId, date: { gte: from, lte: to } },
      distinct: ['subjectId'],
      select: { subjectId: true },
    });
    return rows.length;
  }
}