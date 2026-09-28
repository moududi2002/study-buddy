// ============================================================
// Path: apps/api/src/study-entries/study-entries.service.ts
// ============================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MESSAGES } from '../common/messages';
import { DateUtil, LevelUtil } from '../common/utils';
import { GamificationService } from '../gamification/gamification.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  CreateStudyEntryDto,
  QueryStudyEntryDto,
  UpdateStudyEntryDto,
} from './dto';

@Injectable()
export class StudyEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly gamification: GamificationService,
  ) {}

  // ----------------------------------------------------------
  // POST /study-entries
  // ----------------------------------------------------------
  async create(userId: string, dto: CreateStudyEntryDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
      select: { id: true, userId: true },
    });
    if (!subject) throw new NotFoundException(MESSAGES.SUBJECT_NOT_FOUND);
    if (subject.userId !== userId) throw new ForbiddenException(MESSAGES.FORBIDDEN);

    const entryDate = new Date(dto.date);
    if (entryDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      throw new BadRequestException('ভবিষ্যতের তারিখে এন্ট্রি করা যাবে না');
    }

    const dateOnly = DateUtil.toDateOnly(entryDate);

    const entry = await this.prisma.studyEntry.create({
      data: {
        userId,
        subjectId: dto.subjectId,
        date: dateOnly,
        durationMinutes: dto.durationMinutes,
        chapter: dto.chapter?.trim() || null,
        note: dto.note?.trim() || null,
        mood: dto.mood,
      },
      include: {
        subject: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
    });

    // Award XP
    const xpGained = LevelUtil.xpForStudyMinutes(dto.durationMinutes);
    await this.gamification.awardXp(userId, xpGained);

    // Streak update
    await this.updateStreak(userId, dateOnly);

    // Badge check
    await this.gamification.checkAndGrantBadges(userId);

    // Invalidate today's cache
    await this.invalidateCache(userId, dateOnly);

    return {
      message: MESSAGES.STUDY_ENTRY_CREATED,
      data: {
        ...this.serialize(entry),
        xpGained,
      },
    };
  }

  // ----------------------------------------------------------
  // GET /study-entries
  // ----------------------------------------------------------
  async list(userId: string, query: QueryStudyEntryDto) {
    const where: any = { userId };

    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = DateUtil.toDateOnly(new Date(query.from));
      if (query.to) where.date.lte = DateUtil.toDateOnly(new Date(query.to));
    }
    if (query.subjectId) where.subjectId = query.subjectId;

    const entries = await this.prisma.studyEntry.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: {
        subject: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
      take: 500,
    });

    return {
      message: MESSAGES.SUCCESS,
      data: entries.map((e) => this.serialize(e)),
    };
  }

  // ----------------------------------------------------------
  // GET /study-entries/today
  // ----------------------------------------------------------
  async today(userId: string) {
    const today = DateUtil.toDateOnly(new Date());
    const cacheKey = `study:today:${userId}:${DateUtil.toISODate(today)}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { message: MESSAGES.SUCCESS, data: JSON.parse(cached) };
    }

    const entries = await this.prisma.studyEntry.findMany({
      where: { userId, date: today },
      orderBy: { createdAt: 'desc' },
      include: {
        subject: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
    });

    const totalMinutes = entries.reduce((s, e) => s + e.durationMinutes, 0);
    const distinctSubjects = new Set(entries.map((e) => e.subjectId)).size;

    const payload = {
      date: DateUtil.toISODate(today),
      totalMinutes,
      totalEntries: entries.length,
      distinctSubjects,
      entries: entries.map((e) => this.serialize(e)),
    };

    // Cache for 5 minutes (invalidated on new entry)
    await this.redis.set(cacheKey, JSON.stringify(payload), 300);

    return { message: MESSAGES.SUCCESS, data: payload };
  }

  // ----------------------------------------------------------
  // GET /study-entries/:id
  // ----------------------------------------------------------
  async findOne(userId: string, id: string) {
    const entry = await this.prisma.studyEntry.findUnique({
      where: { id },
      include: {
        subject: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
    });
    if (!entry) throw new NotFoundException(MESSAGES.STUDY_ENTRY_NOT_FOUND);
    if (entry.userId !== userId) throw new ForbiddenException(MESSAGES.FORBIDDEN);

    return { message: MESSAGES.SUCCESS, data: this.serialize(entry) };
  }

  // ----------------------------------------------------------
  // PATCH /study-entries/:id
  // ----------------------------------------------------------
  async update(userId: string, id: string, dto: UpdateStudyEntryDto) {
    const entry = await this.prisma.studyEntry.findUnique({
      where: { id },
      select: { id: true, userId: true, date: true },
    });
    if (!entry) throw new NotFoundException(MESSAGES.STUDY_ENTRY_NOT_FOUND);
    if (entry.userId !== userId) throw new ForbiddenException(MESSAGES.FORBIDDEN);

    const data: any = {};
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes;
    if (dto.chapter !== undefined) data.chapter = dto.chapter?.trim() || null;
    if (dto.note !== undefined) data.note = dto.note?.trim() || null;
    if (dto.mood !== undefined) data.mood = dto.mood;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('পরিবর্তনের জন্য কোনো তথ্য দেওয়া হয়নি');
    }

    const updated = await this.prisma.studyEntry.update({
      where: { id },
      data,
      include: {
        subject: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
    });

    await this.invalidateCache(userId, entry.date);

    return {
      message: MESSAGES.STUDY_ENTRY_UPDATED,
      data: this.serialize(updated),
    };
  }

  // ----------------------------------------------------------
  // DELETE /study-entries/:id
  // ----------------------------------------------------------
  async remove(userId: string, id: string) {
    const entry = await this.prisma.studyEntry.findUnique({
      where: { id },
      select: { id: true, userId: true, date: true },
    });
    if (!entry) throw new NotFoundException(MESSAGES.STUDY_ENTRY_NOT_FOUND);
    if (entry.userId !== userId) throw new ForbiddenException(MESSAGES.FORBIDDEN);

    await this.prisma.studyEntry.delete({ where: { id } });
    await this.invalidateCache(userId, entry.date);

    return { message: MESSAGES.STUDY_ENTRY_DELETED, data: null };
  }

  // ----------------------------------------------------------
  // STREAK LOGIC
  // ----------------------------------------------------------
  private async updateStreak(userId: string, entryDate: Date) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true, lastStudyDate: true },
    });
    if (!user) return;

    const today = DateUtil.toDateOnly(new Date());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // If entry is not today or yesterday, don't touch streak
    if (
      entryDate.getTime() !== today.getTime() &&
      entryDate.getTime() !== yesterday.getTime()
    ) {
      return;
    }

    const last = user.lastStudyDate ? new Date(user.lastStudyDate) : null;
    let newStreak = user.currentStreak;

    if (!last) {
      newStreak = 1;
    } else if (last.getTime() === today.getTime()) {
      // Already counted today, no change
      return;
    } else if (last.getTime() === yesterday.getTime()) {
      // Continuing streak
      newStreak = user.currentStreak + 1;
    } else {
      // Gap — restart
      newStreak = 1;
    }

    const longest = Math.max(user.longestStreak, newStreak);

    // Bonus XP for streak day
    const bonus = LevelUtil.xpForStreakDay(newStreak);
    await this.gamification.awardXp(userId, bonus);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: longest,
        lastStudyDate: today,
      },
    });
  }

  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------
  private async invalidateCache(userId: string, date: Date) {
    const key = `study:today:${userId}:${DateUtil.toISODate(date)}`;
    await this.redis.del(key);
  }

  private serialize(entry: any) {
    return {
      id: entry.id,
      subjectId: entry.subjectId,
      subject: entry.subject,
      date: DateUtil.toISODate(entry.date),
      durationMinutes: entry.durationMinutes,
      chapter: entry.chapter,
      note: entry.note,
      mood: entry.mood,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}