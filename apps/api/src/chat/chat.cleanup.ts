// ============================================================
// Path: apps/api/src/chat/chat.cleanup.ts
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { promises as fs } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

const MESSAGE_TTL_HOURS = 24;

@Injectable()
export class ChatCleanupService {
  private readonly logger = new Logger(ChatCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Every hour on the hour
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpired() {
    const cutoff = new Date(Date.now() - MESSAGE_TTL_HOURS * 3600_000);

    const old = await this.prisma.message.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true, imageUrl: true },
      take: 5000,
    });

    if (old.length === 0) return;

    await this.prisma.message.deleteMany({
      where: { id: { in: old.map((m) => m.id) } },
    });

    // Cleanup images
    for (const m of old) {
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

    this.logger.log(`🧹 Chat cleanup: removed ${old.length} expired messages (>24h)`);
  }

  // Also clean orphan image files (in uploads/chat not referenced)
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupOrphanImages() {
    const dir = join(process.cwd(), 'uploads', 'chat');
    try {
      const files = await fs.readdir(dir);
      const referenced = await this.prisma.message.findMany({
        where: { imageUrl: { not: null } },
        select: { imageUrl: true },
      });
      const refSet = new Set(
        referenced
          .map((r) => r.imageUrl?.split('/uploads/chat/')[1])
          .filter(Boolean) as string[],
      );
      let removed = 0;
      for (const f of files) {
        if (!refSet.has(f)) {
          try {
            await fs.unlink(join(dir, f));
            removed++;
          } catch {
            /* ignore */
          }
        }
      }
      if (removed > 0) this.logger.log(`🧹 Removed ${removed} orphan chat images`);
    } catch {
      /* dir might not exist yet */
    }
  }
}