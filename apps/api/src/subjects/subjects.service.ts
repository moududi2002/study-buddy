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

import {
  CreateSubjectDto,
  UpdateSubjectDto,
} from './dto';

const SUBJECT_SELECT = {
  id: true,
  name: true,
  color: true,
  icon: true,
  isCustom: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // GET /subjects
  async list(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        academicConfigured: true,
      },
    });

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
      select: SUBJECT_SELECT,
    });

    return {
      message: MESSAGES.SUCCESS,
      data: subjects.map((subject) => ({
        ...subject,
        createdAt: subject.createdAt.toISOString(),
      })),
    };
  }

  // POST /subjects
  async create(
    userId: string,
    dto: CreateSubjectDto,
  ) {
    await this.ensureAcademicSetup(userId);

    const name = this.normalizeName(dto.name);

    const existing = await this.prisma.subject.findUnique({
      where: {
        userId_name: {
          userId,
          name,
        },
      },
    });

    if (existing?.isActive) {
      throw new ConflictException(
        MESSAGES.SUBJECT_ALREADY_EXISTS,
      );
    }

    const subject = existing
      ? await this.prisma.subject.update({
          where: {
            id: existing.id,
          },
          data: {
            isActive: true,
            color: dto.color,
            icon: dto.icon,
          },
          select: SUBJECT_SELECT,
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
          select: SUBJECT_SELECT,
        });

    return {
      message: existing
        ? 'বিষয়টি আবার সক্রিয় হয়েছে'
        : MESSAGES.SUBJECT_CREATED,
      data: {
        ...subject,
        createdAt: subject.createdAt.toISOString(),
      },
    };
  }

  // PATCH /subjects/:id
  async update(
    userId: string,
    id: string,
    dto: UpdateSubjectDto,
  ) {
    await this.ensureAcademicSetup(userId);

    const subject = await this.ensureOwned(userId, id);

    if (!subject.isActive) {
      throw new BadRequestException(
        'নিষ্ক্রিয় বিষয় পরিবর্তন করা যাবে না',
      );
    }

    if (
      !subject.isCustom &&
      dto.name !== undefined
    ) {
      throw new ForbiddenException(
        'ডিফল্ট বিষয়ের নাম পরিবর্তন করা যাবে না',
      );
    }

    const data: {
      name?: string;
      color?: string;
      icon?: string;
    } = {};

    if (dto.name !== undefined) {
      data.name = this.normalizeName(dto.name);
    }

    if (dto.color !== undefined) {
      data.color = dto.color;
    }

    if (dto.icon !== undefined) {
      data.icon = dto.icon;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'পরিবর্তনের জন্য কোনো তথ্য দেওয়া হয়নি',
      );
    }

    if (data.name && data.name !== subject.name) {
      const collision = await this.prisma.subject.findUnique({
        where: {
          userId_name: {
            userId,
            name: data.name,
          },
        },
        select: { id: true },
      });

      if (collision) {
        throw new ConflictException(
          MESSAGES.SUBJECT_ALREADY_EXISTS,
        );
      }
    }

    const updated = await this.prisma.subject.update({
      where: { id },
      data,
      select: SUBJECT_SELECT,
    });

    return {
      message: MESSAGES.SUBJECT_UPDATED,
      data: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
      },
    };
  }

  // DELETE /subjects/:id (soft delete)
  async remove(userId: string, id: string) {
    await this.ensureAcademicSetup(userId);

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
      message: 'বিষয়টি তালিকা থেকে সরানো হয়েছে',
      data: null,
    };
  }

  private normalizeName(value: string) {
    const name = value
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ');

    if (name.length < 2 || name.length > 40) {
      throw new BadRequestException(
        'বিষয়ের নাম ২ থেকে ৪০ অক্ষরের হতে হবে',
      );
    }

    return name;
  }

  private async ensureAcademicSetup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        academicConfigured: true,
      },
    });

    if (!user?.academicConfigured) {
      throw new ForbiddenException(
        'আগে প্রোফাইলে ক্লাস ও বিভাগ সেট করো',
      );
    }
  }

  private async ensureOwned(
    userId: string,
    id: string,
  ) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        name: true,
        isCustom: true,
        isActive: true,
      },
    });

    if (!subject) {
      throw new NotFoundException(
        MESSAGES.SUBJECT_NOT_FOUND,
      );
    }

    if (subject.userId !== userId) {
      throw new ForbiddenException(
        MESSAGES.FORBIDDEN,
      );
    }

    return subject;
  }
}
