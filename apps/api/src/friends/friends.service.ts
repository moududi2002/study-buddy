// ============================================================
// Path: apps/api/src/friends/friends.service.ts
// ============================================================


import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Friendship,
  FriendshipStatus,
} from '../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SearchFriendsDto } from './dto';

type Relationship =
  | 'NONE'
  | 'OUTGOING'
  | 'INCOMING'
  | 'FRIENDS';

const publicUser = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  classLevel: true,
} as const;

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private pair(a: string, b: string) {
    return a < b
      ? { userLowId: a, userHighId: b }
      : { userLowId: b, userHighId: a };
  }

  private async getRelation(a: string, b: string) {
    const pair = this.pair(a, b);

    return this.prisma.friendship.findUnique({
      where: {
        userLowId_userHighId: pair,
      },
    });
  }

  private relationship(
    row: Friendship | null,
    currentUserId: string,
  ): Relationship {
    if (!row || row.status === FriendshipStatus.DECLINED) {
      return 'NONE';
    }

    if (row.status === FriendshipStatus.ACCEPTED) {
      return 'FRIENDS';
    }

    return row.requestedById === currentUserId
      ? 'OUTGOING'
      : 'INCOMING';
  }

  async search(userId: string, dto: SearchFriendsDto) {
    const q = dto.q.trim();

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { equals: q.toLowerCase() } },
        ],
      },
      select: publicUser,
      take: dto.limit ?? 20,
      orderBy: { username: 'asc' },
    });

    const data = await Promise.all(
      users.map(async (other) => {
        const relation = await this.getRelation(
          userId,
          other.id,
        );

        return {
          ...other,
          relationship: this.relationship(relation, userId),
          requestId:
            relation?.status === FriendshipStatus.PENDING
              ? relation.id
              : null,
        };
      }),
    );

    return { message: 'সফল', data };
  }

  async profile(userId: string, targetId: string) {
    const target = await this.prisma.user.findFirst({
      where: {
        id: targetId,
        isActive: true,
      },
      select: publicUser,
    });

    if (!target) {
      throw new NotFoundException('ব্যবহারকারী পাওয়া যায়নি');
    }

    if (userId === targetId) {
      return {
        message: 'সফল',
        data: {
          ...target,
          relationship: 'SELF' as const,
          requestId: null,
        },
      };
    }

    const relation = await this.getRelation(userId, targetId);

    return {
      message: 'সফল',
      data: {
        ...target,
        relationship: this.relationship(relation, userId),
        requestId:
          relation?.status === FriendshipStatus.PENDING
            ? relation.id
            : null,
      },
    };
  }

  async connections(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userLowId: userId },
          { userHighId: userId },
        ],
        status: {
          in: [
            FriendshipStatus.PENDING,
            FriendshipStatus.ACCEPTED,
          ],
        },
      },
      include: {
        userLow: { select: publicUser },
        userHigh: { select: publicUser },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      message: 'সফল',
      data: rows.map((row) => {
        const other =
          row.userLowId === userId
            ? row.userHigh
            : row.userLow;

        return {
          ...other,
          relationship: this.relationship(row, userId),
          requestId:
            row.status === FriendshipStatus.PENDING
              ? row.id
              : null,
        };
      }),
    };
  }

  async request(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new BadRequestException(
        'নিজেকে Friend Request পাঠানো যাবে না',
      );
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetId, isActive: true },
      select: { id: true },
    });

    if (!target) {
      throw new NotFoundException('ব্যবহারকারী পাওয়া যায়নি');
    }

    const pair = this.pair(userId, targetId);
    const existing = await this.getRelation(userId, targetId);

    if (existing?.status === FriendshipStatus.ACCEPTED) {
      throw new ConflictException('তোমরা ইতোমধ্যে বন্ধু');
    }

    if (existing?.status === FriendshipStatus.PENDING) {
      throw new ConflictException(
        'এই Friend Request ইতোমধ্যে পাঠানো হয়েছে',
      );
    }

    const created = await this.prisma.friendship.upsert({
      where: {
        userLowId_userHighId: pair,
      },
      create: {
        ...pair,
        requestedById: userId,
        status: FriendshipStatus.PENDING,
      },
      update: {
        requestedById: userId,
        status: FriendshipStatus.PENDING,
      },
    });

    return {
      message: 'Friend Request পাঠানো হয়েছে',
      data: { id: created.id },
    };
  }

  async respond(
    userId: string,
    requestId: string,
    accept: boolean,
  ) {
    if (typeof accept !== 'boolean') {
      throw new BadRequestException(
        'accept অবশ্যই true অথবা false হতে হবে',
      );
    }

    const row = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (
      !row ||
      row.status !== FriendshipStatus.PENDING
    ) {
      throw new NotFoundException(
        'সক্রিয় Friend Request পাওয়া যায়নি',
      );
    }

    const recipientId =
      row.requestedById === row.userLowId
        ? row.userHighId
        : row.userLowId;

    if (recipientId !== userId) {
      throw new ForbiddenException(
        'এই Friend Request গ্রহণের অনুমতি নেই',
      );
    }

    const updated = await this.prisma.friendship.updateMany({
      where: {
        id: requestId,
        status: FriendshipStatus.PENDING,
      },
      data: {
        status: accept
          ? FriendshipStatus.ACCEPTED
          : FriendshipStatus.DECLINED,
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'Friend Request ইতোমধ্যে পরিবর্তন হয়েছে',
      );
    }

    return {
      message: accept
        ? 'এখন তোমরা বন্ধু! 💜'
        : 'Friend Request বাতিল হয়েছে',
      data: null,
    };
  }

  async remove(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new BadRequestException('ভুল ব্যবহারকারী');
    }

    const pair = this.pair(userId, targetId);

    const removed = await this.prisma.friendship.deleteMany({
      where: pair,
    });

    if (removed.count === 0) {
      throw new NotFoundException(
        'কোনো Friend Connection পাওয়া যায়নি',
      );
    }

    return {
      message: 'Friend Connection সরানো হয়েছে',
      data: null,
    };
  }
}
