// ============================================================
// Path: apps/api/src/notifications/notifications.service.ts
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType } from '../generated/prisma/client';
import { MESSAGES } from '../common/messages';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { QueryNotificationsDto } from './dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ----------------------------------------------------------
  // Create a notification (single)
  // ----------------------------------------------------------
  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data ?? undefined,
      },
    });

    await this.invalidateUnreadCache(params.userId);
    return notification;
  }

  // ----------------------------------------------------------
  // Create notifications for many users at once
  // ----------------------------------------------------------
  async createMany(
    userIds: string[],
    payload: {
      type: NotificationType;
      title: string;
      body: string;
      data?: Record<string, any>;
    },
  ) {
    if (userIds.length === 0) return;
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? undefined,
      })),
    });
    await Promise.all(userIds.map((id) => this.invalidateUnreadCache(id)));
  }

  // ----------------------------------------------------------
  // GET /notifications — paginated list
  // ----------------------------------------------------------
  async list(userId: string, query: QueryNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: any = { userId };
    if (query.unreadOnly) where.isRead = false;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      message: MESSAGES.SUCCESS,
      data: {
        items: items.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          data: n.data,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  // ----------------------------------------------------------
  // GET /notifications/unread-count — cached
  // ----------------------------------------------------------
  async unreadCount(userId: string) {
    const cacheKey = `notif:unread:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return {
        message: MESSAGES.SUCCESS,
        data: { count: parseInt(cached, 10) },
      };
    }

    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    // Cache for 60 seconds
    await this.redis.set(cacheKey, count.toString(), 60);

    return {
      message: MESSAGES.SUCCESS,
      data: { count },
    };
  }

  // ----------------------------------------------------------
  // POST /notifications/:id/read
  // ----------------------------------------------------------
  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true, isRead: true },
    });
    if (!notification) throw new NotFoundException('নোটিফিকেশন খুঁজে পাওয়া যায়নি');
    if (notification.userId !== userId) {
      throw new NotFoundException('নোটিফিকেশন খুঁজে পাওয়া যায়নি');
    }
    if (notification.isRead) {
      return { message: MESSAGES.SUCCESS, data: null };
    }

    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    await this.invalidateUnreadCache(userId);

    return { message: 'পঠিত হিসেবে চিহ্নিত হয়েছে', data: null };
  }

  // ----------------------------------------------------------
  // POST /notifications/read-all
  // ----------------------------------------------------------
  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    await this.invalidateUnreadCache(userId);

    return {
      message: 'সব নোটিফিকেশন পঠিত করা হয়েছে',
      data: { updated: result.count },
    };
  }

  // ----------------------------------------------------------
  // DELETE /notifications/:id
  // ----------------------------------------------------------
  async remove(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true, isRead: true },
    });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('নোটিফিকেশন খুঁজে পাওয়া যায়নি');
    }

    await this.prisma.notification.delete({ where: { id } });
    if (!notification.isRead) {
      await this.invalidateUnreadCache(userId);
    }

    return { message: 'নোটিফিকেশন মুছে ফেলা হয়েছে', data: null };
  }

  // ----------------------------------------------------------
  // DELETE /notifications/clear — clear all read
  // ----------------------------------------------------------
  async clearRead(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });
    return {
      message: 'পঠিত নোটিফিকেশনগুলো মুছে ফেলা হয়েছে',
      data: { deleted: result.count },
    };
  }

  // ----------------------------------------------------------
  // Helper — invalidate unread count cache
  // ----------------------------------------------------------
  private async invalidateUnreadCache(userId: string) {
    await this.redis.del(`notif:unread:${userId}`);
  }
}