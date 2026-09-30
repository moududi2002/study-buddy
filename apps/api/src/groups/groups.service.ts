// ============================================================
// Path: apps/api/src/groups/groups.service.ts
// ============================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupRole, InvitationStatus, NotificationType } from '../generated/prisma/client';
import { promises as fs } from 'fs';
import { join } from 'path';
import { MESSAGES } from '../common/messages';
import { DateUtil } from '../common/utils';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateGroupDto,
  InviteMemberDto,
  RespondInvitationDto,
  UpdateGroupDto,
  UpdateMemberRoleDto,
} from './dto';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB
const INVITATION_TTL_DAYS = 7;

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ----------------------------------------------------------
  // POST /groups — create
  // ----------------------------------------------------------
  async create(userId: string, dto: CreateGroupDto) {
    const group = await this.prisma.$transaction(async (tx) => {
      const g = await tx.group.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          ownerId: userId,
          weeklyTargetMinutes: dto.weeklyTargetMinutes ?? null,
          weeklyTargetChapters: dto.weeklyTargetChapters ?? null,
        },
      });

      // Owner as member with OWNER role
      await tx.groupMember.create({
        data: { groupId: g.id, userId, role: GroupRole.OWNER },
      });

      // Auto-create group conversation
      const conv = await tx.conversation.create({
        data: { groupId: g.id },
      });
      await tx.conversationParticipant.create({
        data: { conversationId: conv.id, userId },
      });

      return g;
    });

    return {
      message: 'গ্রুপ তৈরি হয়েছে! 🎉',
      data: await this.getDetail(userId, group.id),
    };
  }

  // ----------------------------------------------------------
  // GET /groups — my groups
  // ----------------------------------------------------------
  async listMine(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const groups = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      description: m.group.description,
      imageUrl: m.group.imageUrl,
      role: m.role,
      isMuted: m.isMuted,
      memberCount: m.group._count.members,
      weeklyTargetMinutes: m.group.weeklyTargetMinutes,
      joinedAt: m.joinedAt.toISOString(),
    }));

    return { message: MESSAGES.SUCCESS, data: groups };
  }

  // ----------------------------------------------------------
  // GET /groups/:id — full detail
  // ----------------------------------------------------------
  async getDetail(userId: string, groupId: string) {
    await this.ensureMember(userId, groupId);

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        owner: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatarUrl: true,
                classLevel: true,
                xp: true,
                level: true,
                currentStreak: true,
                longestStreak: true,
              },
            },
          },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        },
      },
    });
    if (!group) throw new NotFoundException('গ্রুপ খুঁজে পাওয়া যায়নি');

    const conv = await this.prisma.conversation.findUnique({
        where: { groupId },
        select: { id: true },
        });

    // Weekly summary for each member + group total
    const { start, end } = DateUtil.getWeekRange(new Date());
    const memberIds = group.members.map((m) => m.userId);

    const weeklyAgg = await this.prisma.studyEntry.groupBy({
      by: ['userId'],
      where: {
        userId: { in: memberIds },
        date: { gte: start, lte: end },
      },
      _sum: { durationMinutes: true },
      _count: { _all: true },
    });
    const weekMap = new Map(
      weeklyAgg.map((a) => [a.userId, a._sum.durationMinutes ?? 0]),
    );

    const badgeCounts = await this.prisma.userBadge.groupBy({
      by: ['userId'],
      where: { userId: { in: memberIds } },
      _count: { _all: true },
    });
    const badgeMap = new Map(badgeCounts.map((b) => [b.userId, b._count._all]));

    const members = group.members.map((m) => ({
      id: m.user.id,
      conversationId: conv?.id ?? null,
      username: m.user.username,
      fullName: m.user.fullName,
      avatarUrl: m.user.avatarUrl,
      classLevel: m.user.classLevel,
      role: m.role,
      isMuted: m.isMuted,
      joinedAt: m.joinedAt.toISOString(),
      xp: m.user.xp,
      level: m.user.level,
      currentStreak: m.user.currentStreak,
      longestStreak: m.user.longestStreak,
      weekMinutes: weekMap.get(m.userId) ?? 0,
      badgeCount: badgeMap.get(m.userId) ?? 0,
    }));

    const groupTotalMinutes = members.reduce((s, m) => s + m.weekMinutes, 0);
    const memberCount = members.length;
    const target = group.weeklyTargetMinutes ?? null;

    // Group leaderboard (this week) sorted by minutes desc, XP desc
    const leaderboard = [...members]
      .sort((a, b) => b.weekMinutes - a.weekMinutes || b.xp - a.xp)
      .map((m, idx) => ({ rank: idx + 1, ...m }));

    // Pending invitations (visible to owner/admin only)
    let invitations: any[] = [];
    const me = group.members.find((m) => m.userId === userId);
    if (me && (me.role === GroupRole.OWNER || me.role === GroupRole.ADMIN)) {
      const rows = await this.prisma.groupInvitation.findMany({
        where: { groupId, status: InvitationStatus.PENDING },
        include: {
          invitee: {
            select: { id: true, username: true, fullName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      invitations = rows.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        invitee: r.invitee,
      }));
    }

    return {
      message: MESSAGES.SUCCESS,
      data: {
        id: group.id,
        name: group.name,
        description: group.description,
        imageUrl: group.imageUrl,
        ownerId: group.ownerId,
        owner: group.owner,
        myRole: me?.role ?? null,
        isMuted: me?.isMuted ?? false,
        memberCount,
        weeklyTargetMinutes: target,
        weeklyTargetChapters: group.weeklyTargetChapters,
        weekStart: DateUtil.toISODate(start),
        weekEnd: DateUtil.toISODate(end),
        groupTotalMinutes,
        targetProgressPercent: target
          ? Math.min(100, Math.round((groupTotalMinutes / target) * 100))
          : 0,
        members,
        leaderboard,
        invitations,
        createdAt: group.createdAt.toISOString(),
      },
    };
  }

  // ----------------------------------------------------------
  // PATCH /groups/:id — update
  // ----------------------------------------------------------
  async update(userId: string, groupId: string, dto: UpdateGroupDto) {
    await this.ensureAdminOrOwner(userId, groupId);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.weeklyTargetMinutes !== undefined) data.weeklyTargetMinutes = dto.weeklyTargetMinutes;
    if (dto.weeklyTargetChapters !== undefined) data.weeklyTargetChapters = dto.weeklyTargetChapters;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('পরিবর্তনের জন্য কোনো তথ্য দেওয়া হয়নি');
    }

    await this.prisma.group.update({ where: { id: groupId }, data });
    return { message: 'গ্রুপ আপডেট হয়েছে', data: null };
  }

  // ----------------------------------------------------------
  // DELETE /groups/:id — delete (owner only)
  // ----------------------------------------------------------
  async remove(userId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, ownerId: true, name: true },
    });
    if (!group) throw new NotFoundException('গ্রুপ খুঁজে পাওয়া যায়নি');
    if (group.ownerId !== userId) throw new ForbiddenException('শুধু গ্রুপ মালিক মুছতে পারে');

    // Notify all members before deletion (best-effort)
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, userId: { not: userId } },
      select: { userId: true },
    });
    await this.notifications.createMany(
      members.map((m) => m.userId),
      {
        type: NotificationType.GROUP_LEFT,
        title: 'গ্রুপ মুছে ফেলা হয়েছে',
        body: `"${group.name}" গ্রুপটি মালিক মুছে ফেলেছেন।`,
        data: { groupId },
      },
    );

    await this.prisma.group.delete({ where: { id: groupId } });
    return { message: 'গ্রুপ মুছে ফেলা হয়েছে', data: null };
  }

  // ----------------------------------------------------------
  // POST /groups/:id/image — upload group image
  // ----------------------------------------------------------
  async uploadImage(userId: string, groupId: string, file: Express.Multer.File) {
    await this.ensureAdminOrOwner(userId, groupId);

    if (!file) throw new BadRequestException('ছবি আপলোড করা হয়নি');
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('শুধু JPG, PNG অথবা WEBP ছবি ব্যবহার করা যাবে');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('ছবির আকার সর্বোচ্চ ৩ মেগাবাইট');
    }

    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const dir = join(process.cwd(), 'uploads', 'groups');
    await fs.mkdir(dir, { recursive: true });

    const filename = `${groupId}-${Date.now()}.${ext}`;
    const filepath = join(dir, filename);
    await fs.writeFile(filepath, file.buffer);

    await this.deleteOldImage(groupId);

    const publicPath = `/uploads/groups/${filename}`;
    await this.prisma.group.update({
      where: { id: groupId },
      data: { imageUrl: publicPath },
    });

    return { message: 'গ্রুপের ছবি আপডেট হয়েছে', data: { imageUrl: publicPath } };
  }

  // ----------------------------------------------------------
  // POST /groups/:id/invite
  // ----------------------------------------------------------
  async invite(userId: string, groupId: string, dto: InviteMemberDto) {
    await this.ensureAdminOrOwner(userId, groupId);

    const identifier = dto.identifier.trim();
    const invitee = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier },
        ],
      },
      select: { id: true, username: true, fullName: true, isActive: true },
    });
    if (!invitee || !invitee.isActive) throw new NotFoundException('ব্যবহারকারী খুঁজে পাওয়া যায়নি');
    if (invitee.id === userId) throw new BadRequestException('নিজেকে ইনভাইট করা যাবে না');

    // Already a member?
    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: invitee.id } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('এই ব্যবহারকারী আগেই গ্রুপে আছে');

    // Pending invitation already exists?
    const pending = await this.prisma.groupInvitation.findFirst({
      where: { groupId, inviteeId: invitee.id, status: InvitationStatus.PENDING },
      select: { id: true },
    });
    if (pending) throw new ConflictException('এই ব্যবহারকারীকে আগেই ইনভাইট করা হয়েছে');

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);

    const invitation = await this.prisma.groupInvitation.create({
      data: {
        groupId,
        inviterId: userId,
        inviteeId: invitee.id,
        message: dto.message?.trim() || null,
        expiresAt,
      },
    });

    // Notify invitee
    await this.notifications.create({
      userId: invitee.id,
      type: NotificationType.GROUP_INVITATION,
      title: 'গ্রুপ ইনভাইটেশন! 🎉',
      body: `"${group?.name}" গ্রুপে তোমাকে ইনভাইট করা হয়েছে।`,
      data: { groupId, invitationId: invitation.id },
    });

    return { message: 'ইনভাইটেশন পাঠানো হয়েছে', data: { id: invitation.id } };
  }

  // ----------------------------------------------------------
  // GET /groups/invitations/mine — my pending invitations
  // ----------------------------------------------------------
  async myInvitations(userId: string) {
    const rows = await this.prisma.groupInvitation.findMany({
      where: { inviteeId: userId, status: InvitationStatus.PENDING },
      include: {
        group: { select: { id: true, name: true, imageUrl: true, description: true } },
        inviter: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter out expired ones
    const now = new Date();
    const items = rows
      .filter((r) => r.expiresAt > now)
      .map((r) => ({
        id: r.id,
        group: r.group,
        inviter: r.inviter,
        message: r.message,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
      }));

    return { message: MESSAGES.SUCCESS, data: items };
  }

  // ----------------------------------------------------------
  // POST /groups/invitations/:id/respond
  // ----------------------------------------------------------
  async respondInvitation(userId: string, invitationId: string, dto: RespondInvitationDto) {
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { id: invitationId },
      include: {
        group: { select: { id: true, name: true } },
        inviter: { select: { id: true, fullName: true } },
      },
    });
    if (!invitation) throw new NotFoundException('ইনভাইটেশন খুঁজে পাওয়া যায়নি');
    if (invitation.inviteeId !== userId) throw new ForbiddenException(MESSAGES.FORBIDDEN);
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('এই ইনভাইটেশন আর সক্রিয় নয়');
    }
    if (invitation.expiresAt < new Date()) {
      await this.prisma.groupInvitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.CANCELLED, respondedAt: new Date() },
      });
      throw new BadRequestException('ইনভাইটেশনের মেয়াদ শেষ');
    }

    if (dto.action === 'REJECTED') {
      await this.prisma.groupInvitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.REJECTED, respondedAt: new Date() },
      });
      return { message: 'ইনভাইটেশন বাতিল করা হয়েছে', data: null };
    }

    // ACCEPTED — add as member + add to conversation
    await this.prisma.$transaction(async (tx) => {
      await tx.groupInvitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.ACCEPTED, respondedAt: new Date() },
      });

      await tx.groupMember.create({
        data: { groupId: invitation.groupId, userId, role: GroupRole.MEMBER },
      });

      const conv = await tx.conversation.findUnique({
        where: { groupId: invitation.groupId },
        select: { id: true },
      });
      if (conv) {
        await tx.conversationParticipant.create({
          data: { conversationId: conv.id, userId },
        });
      }
    });

    // Notify inviter + other members
    await this.notifications.create({
      userId: invitation.inviterId,
      type: NotificationType.GROUP_INVITATION_ACCEPTED,
      title: 'ইনভাইটেশন গৃহীত হয়েছে ✅',
      body: `"${invitation.group.name}" গ্রুপে নতুন সদস্য যোগ হয়েছেন।`,
      data: { groupId: invitation.groupId },
    });

    return { message: 'গ্রুপে যোগ দেওয়া হয়েছে! 🎉', data: null };
  }

  // ----------------------------------------------------------
  // POST /groups/:id/leave
  // ----------------------------------------------------------
  async leave(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new NotFoundException('তুমি এই গ্রুপের সদস্য নও');
    if (member.role === GroupRole.OWNER) {
      throw new BadRequestException(
        'গ্রুপ মালিক বের হতে পারবে না। আগে অন্য কাউকে মালিক বানাও বা গ্রুপ মুছে ফেলো।',
      );
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    await this.prisma.$transaction([
      this.prisma.groupMember.delete({ where: { id: member.id } }),
      this.prisma.conversationParticipant.deleteMany({
        where: {
          userId,
          conversation: { groupId },
        },
      }),
    ]);

    // Notify remaining members
    const remaining = await this.prisma.groupMember.findMany({
      where: { groupId, userId: { not: userId } },
      select: { userId: true },
    });
    await this.notifications.createMany(
      remaining.map((m) => m.userId),
      {
        type: NotificationType.GROUP_LEFT,
        title: 'একজন সদস্য বের হয়ে গেছেন',
        body: `"${group?.name}" গ্রুপ থেকে একজন সদস্য বের হয়ে গেছেন।`,
        data: { groupId },
      },
    );

    return { message: 'গ্রুপ থেকে বের হয়ে গেলে', data: null };
  }

  // ----------------------------------------------------------
  // DELETE /groups/:id/members/:userId — remove member
  // ----------------------------------------------------------
  async removeMember(actorId: string, groupId: string, targetUserId: string) {
    const actor = await this.ensureAdminOrOwner(actorId, groupId);

    if (actorId === targetUserId) {
      throw new BadRequestException('নিজেকে সরাতে হলে leave ব্যবহার করো');
    }

    const target = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('সদস্য খুঁজে পাওয়া যায়নি');

    // Admin can't remove owner or another admin; only owner can remove admins
    if (target.role === GroupRole.OWNER) {
      throw new ForbiddenException('গ্রুপ মালিককে সরানো যাবে না');
    }
    if (target.role === GroupRole.ADMIN && actor.role !== GroupRole.OWNER) {
      throw new ForbiddenException('শুধু মালিক অন্য অ্যাডমিন সরাতে পারেন');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    await this.prisma.$transaction([
      this.prisma.groupMember.delete({ where: { id: target.id } }),
      this.prisma.conversationParticipant.deleteMany({
        where: { userId: targetUserId, conversation: { groupId } },
      }),
    ]);

    await this.notifications.create({
      userId: targetUserId,
      type: NotificationType.GROUP_LEFT,
      title: 'গ্রুপ থেকে সরানো হয়েছে',
      body: `"${group?.name}" গ্রুপ থেকে তোমাকে সরানো হয়েছে।`,
      data: { groupId },
    });

    return { message: 'সদস্য সরানো হয়েছে', data: null };
  }

  // ----------------------------------------------------------
  // PATCH /groups/:id/members/:userId/role — change role
  // ----------------------------------------------------------
  async updateMemberRole(
    actorId: string,
    groupId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const actor = await this.ensureOwner(actorId, groupId);

    const target = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('সদস্য খুঁজে পাওয়া যায়নি');
    if (target.role === GroupRole.OWNER) {
      throw new ForbiddenException('মালিকের ভূমিকা পরিবর্তন করা যাবে না');
    }

    await this.prisma.groupMember.update({
      where: { id: target.id },
      data: { role: dto.role === 'ADMIN' ? GroupRole.ADMIN : GroupRole.MEMBER },
    });

    return { message: 'ভূমিকা আপডেট হয়েছে', data: null };
  }

  // ----------------------------------------------------------
  // POST /groups/:id/mute — toggle self mute
  // ----------------------------------------------------------
  async toggleMute(userId: string, groupId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new NotFoundException('তুমি এই গ্রুপের সদস্য নও');

    const updated = await this.prisma.groupMember.update({
      where: { id: member.id },
      data: { isMuted: !member.isMuted },
    });

    return {
      message: updated.isMuted ? 'গ্রুপ মিউট করা হয়েছে' : 'গ্রুপ আনমিউট করা হয়েছে',
      data: { isMuted: updated.isMuted },
    };
  }

  // ----------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------
  private async ensureMember(userId: string, groupId: string) {
    const m = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!m) throw new ForbiddenException('তুমি এই গ্রুপের সদস্য নও');
    return m;
  }

  private async ensureAdminOrOwner(userId: string, groupId: string) {
    const m = await this.ensureMember(userId, groupId);
    if (m.role === GroupRole.MEMBER) {
      throw new ForbiddenException('শুধু মালিক বা অ্যাডমিন এই কাজ করতে পারেন');
    }
    return m;
  }

  private async ensureOwner(userId: string, groupId: string) {
    const m = await this.ensureMember(userId, groupId);
    if (m.role !== GroupRole.OWNER) {
      throw new ForbiddenException('শুধু গ্রুপ মালিক এই কাজ করতে পারেন');
    }
    return m;
  }

  private async deleteOldImage(groupId: string) {
    const g = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { imageUrl: true },
    });
    const url = g?.imageUrl;
    if (!url || !url.includes('/uploads/groups/')) return;

    const marker = '/uploads/groups/';
    const idx = url.indexOf(marker);
    const filename = url.slice(idx + marker.length);
    if (!filename) return;

    try {
      await fs.unlink(join(process.cwd(), 'uploads', 'groups', filename));
    } catch {
      /* ignore */
    }
  }
}