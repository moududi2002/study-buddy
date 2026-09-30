// ============================================================
// Path: apps/api/src/chat/chat.service.ts
// ============================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MessageType, NotificationType } from '../generated/prisma/client';
import { promises as fs } from 'fs';
import { join } from 'path';
import { MESSAGES } from '../common/messages';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { QueryMessagesDto, SendMessageDto } from './dto';

const MAX_MESSAGES_PER_CONVERSATION = 100;
const MESSAGE_TTL_HOURS = 24;

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ----------------------------------------------------------
  // GET /chat/conversations — my list with last message + unread
  // ----------------------------------------------------------
  async listConversations(userId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            group: {
              select: { id: true, name: true, imageUrl: true },
            },
            participants: {
              include: {
                user: {
                  select: { id: true, username: true, fullName: true, avatarUrl: true },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: { id: true, username: true, fullName: true },
                },
              },
            },
          },
        },
      },
    });

    const now = Date.now();

    const items = await Promise.all(
      participants.map(async (p) => {
        const conv = p.conversation;

        // Filter out messages older than 24h (they will be cleaned soon)
        const lastMessage = conv.messages[0];
        const lastMessageValid =
          lastMessage && now - lastMessage.createdAt.getTime() < MESSAGE_TTL_HOURS * 3600_000
            ? lastMessage
            : null;

        // Unread = messages after lastReadAt, not sent by me, not expired
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            createdAt: {
              gt: p.lastReadAt,
              gte: new Date(now - MESSAGE_TTL_HOURS * 3600_000),
            },
          },
        });

        const others = conv.participants.filter((x) => x.user.id !== userId);
        const displayName = conv.group
          ? conv.group.name
          : others[0]?.user.fullName ?? 'অজানা';
        const displayImage = conv.group
          ? conv.group.imageUrl
          : others[0]?.user.avatarUrl ?? null;

        return {
          id: conv.id,
          isGroup: !!conv.group,
          groupId: conv.group?.id ?? null,
          displayName,
          displayImage,
          participantCount: conv.participants.length,
          otherUser: conv.group ? null : others[0]?.user ?? null,
          lastMessage: lastMessageValid
            ? {
                id: lastMessageValid.id,
                type: lastMessageValid.type,
                content: lastMessageValid.content,
                imageUrl: lastMessageValid.imageUrl,
                senderId: lastMessageValid.senderId,
                senderName: lastMessageValid.sender.fullName,
                createdAt: lastMessageValid.createdAt.toISOString(),
              }
            : null,
          unreadCount,
          updatedAt: conv.updatedAt.toISOString(),
        };
      }),
    );

    // Sort: by last message createdAt desc, else updatedAt desc
    items.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt).getTime();
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

    return { message: MESSAGES.SUCCESS, data: items };
  }

  // ----------------------------------------------------------
  // POST /chat/conversations — create or return existing personal chat
  // ----------------------------------------------------------
  async createPersonalConversation(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new BadRequestException('নিজের সাথে চ্যাট করা যাবে না');
    }

    const other = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, isActive: true, fullName: true },
    });
    if (!other || !other.isActive) throw new NotFoundException(MESSAGES.USER_NOT_FOUND);

    // Find existing personal conversation between these two
    const existing = await this.prisma.conversation.findFirst({
      where: {
        groupId: null,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
        participants: { every: { userId: { in: [userId, otherUserId] } } },
      },
      select: { id: true },
    });
    if (existing) {
      return { message: MESSAGES.SUCCESS, data: { id: existing.id } };
    }

    const conv = await this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
    });

    return { message: 'চ্যাট শুরু হয়েছে', data: { id: conv.id } };
  }

  // ----------------------------------------------------------
  // GET /chat/conversations/:id — detail
  // ----------------------------------------------------------
  async getConversation(userId: string, conversationId: string) {
    await this.ensureParticipant(userId, conversationId);

    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        group: { select: { id: true, name: true, imageUrl: true, ownerId: true } },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatarUrl: true,
                level: true,
                xp: true,
              },
            },
          },
        },
      },
    });
    if (!conv) throw new NotFoundException('চ্যাট খুঁজে পাওয়া যায়নি');

    const others = conv.participants.filter((x) => x.user.id !== userId);
    const displayName = conv.group ? conv.group.name : others[0]?.user.fullName ?? 'অজানা';
    const displayImage = conv.group
      ? conv.group.imageUrl
      : others[0]?.user.avatarUrl ?? null;

    return {
      message: MESSAGES.SUCCESS,
      data: {
        id: conv.id,
        isGroup: !!conv.group,
        groupId: conv.group?.id ?? null,
        displayName,
        displayImage,
        participants: conv.participants.map((p) => ({
          id: p.user.id,
          username: p.user.username,
          fullName: p.user.fullName,
          avatarUrl: p.user.avatarUrl,
          level: p.user.level,
          xp: p.user.xp,
        })),
      },
    };
  }

  // ----------------------------------------------------------
  // GET /chat/conversations/:id/messages — paginated, TTL-filtered
  // ----------------------------------------------------------
  async listMessages(userId: string, conversationId: string, query: QueryMessagesDto) {
    await this.ensureParticipant(userId, conversationId);

    const limit = query.limit ?? 30;
    const ttlCutoff = new Date(Date.now() - MESSAGE_TTL_HOURS * 3600_000);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        createdAt: { gte: ttlCutoff },
        ...(query.before ? { id: { lt: query.before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
    });

    return {
      message: MESSAGES.SUCCESS,
      data: {
        items: messages.reverse().map((m) => this.serializeMessage(m)),
        hasMore: messages.length === limit,
      },
    };
  }

  // ----------------------------------------------------------
  // POST /chat/messages — send (REST fallback for non-socket)
  // ----------------------------------------------------------
  async sendMessage(userId: string, dto: SendMessageDto) {
    await this.ensureParticipant(userId, dto.conversationId);

    if (dto.type === 'TEXT' && !dto.content?.trim()) {
      throw new BadRequestException('মেসেজ খালি পাঠানো যাবে না');
    }
    if (dto.type === 'IMAGE' && !dto.imageUrl) {
      throw new BadRequestException('ছবি আপলোড করা হয়নি');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: userId,
        type: dto.type as MessageType,
        content: dto.type === 'TEXT' ? dto.content!.trim() : null,
        imageUrl: dto.type === 'IMAGE' ? dto.imageUrl! : null,
      },
      include: {
        sender: {
          select: { id: true, username: true, fullName: true, avatarUrl: true },
        },
      },
    });

    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    // Enforce 100-msg cap (delete oldest)
    await this.enforceMessageCap(dto.conversationId);

    // Notify other participants (excluding muted groups)
    await this.notifyParticipants(userId, dto.conversationId, message);

    return { message: MESSAGES.SUCCESS, data: this.serializeMessage(message) };
  }

  // ----------------------------------------------------------
  // POST /chat/messages/image — upload image
  // ----------------------------------------------------------
  async uploadImage(userId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('ছবি আপলোড করা হয়নি');
    if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
      throw new BadRequestException('শুধু JPG, PNG অথবা WEBP');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('ছবির আকার সর্বোচ্চ ৫ মেগাবাইট');
    }

    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const dir = join(process.cwd(), 'uploads', 'chat');
    await fs.mkdir(dir, { recursive: true });

    const filename = `${userId}-${Date.now()}.${ext}`;
    const filepath = join(dir, filename);
    await fs.writeFile(filepath, file.buffer);

    return {
      message: 'ছবি আপলোড হয়েছে',
      data: { imageUrl: `/uploads/chat/${filename}` },
    };
  }

  // ----------------------------------------------------------
  // DELETE /chat/messages/:id
  // ----------------------------------------------------------
  async deleteMessage(userId: string, messageId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, conversationId: true, imageUrl: true },
    });
    if (!msg) throw new NotFoundException('মেসেজ খুঁজে পাওয়া যায়নি');
    if (msg.senderId !== userId) throw new ForbiddenException('নিজের মেসেজই মুছতে পারবে');

    await this.prisma.message.delete({ where: { id: messageId } });

    // Delete attached image file (best-effort)
    if (msg.imageUrl && msg.imageUrl.includes('/uploads/chat/')) {
      const filename = msg.imageUrl.split('/uploads/chat/')[1];
      if (filename) {
        try {
          await fs.unlink(join(process.cwd(), 'uploads', 'chat', filename));
        } catch {
          /* ignore */
        }
      }
    }

    return { message: 'মেসেজ মুছে ফেলা হয়েছে', data: { id: messageId } };
  }

  // ----------------------------------------------------------
  // POST /chat/conversations/:id/read — mark all as read
  // ----------------------------------------------------------
  async markRead(userId: string, conversationId: string) {
    await this.ensureParticipant(userId, conversationId);
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
    return { message: MESSAGES.SUCCESS, data: null };
  }

  // ----------------------------------------------------------
  // INTERNAL: enforce 100-msg cap
  // ----------------------------------------------------------
  async enforceMessageCap(conversationId: string) {
    const total = await this.prisma.message.count({ where: { conversationId } });
    if (total <= MAX_MESSAGES_PER_CONVERSATION) return;

    const excess = total - MAX_MESSAGES_PER_CONVERSATION;
    const oldest = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: excess,
      select: { id: true, imageUrl: true },
    });

    await this.prisma.message.deleteMany({
      where: { id: { in: oldest.map((m) => m.id) } },
    });

    // Best-effort image cleanup
    for (const m of oldest) {
      if (m.imageUrl && m.imageUrl.includes('/uploads/chat/')) {
        const filename = m.imageUrl.split('/uploads/chat/')[1];
        if (filename) {
          try {
            await fs.unlink(join(process.cwd(), 'uploads', 'chat', filename));
          } catch {
            /* ignore */
          }
        }
      }
    }
  }

  // ----------------------------------------------------------
  // INTERNAL: notify participants (respect mute)
  // ----------------------------------------------------------
  private async notifyParticipants(senderId: string, conversationId: string, message: any) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        group: { select: { id: true, name: true } },
        participants: { select: { userId: true } },
      },
    });
    if (!conv) return;

    const recipientIds = conv.participants
      .map((p) => p.userId)
      .filter((id) => id !== senderId);
    if (recipientIds.length === 0) return;

    // If group: filter out muted members
    let filtered = recipientIds;
    if (conv.group) {
      const muted = await this.prisma.groupMember.findMany({
        where: { groupId: conv.group.id, userId: { in: recipientIds }, isMuted: true },
        select: { userId: true },
      });
      const mutedSet = new Set(muted.map((m) => m.userId));
      filtered = recipientIds.filter((id) => !mutedSet.has(id));
    }
    if (filtered.length === 0) return;

    const preview =
      message.type === 'IMAGE' ? '📷 ছবি পাঠিয়েছে' : (message.content ?? '').slice(0, 80);

    await this.notifications.createMany(filtered, {
      type: conv.group ? NotificationType.GROUP_MESSAGE : NotificationType.PERSONAL_MESSAGE,
      title: conv.group ? `${conv.group.name}` : message.sender.fullName,
      body: preview,
      data: { conversationId, senderId },
    });
  }

  // ----------------------------------------------------------
  // INTERNAL: participant check
  // ----------------------------------------------------------
  async ensureParticipant(userId: string, conversationId: string) {
    const p = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!p) throw new ForbiddenException('তুমি এই চ্যাটের সদস্য নও');
    return p;
  }

  // ----------------------------------------------------------
  // INTERNAL: serialize
  // ----------------------------------------------------------
  serializeMessage(m: any) {
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      sender: m.sender
        ? {
            id: m.sender.id,
            username: m.sender.username,
            fullName: m.sender.fullName,
            avatarUrl: m.sender.avatarUrl,
          }
        : undefined,
      type: m.type,
      content: m.content,
      imageUrl: m.imageUrl,
      createdAt: m.createdAt.toISOString(),
    };
  }
}