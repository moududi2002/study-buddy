// ============================================================
// Path: apps/api/src/subjects/subjects.service.ts
// ============================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MESSAGES } from '../common/messages';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------
  // GET /subjects
  // ----------------------------------------------------------
  async list(userId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { userId },
      orderBy: [{ isCustom: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isCustom: true,
        createdAt: true,
      },
    });

    return {
      message: MESSAGES.SUCCESS,
      data: subjects.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  // ----------------------------------------------------------
  // POST /subjects
  // ----------------------------------------------------------
  async create(userId: string, dto: CreateSubjectDto) {
    const name = dto.name.trim();

    const existing = await this.prisma.subject.findFirst({
      where: { userId, name },
      select: { id: true },
    });
    if (existing) throw new ConflictException(MESSAGES.SUBJECT_ALREADY_EXISTS);

    const subject = await this.prisma.subject.create({
      data: {
        userId,
        name,
        color: dto.color,
        icon: dto.icon,
        isCustom: true,
      },
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isCustom: true,
        createdAt: true,
      },
    });

    return {
      message: MESSAGES.SUBJECT_CREATED,
      data: { ...subject, createdAt: subject.createdAt.toISOString() },
    };
  }

  // ----------------------------------------------------------
  // PATCH /subjects/:id
  // ----------------------------------------------------------
  async update(userId: string, id: string, dto: UpdateSubjectDto) {
    const subject = await this.ensureOwned(userId, id);

    // Default subjects cannot be renamed (only color/icon can be changed)
    if (!subject.isCustom && dto.name) {
      throw new ForbiddenException('ডিফল্ট বিষয়ের নাম পরিবর্তন করা যাবে না');
    }

    const data: Record<string, any> = {};
    if (dto.name) data.name = dto.name.trim();
    if (dto.color) data.color = dto.color;
    if (dto.icon) data.icon = dto.icon;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('পরিবর্তনের জন্য কোনো তথ্য দেওয়া হয়নি');
    }

    // Name collision check
    if (data.name) {
      const collision = await this.prisma.subject.findFirst({
        where: { userId, name: data.name, NOT: { id } },
        select: { id: true },
      });
      if (collision) throw new ConflictException(MESSAGES.SUBJECT_ALREADY_EXISTS);
    }

    const updated = await this.prisma.subject.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        color: true,
        icon: true,
        isCustom: true,
        createdAt: true,
      },
    });

    return {
      message: MESSAGES.SUBJECT_UPDATED,
      data: { ...updated, createdAt: updated.createdAt.toISOString() },
    };
  }

  // ----------------------------------------------------------
  // DELETE /subjects/:id
  // ----------------------------------------------------------
  async remove(userId: string, id: string) {
    const subject = await this.ensureOwned(userId, id);

    if (!subject.isCustom) {
      throw new ForbiddenException(MESSAGES.CANNOT_DELETE_DEFAULT_SUBJECT);
    }

    // Check if any study entries exist — prevent orphan data
    const entryCount = await this.prisma.studyEntry.count({
      where: { subjectId: id },
    });
    if (entryCount > 0) {
      throw new BadRequestException(
        `এই বিষয়ে ${entryCount}টি এন্ট্রি আছে, আগে সেগুলো মুছুন`,
      );
    }

    await this.prisma.subject.delete({ where: { id } });

    return { message: MESSAGES.SUBJECT_DELETED, data: null };
  }

  // ----------------------------------------------------------
  // HELPER
  // ----------------------------------------------------------
  private async ensureOwned(userId: string, id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      select: { id: true, userId: true, isCustom: true },
    });
    if (!subject) throw new NotFoundException(MESSAGES.SUBJECT_NOT_FOUND);
    if (subject.userId !== userId) {
      throw new ForbiddenException(MESSAGES.FORBIDDEN);
    }
    return subject;
  }
}