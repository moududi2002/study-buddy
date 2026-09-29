// ============================================================
// Path: apps/api/src/friends/friends.service.ts
// ============================================================

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MESSAGES } from '../common/messages';
import { DateUtil } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { SearchFriendsDto } from './dto';
import { BADGE_DEFINITIONS } from '../../prisma/seed';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------
  // GET /friends/search?q=...
  // ----------------------------------------------------------
  async search(currentUserId: string, dto: SearchFriendsDto) {
    const q = dto.q.trim();
    const limit = dto.limit ?? 20;

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          { isActive: true },
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q.toLowerCase(), mode: 'insensitive' } },
              { fullName: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: limit,
      orderBy: { username: 'asc' },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        classLevel: true,
        level: true,
        xp: true,
        currentStreak: true,
      },
    });

    // Check which are already in same groups (context hint)
    const myGroupIds = await this.prisma.groupMember
      .findMany({
        where: { userId: currentUserId },
        select: { groupId: true },
      })
      .then((rows) => rows.map((r) => r.groupId));

    const sharedMemberIds = new Set<string>();
    if (myGroupIds.length > 0) {
      const others = await this.prisma.groupMember.findMany({
        where: {
          groupId: { in: myGroupIds },
          userId: { in: users.map((u) => u.id) },
        },
        select: { userId: true },
      });
      others.forEach((o) => sharedMemberIds.add(o.userId));
    }

    return {
      message: MESSAGES.SUCCESS,
      data: users.map((u) => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        classLevel: u.classLevel,
        level: u.level,
        xp: u.xp,
        currentStreak: u.currentStreak,
        isInSameGroup: sharedMemberIds.has(u.id),
      })),
    };
  }

  // ----------------------------------------------------------
  // GET /friends/:userId/summary
  // Privacy: public aggregate only, no entries/notes/diary
  // ----------------------------------------------------------
  async getSummary(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new ForbiddenException('নিজের জন্য /users/me/stats ব্যবহার করো');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        classLevel: true,
        xp: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        isProfilePublic: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!target || !target.isActive) throw new NotFoundException(MESSAGES.USER_NOT_FOUND);
    if (!target.isProfilePublic) {
      throw new ForbiddenException('এই ব্যবহারকারী প্রোফাইল প্রাইভেট রেখেছেন');
    }

    // Access check: must share at least one group OR be viewable
    // (For MVP: any authenticated user can view public summaries)
    const sharedGroup = await this.prisma.groupMember.findFirst({
      where: {
        userId: targetUserId,
        group: {
          members: { some: { userId: currentUserId } },
        },
      },
      select: { groupId: true },
    });

    const today = DateUtil.toDateOnly(new Date());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const [todayAgg, weekAgg, monthAgg, badgeCount, subjectCount] = await Promise.all([
      this.prisma.studyEntry.aggregate({
        where: { userId: targetUserId, date: today },
        _sum: { durationMinutes: true },
        _count: { _all: true },
      }),
      this.prisma.studyEntry.aggregate({
        where: { userId: targetUserId, date: { gte: sevenDaysAgo, lte: today } },
        _sum: { durationMinutes: true },
      }),
      this.prisma.studyEntry.aggregate({
        where: {
          userId: targetUserId,
          date: { gte: new Date(today.getTime() - 29 * 86400000), lte: today },
        },
        _sum: { durationMinutes: true },
      }),
      this.prisma.userBadge.count({ where: { userId: targetUserId } }),
      this.prisma.subject.count({ where: { userId: targetUserId } }),
    ]);

    // Days studied this week (count of distinct study dates)
    const weekDays = await this.prisma.studyEntry.findMany({
      where: {
        userId: targetUserId,
        date: { gte: sevenDaysAgo, lte: today },
      },
      distinct: ['date'],
      select: { date: true },
    });

    return {
      message: MESSAGES.SUCCESS,
      data: {
        user: {
          id: target.id,
          username: target.username,
          fullName: target.fullName,
          avatarUrl: target.avatarUrl,
          classLevel: target.classLevel,
          level: target.level,
          xp: target.xp,
          currentStreak: target.currentStreak,
          longestStreak: target.longestStreak,
          joinedAt: target.createdAt.toISOString(),
        },
        today: {
          minutes: todayAgg._sum.durationMinutes ?? 0,
          entries: todayAgg._count._all,
        },
        week: {
          minutes: weekAgg._sum.durationMinutes ?? 0,
          daysStudied: weekDays.length,
        },
        month: {
          minutes: monthAgg._sum.durationMinutes ?? 0,
        },
        badgeCount,
        subjectCount,
        isInSameGroup: !!sharedGroup,
      },
    };
  }

  // ----------------------------------------------------------
  // GET /friends/:userId/badges
  // ----------------------------------------------------------
  async getBadges(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new ForbiddenException('নিজের ব্যাজের জন্য /gamification/badges ব্যবহার করো');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { isProfilePublic: true, isActive: true },
    });
    if (!target || !target.isActive) throw new NotFoundException(MESSAGES.USER_NOT_FOUND);
    if (!target.isProfilePublic) {
      throw new ForbiddenException('এই ব্যবহারকারী প্রোফাইল প্রাইভেট রেখেছেন');
    }

    const earned = await this.prisma.userBadge.findMany({
      where: { userId: targetUserId },
      orderBy: { earnedAt: 'desc' },
      select: { code: true, earnedAt: true },
    });

    return {
      message: MESSAGES.SUCCESS,
      data: {
        total: Object.keys(BADGE_DEFINITIONS).length,
        earnedCount: earned.length,
        items: earned.map((b) => ({
          code: b.code,
          ...BADGE_DEFINITIONS[b.code],
          earnedAt: b.earnedAt.toISOString(),
        })),
      },
    };
  }

  // ----------------------------------------------------------
  // GET /friends/:userId/weekly-trend (mini line chart data)
  // For friend's public dashboard
  // ----------------------------------------------------------
  async getWeeklyTrend(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new ForbiddenException('নিজের trend এর জন্য /analytics/daily-trend ব্যবহার করো');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { isProfilePublic: true, isActive: true },
    });
    if (!target || !target.isActive) throw new NotFoundException(MESSAGES.USER_NOT_FOUND);
    if (!target.isProfilePublic) {
      throw new ForbiddenException('এই ব্যবহারকারী প্রোফাইল প্রাইভেট রেখেছেন');
    }

    const today = DateUtil.toDateOnly(new Date());
    const sevenAgo = new Date(today);
    sevenAgo.setDate(today.getDate() - 6);

    const entries = await this.prisma.studyEntry.findMany({
      where: { userId: targetUserId, date: { gte: sevenAgo, lte: today } },
      select: { date: true, durationMinutes: true },
    });

    const map = new Map<string, number>();
    for (const e of entries) {
      const key = DateUtil.toISODate(e.date);
      map.set(key, (map.get(key) ?? 0) + e.durationMinutes);
    }

    const series: Array<{ date: string; minutes: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = DateUtil.toISODate(d);
      series.push({ date: key, minutes: map.get(key) ?? 0 });
    }

    return {
      message: MESSAGES.SUCCESS,
      data: { days: 7, series },
    };
  }
}