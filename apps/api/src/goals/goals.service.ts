// ============================================================
// Path: apps/api/src/goals/goals.service.ts
// ============================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Goal, GoalType } from '@prisma/client';
import { MESSAGES } from '../common/messages';
import { DateUtil, LevelUtil } from '../common/utils';
import { GamificationService } from '../gamification/gamification.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto, QueryGoalDto, UpdateGoalDto } from './dto';

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
  ) {}

  // ----------------------------------------------------------
  // POST /goals
  // ----------------------------------------------------------
  async create(userId: string, dto: CreateGoalDto) {
    if (!dto.targetMinutes && !dto.targetChapters) {
      throw new BadRequestException('সময় অথবা অধ্যায়ের লক্ষ্য নির্ধারণ করুন');
    }

    if (dto.subjectId) {
      const subj = await this.prisma.subject.findUnique({
        where: { id: dto.subjectId },
        select: { userId: true },
      });
      if (!subj) throw new NotFoundException(MESSAGES.SUBJECT_NOT_FOUND);
      if (subj.userId !== userId) throw new ForbiddenException(MESSAGES.FORBIDDEN);
    }

    const { startsAt, endsAt } = this.rangeForType(dto.type);

    const goal = await this.prisma.goal.create({
      data: {
        userId,
        subjectId: dto.subjectId ?? null,
        title: dto.title.trim(),
        type: dto.type,
        targetMinutes: dto.targetMinutes ?? null,
        targetChapters: dto.targetChapters ?? null,
        startsAt,
        endsAt,
      },
    });

    // Compute initial progress
    const progress = await this.computeProgress(goal, userId);

    return {
      message: MESSAGES.GOAL_CREATED,
      data: { ...this.serialize(goal), ...progress },
    };
  }

  // ----------------------------------------------------------
  // GET /goals
  // ----------------------------------------------------------
  async list(userId: string, query: QueryGoalDto) {
    const where: any = { userId };
    if (query.type) where.type = query.type;
    if (query.isCompleted !== undefined) where.isCompleted = query.isCompleted;

    if (query.active) {
      const today = DateUtil.toDateOnly(new Date());
      where.endsAt = { gte: today };
      where.isCompleted = false;
    }

    const goals = await this.prisma.goal.findMany({
      where,
      orderBy: [{ isCompleted: 'asc' }, { endsAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        subject: { select: { id: true, name: true, color: true, icon: true } },
      },
    });

    // Compute live progress for each
    const withProgress = await Promise.all(
      goals.map(async (g) => ({
        ...this.serialize(g),
        ...(await this.computeProgress(g, userId)),
      })),
    );

    return { message: MESSAGES.SUCCESS, data: withProgress };
  }

  // ----------------------------------------------------------
  // GET /goals/:id
  // ----------------------------------------------------------
  async findOne(userId: string, id: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, color: true, icon: true } },
      },
    });
    if (!goal) throw new NotFoundException(MESSAGES.GOAL_NOT_FOUND);
    if (goal.userId !== userId) throw new ForbiddenException(MESSAGES.FORBIDDEN);

    const progress = await this.computeProgress(goal, userId);
    return {
      message: MESSAGES.SUCCESS,
      data: { ...this.serialize(goal), ...progress },
    };
  }

  // ----------------------------------------------------------
  // PATCH /goals/:id
  // ----------------------------------------------------------
  async update(userId: string, id: string, dto: UpdateGoalDto) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException(MESSAGES.GOAL_NOT_FOUND);
    if (goal.userId !== userId) throw new ForbiddenException(MESSAGES.FORBIDDEN);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.targetMinutes !== undefined) data.targetMinutes = dto.targetMinutes;
    if (dto.targetChapters !== undefined) data.targetChapters = dto.targetChapters;

    // Manual completion toggle
    let justCompleted = false;
    if (dto.isCompleted !== undefined && dto.isCompleted !== goal.isCompleted) {
      data.isCompleted = dto.isCompleted;
      if (dto.isCompleted) justCompleted = true;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('পরিবর্তনের জন্য কোনো তথ্য দেওয়া হয়নি');
    }

    const updated = await this.prisma.goal.update({ where: { id }, data });

    // XP bonus for completing a goal
    if (justCompleted) {
      const bonus = this.xpForGoalType(updated.type);
      await this.gamification.awardXp(userId, bonus);
    }

    const progress = await this.computeProgress(updated, userId);

    return {
      message: MESSAGES.GOAL_UPDATED,
      data: { ...this.serialize(updated), ...progress },
    };
  }

  // ----------------------------------------------------------
  // DELETE /goals/:id
  // ----------------------------------------------------------
  async remove(userId: string, id: string) {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!goal) throw new NotFoundException(MESSAGES.GOAL_NOT_FOUND);
    if (goal.userId !== userId) throw new ForbiddenException(MESSAGES.FORBIDDEN);

    await this.prisma.goal.delete({ where: { id } });
    return { message: MESSAGES.GOAL_DELETED, data: null };
  }

  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------
  private rangeForType(type: GoalType): { startsAt: Date; endsAt: Date } {
    const today = DateUtil.toDateOnly(new Date());
    if (type === 'DAILY') {
      return { startsAt: today, endsAt: today };
    }
    if (type === 'WEEKLY') {
      const { start, end } = DateUtil.getWeekRange(today);
      return { startsAt: start, endsAt: end };
    }
    // MONTHLY
    const { start, end } = DateUtil.getMonthRange(today);
    return { startsAt: start, endsAt: end };
  }

  private async computeProgress(goal: Goal, userId: string) {
    const where: any = {
      userId,
      date: { gte: goal.startsAt, lte: goal.endsAt },
    };
    if (goal.subjectId) where.subjectId = goal.subjectId;

    const agg = await this.prisma.studyEntry.aggregate({
      where,
      _sum: { durationMinutes: true },
      _count: { _all: true },
    });

    const currentMinutes = agg._sum.durationMinutes ?? 0;

    // chapters = distinct chapters in range
    let currentChapters = 0;
    if (goal.targetChapters) {
      const rows = await this.prisma.studyEntry.findMany({
        where: { ...where, chapter: { not: null } },
        distinct: ['chapter'],
        select: { chapter: true },
      });
      currentChapters = rows.length;
    }

    const minutesProgress = goal.targetMinutes
      ? Math.min(100, Math.round((currentMinutes / goal.targetMinutes) * 100))
      : 0;
    const chaptersProgress = goal.targetChapters
      ? Math.min(100, Math.round((currentChapters / goal.targetChapters) * 100))
      : 0;

    const progressPercent = Math.max(minutesProgress, chaptersProgress);
    const isAchieved =
      (goal.targetMinutes != null && currentMinutes >= goal.targetMinutes) ||
      (goal.targetChapters != null && currentChapters >= goal.targetChapters);

    return {
      progressPercent,
      currentMinutes,
      currentChapters,
      isAchieved,
      daysRemaining: Math.max(
        0,
        DateUtil.diffDays(goal.endsAt, DateUtil.toDateOnly(new Date())) + 1,
      ),
    };
  }

  private xpForGoalType(type: GoalType): number {
    if (type === 'DAILY') return 20;
    if (type === 'WEEKLY') return 60;
    return 150; // MONTHLY
  }

  private serialize(goal: Goal & { subject?: any }) {
    return {
      id: goal.id,
      title: goal.title,
      type: goal.type,
      targetMinutes: goal.targetMinutes,
      targetChapters: goal.targetChapters,
      subjectId: goal.subjectId,
      subject: goal.subject ?? null,
      isCompleted: goal.isCompleted,
      startsAt: DateUtil.toISODate(goal.startsAt),
      endsAt: DateUtil.toISODate(goal.endsAt),
      createdAt: goal.createdAt.toISOString(),
    };
  }
}