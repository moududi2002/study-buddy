// ============================================================
// Path: apps/api/src/analytics/analytics.service.ts
// ============================================================

import { Injectable } from '@nestjs/common';
import { MESSAGES } from '../common/messages';
import { DateUtil } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ----------------------------------------------------------
  // WEEKLY ANALYSIS
  // ----------------------------------------------------------
  async weekly(userId: string) {
    const today = DateUtil.toDateOnly(new Date());
    const { start, end } = DateUtil.getWeekRange(today);

    const entries = await this.prisma.studyEntry.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: {
        subject: { select: { id: true, name: true, color: true, icon: true } },
      },
    });

    const totalMinutes = entries.reduce((s, e) => s + e.durationMinutes, 0);
    const daysStudied = new Set(entries.map((e) => DateUtil.toISODate(e.date))).size;
    const avgPerDay = daysStudied > 0 ? Math.round(totalMinutes / 7) : 0;

    // Group by subject
    const bySubject = new Map<
      string,
      { id: string; name: string; color: string; icon: string; minutes: number; entries: number }
    >();
    for (const e of entries) {
      const key = e.subjectId;
      const cur = bySubject.get(key) || {
        id: e.subject.id,
        name: e.subject.name,
        color: e.subject.color,
        icon: e.subject.icon,
        minutes: 0,
        entries: 0,
      };
      cur.minutes += e.durationMinutes;
      cur.entries += 1;
      bySubject.set(key, cur);
    }

    const subjectList = Array.from(bySubject.values()).sort(
      (a, b) => b.minutes - a.minutes,
    );

    const topSubject = subjectList[0] ?? null;
    const leastSubject = subjectList.length > 1 ? subjectList[subjectList.length - 1] : null;

    // Daily totals (শনি → শুক্র)
    const dailyMap = new Map<string, number>();
    for (const e of entries) {
      const key = DateUtil.toISODate(e.date);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + e.durationMinutes);
    }
    const dayLabels = ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র'];
    const daily: Array<{ date: string; dayLabel: string; minutes: number }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = DateUtil.toISODate(d);
      daily.push({ date: key, dayLabel: dayLabels[i], minutes: dailyMap.get(key) ?? 0 });
    }
    const bestDay = daily.reduce(
      (best, d) => (d.minutes > best.minutes ? d : best),
      daily[0],
    );

    const suggestions = this.buildWeeklySuggestions({
      totalMinutes,
      daysStudied,
      subjectList,
      bestDay,
    });

    return {
      message: MESSAGES.SUCCESS,
      data: {
        weekStart: DateUtil.toISODate(start),
        weekEnd: DateUtil.toISODate(end),
        totalMinutes,
        totalEntries: entries.length,
        daysStudied,
        avgPerDay,
        topSubject,
        leastSubject,
        bestDay,
        subjectBreakdown: subjectList,
        daily,
        suggestions,
      },
    };
  }

  // ----------------------------------------------------------
  // MONTHLY ANALYSIS
  // ----------------------------------------------------------
  async monthly(userId: string) {
    const today = DateUtil.toDateOnly(new Date());
    const { start, end } = DateUtil.getMonthRange(today);

    // Previous month range for growth
    const prevMonthRef = new Date(start);
    prevMonthRef.setDate(0); // last day of previous month
    const { start: prevStart, end: prevEnd } = DateUtil.getMonthRange(prevMonthRef);

    const [thisMonth, prevMonth] = await Promise.all([
      this.prisma.studyEntry.findMany({
        where: { userId, date: { gte: start, lte: end } },
        include: {
          subject: { select: { id: true, name: true, color: true, icon: true } },
        },
      }),
      this.prisma.studyEntry.aggregate({
        where: { userId, date: { gte: prevStart, lte: prevEnd } },
        _sum: { durationMinutes: true },
      }),
    ]);

    const totalMinutes = thisMonth.reduce((s, e) => s + e.durationMinutes, 0);
    const prevMinutes = prevMonth._sum.durationMinutes ?? 0;
    const growthPercent =
      prevMinutes > 0
        ? Math.round(((totalMinutes - prevMinutes) / prevMinutes) * 100)
        : totalMinutes > 0
          ? 100
          : 0;

    // Distinct study days → consistency
    const distinctDays = new Set(
      thisMonth.map((e) => DateUtil.toISODate(e.date)),
    ).size;
    const daysInMonth = end.getDate();
    const consistencyPercent = Math.round((distinctDays / daysInMonth) * 100);

    // Subject-wise
    const bySubject = new Map<
      string,
      { id: string; name: string; color: string; icon: string; minutes: number; entries: number }
    >();
    for (const e of thisMonth) {
      const cur = bySubject.get(e.subjectId) || {
        id: e.subject.id,
        name: e.subject.name,
        color: e.subject.color,
        icon: e.subject.icon,
        minutes: 0,
        entries: 0,
      };
      cur.minutes += e.durationMinutes;
      cur.entries += 1;
      bySubject.set(e.subjectId, cur);
    }
    const subjectList = Array.from(bySubject.values()).sort(
      (a, b) => b.minutes - a.minutes,
    );

    // User streak info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true, xp: true, level: true },
    });

    // Badge count this month
    const badgeCount = await this.prisma.userBadge.count({
      where: { userId, earnedAt: { gte: start, lte: end } },
    });

    const suggestions = this.buildMonthlySuggestions({
      totalMinutes,
      growthPercent,
      consistencyPercent,
      subjectList,
    });

    return {
      message: MESSAGES.SUCCESS,
      data: {
        monthStart: DateUtil.toISODate(start),
        monthEnd: DateUtil.toISODate(end),
        totalMinutes,
        totalEntries: thisMonth.length,
        distinctDays,
        daysInMonth,
        consistencyPercent,
        prevMonthMinutes: prevMinutes,
        growthPercent,
        subjectBreakdown: subjectList,
        streak: {
          current: user?.currentStreak ?? 0,
          longest: user?.longestStreak ?? 0,
        },
        xp: user?.xp ?? 0,
        level: user?.level ?? 1,
        badgesEarnedThisMonth: badgeCount,
        suggestions,
      },
    };
  }

  // ----------------------------------------------------------
  // SUBJECT DISTRIBUTION (pie chart)
  // ----------------------------------------------------------
  async subjectDistribution(userId: string, fromISO?: string, toISO?: string) {
    const today = DateUtil.toDateOnly(new Date());
    const from = fromISO ? DateUtil.toDateOnly(new Date(fromISO)) : DateUtil.startOfDay(new Date(today.getTime() - 29 * 86400000));
    const to = toISO ? DateUtil.toDateOnly(new Date(toISO)) : today;

    const rows = await this.prisma.studyEntry.groupBy({
      by: ['subjectId'],
      where: { userId, date: { gte: from, lte: to } },
      _sum: { durationMinutes: true },
      _count: { _all: true },
    });

    const subjects = await this.prisma.subject.findMany({
      where: { userId },
      select: { id: true, name: true, color: true, icon: true },
    });
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    const data = rows
      .map((r) => {
        const s = subjectMap.get(r.subjectId);
        return {
          subjectId: r.subjectId,
          name: s?.name ?? 'অজানা',
          color: s?.color ?? '#A78BFA',
          icon: s?.icon ?? '📚',
          minutes: r._sum.durationMinutes ?? 0,
          entries: r._count._all,
        };
      })
      .sort((a, b) => b.minutes - a.minutes);

    const totalMinutes = data.reduce((s, d) => s + d.minutes, 0);

    return {
      message: MESSAGES.SUCCESS,
      data: {
        from: DateUtil.toISODate(from),
        to: DateUtil.toISODate(to),
        totalMinutes,
        items: data,
      },
    };
  }

  // ----------------------------------------------------------
  // DAILY TREND (line chart)
  // ----------------------------------------------------------
  async dailyTrend(userId: string, days = 30) {
    const today = DateUtil.toDateOnly(new Date());
    const from = new Date(today);
    from.setDate(today.getDate() - (days - 1));

    const entries = await this.prisma.studyEntry.findMany({
      where: { userId, date: { gte: from, lte: today } },
      select: { date: true, durationMinutes: true },
    });

    const map = new Map<string, number>();
    for (const e of entries) {
      const key = DateUtil.toISODate(e.date);
      map.set(key, (map.get(key) ?? 0) + e.durationMinutes);
    }

    const series: Array<{ date: string; minutes: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = DateUtil.toISODate(d);
      series.push({ date: key, minutes: map.get(key) ?? 0 });
    }

    return {
      message: MESSAGES.SUCCESS,
      data: { days, series },
    };
  }

  // ----------------------------------------------------------
  // DASHBOARD (all-in-one)
  // ----------------------------------------------------------
  async dashboard(userId: string) {
    const [weekly, user, todayAgg] = await Promise.all([
  this.weekly(userId),

    this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        xp: true,
        level: true,
        fullName: true,
        avatarUrl: true,
      },
    }),

    this.prisma.studyEntry.aggregate({
      where: {
        userId,
        date: DateUtil.toDateOnly(new Date()),
      },
      _sum: { durationMinutes: true },
      _count: { _all: true },
    }),
  ]);


    const todayMinutes = todayAgg._sum.durationMinutes ?? 0;
    const todayEntries = todayAgg._count._all;

    // Active goals
    const activeGoals = await this.prisma.goal.findMany({
      where: {
        userId,
        isCompleted: false,
        endsAt: { gte: DateUtil.toDateOnly(new Date()) },
      },
      take: 3,
      orderBy: { endsAt: 'asc' },
    });

    // Recent badges
    const recentBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
      take: 3,
    });

    const motivation = this.buildMotivationMessage({
      todayMinutes,
      streak: user?.currentStreak ?? 0,
      weeklyTotal: weekly.data.totalMinutes,
    });

    return {
      message: MESSAGES.SUCCESS,
      data: {
        user: user,
        today: { minutes: todayMinutes, entries: todayEntries },
        weekTotalMinutes: weekly.data.totalMinutes,
        motivation,
        activeGoals,
        recentBadges,
        weeklySummary: {
          topSubject: weekly.data.topSubject,
          leastSubject: weekly.data.leastSubject,
          bestDay: weekly.data.bestDay,
          daysStudied: weekly.data.daysStudied,
        },
      },
    };
  }

  // ----------------------------------------------------------
  // SUGGESTION BUILDERS (Bengali, rule-based; AI step 13)
  // ----------------------------------------------------------
  private buildWeeklySuggestions(params: {
    totalMinutes: number;
    daysStudied: number;
    subjectList: Array<{ name: string; minutes: number }>;
    bestDay: { dayLabel: string; minutes: number };
  }): string[] {
    const s: string[] = [];

    if (params.totalMinutes === 0) {
      s.push('এই সপ্তাহে এখনো পড়াশোনা শুরু হয়নি। আজই ছোট করে হলেও শুরু করো! 🌱');
      return s;
    }

    if (params.daysStudied < 5) {
      s.push(
        `এই সপ্তাহে ${params.daysStudied} দিন পড়েছো। সপ্তাহে অন্তত ৫ দিন পড়ার চেষ্টা করো — নিয়মিত পড়াই সাফল্যের চাবি। 📅`,
      );
    } else {
      s.push(`চমৎকার! ${params.daysStudied} দিন পড়াশোনা করেছো — নিয়মিত থাকো। 🌟`);
    }

    if (params.subjectList.length > 1) {
      const top = params.subjectList[0];
      const least = params.subjectList[params.subjectList.length - 1];
      const gap = top.minutes - least.minutes;
      if (gap >= 60) {
        s.push(
          `${top.name}-এ বেশি সময় দিয়েছো (${Math.round(top.minutes / 60)} ঘণ্টা), কিন্তু ${least.name}-এ মাত্র ${Math.round(least.minutes / 60)} ঘণ্টা। ${least.name}-এ আরও কিছুটা সময় দাও — ভারসাম্য ভালো হবে। ⚖️`,
        );
      }
    }

    if (params.bestDay.minutes > 0) {
      s.push(`${params.bestDay.dayLabel} বার সবচেয়ে ভালো পড়েছো — এভাবেই চালিয়ে যাও! 💪`);
    }

    return s;
  }

  private buildMonthlySuggestions(params: {
    totalMinutes: number;
    growthPercent: number;
    consistencyPercent: number;
    subjectList: Array<{ name: string; minutes: number }>;
  }): string[] {
    const s: string[] = [];

    if (params.totalMinutes === 0) {
      s.push('এই মাসে এখনো কোনো পড়াশোনা হয়নি। নতুন মাসে নতুন উদ্যমে শুরু করি! 🚀');
      return s;
    }

    if (params.growthPercent > 0) {
      s.push(
        `গত মাসের চেয়ে ${params.growthPercent}% বেশি পড়েছো — দারুণ উন্নতি! 📈`,
      );
    } else if (params.growthPercent < 0) {
      s.push(
        `গত মাসের চেয়ে ${Math.abs(params.growthPercent)}% কম পড়েছো। সামনের মাসে আরেকটু চেষ্টা করি। 💜`,
      );
    }

    if (params.consistencyPercent >= 70) {
      s.push(`তুমি মাসের ${params.consistencyPercent}% দিন পড়েছো — অভাবনীয় consistency! 🏆`);
    } else if (params.consistencyPercent >= 40) {
      s.push(`মাসের ${params.consistencyPercent}% দিন পড়েছো — আরেকটু নিয়মিত হলে দুর্দান্ত হবে। ✨`);
    } else {
      s.push(
        `মাসের মাত্র ${params.consistencyPercent}% দিন পড়েছো। প্রতিদিন অন্তত ৩০ মিনিট পড়ার লক্ষ্য রাখো। 🎯`,
      );
    }

    if (params.subjectList.length > 1) {
      const top = params.subjectList[0];
      const least = params.subjectList[params.subjectList.length - 1];
      if (top.minutes - least.minutes >= 300) {
        s.push(
          `গণিতে বেশি সময় দিচ্ছো, কিন্তু ${least.name}-এ কম। পরের সপ্তাহে ${least.name}-এ অন্তত ৪ ঘণ্টা বাড়ানোর চেষ্টা করো।`,
        );
      }
    }

    return s;
  }

  private buildMotivationMessage(params: {
    todayMinutes: number;
    streak: number;
    weeklyTotal: number;
  }): string {
    if (params.todayMinutes >= 120) {
      return `আজ ${Math.round(params.todayMinutes / 60)} ঘণ্টা পড়েছো! দারুণ কাজ! 🌟`;
    }
    if (params.todayMinutes >= 60) {
      return `আজ ১ ঘণ্টার বেশি পড়েছো — চালিয়ে যাও! 💜`;
    }
    if (params.todayMinutes > 0) {
      return `আজ ${params.todayMinutes} মিনিট পড়েছো — শুরুটা হয়েছে, এগিয়ে যাও! ✨`;
    }
    if (params.streak > 0) {
      return `তোমার ${params.streak} দিনের স্ট্রিক আছে — আজও পড়ে সেটা টিকিয়ে রাখো! 🔥`;
    }
    return `আজ পড়া শুরু করলে স্ট্রিক গড়ে উঠবে — ছোট করে হলেও শুরু করো! 🐱`;
  }
}