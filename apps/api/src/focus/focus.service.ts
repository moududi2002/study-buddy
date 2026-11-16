// apps/api/src/focus/focus.service.ts

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import {
  FocusStatus,
  Prisma,
  StudyMood,
} from '../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StudyEntriesService } from '../study-entries/study-entries.service';
import { DateUtil, LevelUtil } from '../common/utils';
import { FocusPushService } from './focus-push.service';

const MAX_SEGMENT_SECONDS = 3 * 60 * 60;
const MAX_SEGMENT_MS = MAX_SEGMENT_SECONDS * 1000;

type FocusRow = Prisma.FocusSessionGetPayload<{
  include: {
    subject: true;
    studyEntry: true;
  };
}>;

@Injectable()
export class FocusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studyEntries: StudyEntriesService,
    private readonly push: FocusPushService,
  ) {}

  private async getRow(id: string): Promise<FocusRow> {
    const row = await this.prisma.focusSession.findUnique({
      where: { id },
      include: {
        subject: true,
        studyEntry: true,
      },
    });

    if (!row) {
      throw new NotFoundException('Focus Session পাওয়া যায়নি');
    }

    return row;
  }

  private secondsFor(row: FocusRow, now: Date): number {
    if (
      row.status !== FocusStatus.RUNNING ||
      !row.segmentStartedAt ||
      !row.checkpointAt
    ) {
      return row.accumulatedSeconds;
    }

    const effectiveEnd = Math.min(
      now.getTime(),
      row.checkpointAt.getTime(),
    );

    const segmentSeconds = Math.max(
      0,
      Math.floor(
        (effectiveEnd - row.segmentStartedAt.getTime()) / 1000,
      ),
    );

    return row.accumulatedSeconds + Math.min(
      MAX_SEGMENT_SECONDS,
      segmentSeconds,
    );
  }

  private present(row: FocusRow) {
    const now = new Date();
    const elapsedSeconds = this.secondsFor(row, now);

    const waiting =
      row.status === FocusStatus.WAITING ||
      (row.status === FocusStatus.RUNNING &&
        !!row.checkpointAt &&
        now >= row.checkpointAt);

    return {
      id: row.id,
      subjectId: row.subjectId,
      subject: {
        id: row.subject.id,
        name: row.subject.name,
        icon: row.subject.icon,
        color: row.subject.color,
      },

     chapter: row.chapter,


      status: waiting && row.status !== FocusStatus.COMPLETED
        ? FocusStatus.WAITING
        : row.status,

      startedAt: row.startedAt.toISOString(),
      lastStudiedAt: row.lastStudiedAt?.toISOString() ?? null,
      endedAt: row.endedAt?.toISOString() ?? null,
      segmentStartedAt: row.segmentStartedAt?.toISOString() ?? null,
      checkpointAt: row.checkpointAt?.toISOString() ?? null,

      accumulatedSeconds: row.accumulatedSeconds,
      elapsedSeconds,
      durationMinutes: Math.floor(elapsedSeconds / 60),

      trackerEntryId: row.studyEntry?.id ?? null,
      serverNow: now.toISOString(),
    };
  }

  // If 3 hours expired, atomically cap the timer.
    private async pauseIfDue(
    id: string,
    sendNotification = true,
    ) {
    const row = await this.prisma.focusSession.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        checkpointAt: true,
      },
    });

    

    if (
      !row ||
      row.status !== FocusStatus.RUNNING ||
      !row.checkpointAt ||
      row.checkpointAt > new Date()
    ) {
      return;
    }

    const changed = await this.prisma.focusSession.updateMany({
      where: {
        id,
        status: FocusStatus.RUNNING,
        checkpointAt: {
          lte: new Date(),
        },
      },
      data: {
        status: FocusStatus.WAITING,
        segmentStartedAt: null,
        accumulatedSeconds: {
          increment: MAX_SEGMENT_SECONDS,
        },
        lastStudiedAt: row.checkpointAt,
      },
    });

    // Only the process that changed status sends the push.
  
    if (changed.count === 1 && sendNotification) {
    await this.push.notifyCheckpoint(row.userId, id);
    }

  }

  // Background checker every 15 seconds.
  @Interval(15000)
  async checkExpiredSessions() {
    const due = await this.prisma.focusSession.findMany({
      where: {
        status: FocusStatus.RUNNING,
        checkpointAt: { lte: new Date() },
      },
      select: { id: true },
      take: 100,
    });

    for (const row of due) {
      await this.pauseIfDue(row.id);
    }
  }

  // GET /focus/active
  async active(userId: string) {
    const current = await this.prisma.focusSession.findFirst({
      where: {
        userId,
        status: {
          in: [FocusStatus.RUNNING, FocusStatus.WAITING],
        },
      },
      select: { id: true },
    });

    if (!current) {
      return { message: 'সক্রিয় Focus নেই', data: null };
    }

    await this.pauseIfDue(current.id);

    return {
      message: 'Focus Session',
      data: this.present(await this.getRow(current.id)),
    };
  }

  // POST /focus/start
  
    async start(
    userId: string,
    subjectId: string,
    chapter?: string,
    ) { 
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { academicConfigured: true },
    });

    if (!user?.academicConfigured) {
      throw new ForbiddenException(
        'আগে Profile থেকে Class ও Group নির্বাচন করো',
      );
    }

    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        userId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!subject) {
      throw new BadRequestException(
        'একটি সক্রিয় বিষয় নির্বাচন করো',
      );
    }

    const now = new Date();

    try {
      const created = await this.prisma.focusSession.create({
        data: {
          userId,
          subjectId,
          status: FocusStatus.RUNNING,
          startedAt: now,
          segmentStartedAt: now,
          checkpointAt: new Date(
            now.getTime() + MAX_SEGMENT_MS,
          ),

          chapter: chapter?.trim() || null,

        },
        select: { id: true },
      });

      return {
        message: 'Focus শুরু হয়েছে! 📚',
        data: this.present(await this.getRow(created.id)),
      };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException(
          'আগে থেকেই একটি Focus Session চলছে',
        );
      }

      throw error;
    }
  }

  // POST /focus/:id/continue
  async continueFocus(userId: string, id: string) {
    await this.pauseIfDue(id);

    const now = new Date();

    const result = await this.prisma.focusSession.updateMany({
      where: {
        id,
        userId,
        status: FocusStatus.WAITING,
      },
      data: {
        status: FocusStatus.RUNNING,
        segmentStartedAt: now,
        checkpointAt: new Date(
          now.getTime() + MAX_SEGMENT_MS,
        ),
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'এই Session এখন Continue করার অবস্থায় নেই',
      );
    }

    return {
      message: 'আবার Focus শুরু হয়েছে! 🌟',
      data: this.present(await this.getRow(id)),
    };
  }

  // POST /focus/:id/stop
  async stop(userId: string, id: string) {
    await this.pauseIfDue(id, false);

    const row = await this.getRow(id);

    if (row.userId !== userId) {
      throw new ForbiddenException('এটি তোমার Session নয়');
    }

    // Repeated stop never creates another tracker entry.
    if (row.status === FocusStatus.COMPLETED) {
      return {
        message: 'এই Focus Session আগে শেষ হয়েছে',
        data: this.present(row),
      };
    }

    const now = new Date();
    const totalSeconds = this.secondsFor(row, now);

    let actualEnd = now;

    if (
      row.status === FocusStatus.RUNNING &&
      row.checkpointAt
    ) {
      actualEnd = new Date(
        Math.min(now.getTime(), row.checkpointAt.getTime()),
      );
    } else if (row.status === FocusStatus.WAITING) {
      actualEnd = row.lastStudiedAt ?? row.startedAt;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const shouldCreateEntry = minutes >= 1;

    await this.prisma.$transaction(async (tx) => {
      // Exactly one request can complete this session.
      const claim = await tx.focusSession.updateMany({
        where: {
          id,
          userId,
          status: row.status,
        },
        data: {
          status: FocusStatus.COMPLETED,
          accumulatedSeconds: totalSeconds,
          segmentStartedAt: null,
          lastStudiedAt: actualEnd,
          endedAt: actualEnd,
        },
      });

      if (claim.count !== 1) {
        throw new ConflictException(
          'Session ইতোমধ্যে পরিবর্তন হয়েছে, Reload করো',
        );
      }

      // Less than 1 minute: kept in Focus History,
      // but not counted as a full study minute.
      if (!shouldCreateEntry) return;

      await tx.studyEntry.create({
        data: {
          userId,
          subjectId: row.subjectId,
          focusSessionId: id,
          date: DateUtil.toDateOnly(actualEnd),
          durationMinutes: minutes,
          mood: StudyMood.NEUTRAL,
          note: '🎯 Focus Mode থেকে স্বয়ংক্রিয়ভাবে যোগ হয়েছে',

         chapter: row.chapter,

        },
      });

      const xpToAdd = LevelUtil.xpForStudyMinutes(minutes);

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          xp: { increment: xpToAdd },
        },
        select: { xp: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          level: LevelUtil.levelFromXp(updatedUser.xp),
        },
      });
    });

    if (shouldCreateEntry) {
      // Post-commit streak, badges and cache invalidation.
      // Do not fail/duplicate the completed session if these fail.
      try {
        await this.studyEntries.afterFocusCommit(
          userId,
          DateUtil.toDateOnly(actualEnd),
        );
      } catch (error) {
        console.error('Focus post-commit sync failed', error);
      }
    }

    return {
      message: shouldCreateEntry
        ? 'Focus শেষ! Tracker-এ স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়েছে 🎉'
        : 'Focus শেষ! ১ মিনিটের কম হওয়ায় Tracker-এ যোগ হয়নি',
      data: this.present(await this.getRow(id)),
    };
  }

  // GET /focus/history
  async history(userId: string) {
    const rows = await this.prisma.focusSession.findMany({
      where: {
        userId,
        status: FocusStatus.COMPLETED,
      },
      orderBy: { startedAt: 'desc' },
      take: 30,
      include: {
        subject: true,
        studyEntry: true,
      },
    });

    return {
      message: 'Focus History',
      data: rows.map((row) => this.present(row)),
    };
  }
}
