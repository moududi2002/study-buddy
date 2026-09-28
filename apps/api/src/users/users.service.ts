// ============================================================
// Path: apps/api/src/users/users.service.ts
// ============================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { MESSAGES } from '../common/messages';
import { DateUtil, LevelUtil } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { SelectAvatarDto } from './dto/select-avatar.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ----------------------------------------------------------
  // GET /users/me
  // ----------------------------------------------------------
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        classLevel: true,
        avatarUrl: true,
        role: true,
        xp: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        lastStudyDate: true,
        isEmailVerified: true,
        googleId: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException(MESSAGES.USER_NOT_FOUND);

    const { remaining } = LevelUtil.xpToNextLevel(user.xp);

    return {
      message: MESSAGES.SUCCESS,
      data: {
        ...user,
        lastStudyDate: user.lastStudyDate
          ? DateUtil.toISODate(user.lastStudyDate)
          : null,
        createdAt: user.createdAt.toISOString(),
        xpToNextLevel: remaining,
        hasGoogleLinked: !!user.googleId,
      },
    };
  }

  // ----------------------------------------------------------
  // PATCH /users/me
  // ----------------------------------------------------------
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.ensureUser(userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        classLevel: dto.classLevel,
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        classLevel: true,
        avatarUrl: true,
        role: true,
        xp: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    return {
      message: MESSAGES.PROFILE_UPDATED,
      data: { ...updated, createdAt: updated.createdAt.toISOString() },
    };
  }

  // ----------------------------------------------------------
  // POST /users/me/avatar  (multipart upload)
  // ----------------------------------------------------------
  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ) {
    await this.ensureUser(userId);

    if (!file) throw new BadRequestException('ছবি আপলোড করা হয়নি');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('শুধু JPG, PNG অথবা WEBP ছবি ব্যবহার করা যাবে');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('ছবির আকার সর্বোচ্চ ২ মেগাবাইট');
    }

    const ext =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';

    const uploadDir = join(process.cwd(), 'uploads', 'avatars');
    await fs.mkdir(uploadDir, { recursive: true });

    const filename = `${userId}-${Date.now()}.${ext}`;
    const filepath = join(uploadDir, filename);

    await fs.writeFile(filepath, file.buffer);

    // Delete previous avatar if it was an uploaded one
    await this.deleteOldUploadedAvatar(userId);

    const publicPath = `/uploads/avatars/${filename}`;
    const apiPublicUrl = this.config.get<string>('API_PUBLIC_URL', '').replace(/\/$/, '');
    const fullUrl = apiPublicUrl ? `${apiPublicUrl}${publicPath}` : publicPath;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: fullUrl },
      select: { id: true, avatarUrl: true },
    });

    return {
      message: 'প্রোফাইল ছবি আপডেট হয়েছে',
      data: updated,
    };
  }

  // ----------------------------------------------------------
  // POST /users/me/avatar/preset
  // ----------------------------------------------------------
  async selectPresetAvatar(userId: string, dto: SelectAvatarDto) {
    await this.ensureUser(userId);
    await this.deleteOldUploadedAvatar(userId);

    const url = `preset:${dto.preset}`;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
      select: { id: true, avatarUrl: true },
    });

    return { message: 'অ্যাভাটার নির্বাচন হয়েছে', data: updated };
  }

  // ----------------------------------------------------------
  // DELETE /users/me/avatar
  // ----------------------------------------------------------
  async removeAvatar(userId: string) {
    await this.ensureUser(userId);
    await this.deleteOldUploadedAvatar(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return { message: 'অ্যাভাটার মুছে ফেলা হয়েছে', data: null };
  }

  // ----------------------------------------------------------
  // GET /users/me/stats
  // ----------------------------------------------------------
  async getStats(userId: string) {
    await this.ensureUser(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        lastStudyDate: true,
      },
    });
    if (!user) throw new NotFoundException(MESSAGES.USER_NOT_FOUND);

    // Total study minutes
    const totalAgg = await this.prisma.studyEntry.aggregate({
      where: { userId },
      _sum: { durationMinutes: true },
      _count: { _all: true },
    });

    // Last 7 days
    const today = DateUtil.startOfDay();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const weekAgg = await this.prisma.studyEntry.aggregate({
      where: { userId, date: { gte: sevenDaysAgo, lte: today } },
      _sum: { durationMinutes: true },
    });

    // Badges earned
    const badgeCount = await this.prisma.userBadge.count({ where: { userId } });

    // Subject count
    const subjectCount = await this.prisma.subject.count({ where: { userId } });

    // Active goals
    const activeGoals = await this.prisma.goal.count({
      where: { userId, isCompleted: false },
    });

    const { remaining, next } = LevelUtil.xpToNextLevel(user.xp);

    return {
      message: MESSAGES.SUCCESS,
      data: {
        xp: user.xp,
        level: user.level,
        xpToNextLevel: remaining,
        xpForNextLevel: next,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        lastStudyDate: user.lastStudyDate
          ? DateUtil.toISODate(user.lastStudyDate)
          : null,
        totalStudyMinutes: totalAgg._sum.durationMinutes ?? 0,
        totalEntries: totalAgg._count._all,
        weekStudyMinutes: weekAgg._sum.durationMinutes ?? 0,
        badgeCount,
        subjectCount,
        activeGoals,
      },
    };
  }

  // ----------------------------------------------------------
  // DELETE /users/me  (soft delete — deactivate account)
  // ----------------------------------------------------------
  async deactivate(userId: string) {
    await this.ensureUser(userId);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে', data: null };
  }

  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------
  private async ensureUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new NotFoundException(MESSAGES.USER_NOT_FOUND);
    }
  }

  private async deleteOldUploadedAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    const url = user?.avatarUrl;
    if (!url) return;
    if (!url.startsWith('/uploads/avatars/') && !url.includes('/uploads/avatars/')) {
      return; // preset or external — nothing to delete
    }
    const marker = '/uploads/avatars/';
    const idx = url.indexOf(marker);
    const filename = url.slice(idx + marker.length);
    if (!filename) return;

    const filepath = join(process.cwd(), 'uploads', 'avatars', filename);
    try {
      await fs.unlink(filepath);
    } catch {
      // ignore missing file
    }
  }
}