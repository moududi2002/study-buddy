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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        academicConfigured: true,
      },
    });

    // Existing users must complete academic setup first.
    if (!user?.academicConfigured) {
      return {
        message: MESSAGES.SUCCESS,
        data: [],
      };
    }

    const subjects = await this.prisma.subject.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: [
        { isCustom: 'asc' },
        { name: 'asc' },
      ],
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
      data: subjects.map((subject) => ({
        ...subject,
        createdAt: subject.createdAt.toISOString(),
      })),
    };
  }


  // ----------------------------------------------------------
  // POST /subjects
  // ----------------------------------------------------------
  async create(userId: string, dto: CreateSubjectDto) {


  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { academicConfigured: true },
  });

  if (!user?.academicConfigured) {
    throw new ForbiddenException(
      'আগে প্রোফাইল থেকে ক্লাস ও বিভাগ নির্বাচন করো',
    );
  }

    const name = dto.name.trim();

    
  async create(userId: string, dto: CreateSubjectDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { academicConfigured: true },
    });

    if (!user?.academicConfigured) {
      throw new ForbiddenException(
        'আগে প্রোফাইলে ক্লাস ও বিভাগ নির্বাচন করো',
      );
    }

    const name = dto.name
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ');

    if (name.length < 2 || name.length > 40) {
      throw new BadRequestException(
        'বিষয়ের নাম ২ থেকে ৪০ অক্ষরের হতে হবে',
      );
    }

    const existing = await this.prisma.subject.findUnique({
      where: {
        userId_name: { userId, name },
      },
    });

    if (existing?.isActive) {
      throw new ConflictException(
        MESSAGES.SUBJECT_ALREADY_EXISTS,
      );
    }

    const select = {
      id: true,
      name: true,
      color: true,
      icon: true,
      isCustom: true,
      createdAt: true,
    } as const;

    const subject = existing
      ? await this.prisma.subject.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            color: dto.color,
            icon: dto.icon,
          },
          select,
        })
      : await this.prisma.subject.create({
          data: {
            userId,
            name,
            color: dto.color,
            icon: dto.icon,
            isCustom: true,
            isActive: true,
          },
          select,
        });

    return {
      message: existing
        ? 'পুরোনো বিষয়টি আবার সক্রিয় হয়েছে'
        : MESSAGES.SUBJECT_CREATED,
      data: {
        ...subject,
        createdAt: subject.createdAt.toISOString(),
      },
    };
  }


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
        throw new ForbiddenException(
          MESSAGES.CANNOT_DELETE_DEFAULT_SUBJECT,
        );
      }

      await this.prisma.subject.update({
        where: { id },
        data: {
          isActive: false,
        },
      });

      return {
        message: 'বিষয়টি তালিকা থেকে সরানো হয়েছে। পুরোনো পড়ার তথ্য সংরক্ষিত আছে।',
        data: null,
      };
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