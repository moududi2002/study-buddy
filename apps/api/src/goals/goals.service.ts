
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Goal,
  GoalType,
  Prisma,
} from '../generated/prisma/client';

import { MESSAGES } from '../common/messages';
import { DateUtil, LevelUtil } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';

import {
  CreateGoalDto,
  QueryGoalDto,
  UpdateGoalDto,
} from './dto';

type GoalSubject = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

type GoalRecord = Goal & {
  subject?: GoalSubject | null;
};

const subjectInclude = {
  select: {
    id: true,
    name: true,
    color: true,
    icon: true,
  },
} as const;

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // CREATE GOAL
  async create(userId: string, dto: CreateGoalDto) {
    const title = dto.title.trim();

    if (title.length < 2) {
      throw new BadRequestException(
        'লক্ষ্যের নাম কমপক্ষে ২ অক্ষরের হতে হবে',
      );
    }

    if (
      dto.targetMinutes == null &&
      dto.targetChapters == null
    ) {
      throw new BadRequestException(
        'সময় অথবা অধ্যায়ের লক্ষ্য নির্ধারণ করুন',
      );
    }

    if (dto.subjectId) {
      const subject = await this.prisma.subject.findFirst({
        where: {
          id: dto.subjectId,
          userId,
        },
      });

      if (!subject) {
        throw new NotFoundException(
          MESSAGES.SUBJECT_NOT_FOUND,
        );
      }
    }

    const range = this.rangeForType(dto.type);

    const goal = await this.prisma.goal.create({
      data: {
        userId,
        title,
        type: dto.type,
        subjectId: dto.subjectId ?? null,
        targetMinutes: dto.targetMinutes ?? null,
        targetChapters: dto.targetChapters ?? null,
        startsAt: range.startsAt,
        endsAt: range.endsAt,
      },
      include: {
        subject: subjectInclude,
      },
    });

    return {
      message: MESSAGES.GOAL_CREATED,
      data: await this.withProgress(goal, userId),
    };
  }

  // LIST GOALS
  async list(userId: string, query: QueryGoalDto) {
    const where: Prisma.GoalWhereInput = { userId };

    if (query.type) {
      where.type = query.type;
    }

    if (query.isCompleted !== undefined) {
      where.isCompleted = query.isCompleted;
    }

    if (query.active) {
      const today = DateUtil.toDateOnly(new Date());

      where.startsAt = { lte: today };
      where.endsAt = { gte: today };
      where.isCompleted = false;
    }

    const goals = await this.prisma.goal.findMany({
      where,
      include: {
        subject: subjectInclude,
      },
      orderBy: [
        { isCompleted: 'asc' },
        { endsAt: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const data = await Promise.all(
      goals.map((goal) => this.withProgress(goal, userId)),
    );

    return {
      message: MESSAGES.SUCCESS,
      data,
    };
  }

  // GET SINGLE GOAL
  async findOne(userId: string, id: string) {
    const goal = await this.prisma.goal.findFirst({
      where: { id, userId },
      include: {
        subject: subjectInclude,
      },
    });

    if (!goal) {
      throw new NotFoundException(MESSAGES.GOAL_NOT_FOUND);
    }

    return {
      message: MESSAGES.SUCCESS,
      data: await this.withProgress(goal, userId),
    };
  }

  // UPDATE / COMPLETE GOAL
  async update(
    userId: string,
    id: string,
    dto: UpdateGoalDto,
  ) {
    const goal = await this.prisma.goal.findFirst({
      where: { id, userId },
    });

    if (!goal) {
      throw new NotFoundException(MESSAGES.GOAL_NOT_FOUND);
    }

    // A completed goal cannot be reopened for more XP.
    if (dto.isCompleted === false) {
      throw new BadRequestException(
        'সম্পন্ন লক্ষ্য আবার চালু করা যাবে না',
      );
    }

    if (dto.isCompleted === true) {
      if (
        dto.title !== undefined ||
        dto.targetMinutes !== undefined ||
        dto.targetChapters !== undefined
      ) {
        throw new BadRequestException(
          'লক্ষ্য সম্পন্ন করা এবং পরিবর্তন করা আলাদাভাবে করুন',
        );
      }

      if (!goal.isCompleted) {
        const progress = await this.computeProgress(
          goal,
          userId,
        );

        if (!progress.isAchieved) {
          throw new BadRequestException(
            'নির্ধারিত সব লক্ষ্য এখনো পূরণ হয়নি',
          );
        }

        const bonus = this.xpForGoalType(goal.type);

        // Atomic update prevents duplicate completion XP.
        await this.prisma.$transaction(async (tx) => {
          const completed = await tx.goal.updateMany({
            where: {
              id,
              userId,
              isCompleted: false,
            },
            data: {
              isCompleted: true,
            },
          });

          if (completed.count !== 1) {
            return;
          }

          const user = await tx.user.update({
            where: { id: userId },
            data: {
              xp: { increment: bonus },
            },
            select: {
              xp: true,
            },
          });

          await tx.user.update({
            where: { id: userId },
            data: {
              level: LevelUtil.levelFromXp(user.xp),
            },
          });
        });
      }

      const updated = await this.getGoal(userId, id);

      return {
        message: MESSAGES.GOAL_UPDATED,
        data: await this.withProgress(updated, userId),
      };
    }

    if (goal.isCompleted) {
      throw new BadRequestException(
        'সম্পন্ন লক্ষ্য আর পরিবর্তন করা যাবে না',
      );
    }

    const changes: {
      title?: string;
      targetMinutes?: number;
      targetChapters?: number;
    } = {};

    if (dto.title !== undefined) {
      if (dto.title.trim().length < 2) {
        throw new BadRequestException(
          'লক্ষ্যের নাম কমপক্ষে ২ অক্ষরের হতে হবে',
        );
      }

      changes.title = dto.title.trim();
    }

    if (dto.targetMinutes !== undefined) {
      changes.targetMinutes = dto.targetMinutes;
    }

    if (dto.targetChapters !== undefined) {
      changes.targetChapters = dto.targetChapters;
    }

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException(
        'পরিবর্তনের জন্য কোনো তথ্য দেওয়া হয়নি',
      );
    }

    const result = await this.prisma.goal.updateMany({
      where: {
        id,
        userId,
        isCompleted: false,
      },
      data: changes,
    });

    if (result.count !== 1) {
      throw new BadRequestException(
        'লক্ষ্যটি পরিবর্তন করা সম্ভব হয়নি',
      );
    }

    const updated = await this.getGoal(userId, id);

    return {
      message: MESSAGES.GOAL_UPDATED,
      data: await this.withProgress(updated, userId),
    };
  }

  // DELETE GOAL
  async remove(userId: string, id: string) {
    const result = await this.prisma.goal.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException(MESSAGES.GOAL_NOT_FOUND);
    }

    return {
      message: MESSAGES.GOAL_DELETED,
      data: null,
    };
  }

  // INTERNAL HELPERS
  private async getGoal(
    userId: string,
    id: string,
  ): Promise<GoalRecord> {
    const goal = await this.prisma.goal.findFirst({
      where: { id, userId },
      include: {
        subject: subjectInclude,
      },
    });

    if (!goal) {
      throw new NotFoundException(MESSAGES.GOAL_NOT_FOUND);
    }

    return goal;
  }

  private rangeForType(type: GoalType): {
    startsAt: Date;
    endsAt: Date;
  } {
    const today = DateUtil.toDateOnly(new Date());

    if (type === 'DAILY') {
      return {
        startsAt: today,
        endsAt: today,
      };
    }

    if (type === 'WEEKLY') {
      const range = DateUtil.getWeekRange(today);

      return {
        startsAt: range.start,
        endsAt: range.end,
      };
    }

    const range = DateUtil.getMonthRange(today);

    return {
      startsAt: range.start,
      endsAt: range.end,
    };
  }

  private async withProgress(
    goal: GoalRecord,
    userId: string,
  ) {
    const progress = await this.computeProgress(
      goal,
      userId,
    );

    return {
      ...this.serialize(goal),
      ...progress,
    };
  }

  private async computeProgress(
    goal: Goal,
    userId: string,
  ) {
    const where: Prisma.StudyEntryWhereInput = {
      userId,
      date: {
        gte: goal.startsAt,
        lte: goal.endsAt,
      },
    };

    if (goal.subjectId) {
      where.subjectId = goal.subjectId;
    }

    const [aggregate, chapterRows] = await Promise.all([
      this.prisma.studyEntry.aggregate({
        where,
        _sum: {
          durationMinutes: true,
        },
      }),

      goal.targetChapters != null
        ? this.prisma.studyEntry.findMany({
            where: {
              ...where,
              chapter: { not: null },
            },
            select: {
              subjectId: true,
              chapter: true,
            },
          })
        : Promise.resolve(
            [] as Array<{
              subjectId: string;
              chapter: string | null;
            }>,
          ),
    ]);

    const currentMinutes = Math.max(
      0,
      aggregate._sum.durationMinutes ?? 0,
    );

    // Same chapter in different subjects counts separately.
    // Duplicate logs of the same chapter count only once.
    const chapters = new Set<string>();

    for (const entry of chapterRows) {
      const chapter = entry.chapter
        ?.normalize('NFKC')
        .trim()
        .replace(/\s+/g, ' ')
        .toLocaleLowerCase();

      if (chapter) {
        chapters.add(`${entry.subjectId}:${chapter}`);
      }
    }

    const currentChapters = chapters.size;
    const percentages: number[] = [];
    const conditions: boolean[] = [];

    if (goal.targetMinutes != null) {
      const target = Math.max(1, goal.targetMinutes);

      percentages.push(
        Math.min(100, (currentMinutes / target) * 100),
      );

      conditions.push(currentMinutes >= target);
    }

    if (goal.targetChapters != null) {
      const target = Math.max(1, goal.targetChapters);

      percentages.push(
        Math.min(100, (currentChapters / target) * 100),
      );

      conditions.push(currentChapters >= target);
    }

    const isAchieved =
      conditions.length > 0 && conditions.every(Boolean);

    const average =
      percentages.length > 0
        ? percentages.reduce((sum, value) => sum + value, 0) /
          percentages.length
        : 0;

    // Never display 100% before every requirement is met.
    const progressPercent = isAchieved
      ? 100
      : Math.min(99, Math.round(average));

    const today = DateUtil.toDateOnly(new Date());

    return {
      currentMinutes,
      currentChapters,
      progressPercent,
      isAchieved,
      isExpired: today.getTime() > goal.endsAt.getTime(),
      daysRemaining: Math.max(
        0,
        DateUtil.diffDays(goal.endsAt, today) + 1,
      ),
    };
  }

  private xpForGoalType(type: GoalType): number {
    if (type === 'DAILY') return 20;
    if (type === 'WEEKLY') return 60;
    return 150;
  }

  private serialize(goal: GoalRecord) {
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
