// apps/api/src/focus/focus-push.service.ts

import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FocusPushService {
  private readonly logger = new Logger(FocusPushService.name);
  private readonly publicKey = process.env.FOCUS_VAPID_PUBLIC_KEY || '';
  private readonly privateKey = process.env.FOCUS_VAPID_PRIVATE_KEY || '';
  private readonly subject = process.env.FOCUS_VAPID_SUBJECT || '';
  private readonly enabled: boolean;

  constructor(private readonly prisma: PrismaService) {
    this.enabled = Boolean(
      this.publicKey && this.privateKey && this.subject,
    );

    if (this.enabled) {
      webpush.setVapidDetails(
        this.subject,
        this.publicKey,
        this.privateKey,
      );
    } else {
      this.logger.warn(
        'Focus Web Push disabled: VAPID environment is incomplete',
      );
    }
  }

  config() {
    return { publicKey: this.enabled ? this.publicKey : null };
  }

  async subscribe(
    userId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
  ) {
    let url: URL;

    try {
      url = new URL(endpoint);
    } catch {
      throw new BadRequestException('Invalid push endpoint');
    }

    if (
      url.protocol !== 'https:' ||
      endpoint.length > 3000 ||
      p256dh.length > 500 ||
      auth.length > 500 ||
      !p256dh ||
      !auth
    ) {
      throw new BadRequestException('Invalid push subscription');
    }

    const existing = await this.prisma.focusPushSubscription.findUnique({
      where: { endpoint },
      select: { userId: true },
    });

    // Do not silently transfer another account's subscription.
    if (existing && existing.userId !== userId) {
      throw new BadRequestException(
        'This device subscription belongs to another account',
      );
    }

    await this.prisma.focusPushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh, auth },
      update: { p256dh, auth },
    });

    return { message: 'Focus alarm enabled', data: null };
  }

  async notifyCheckpoint(userId: string, sessionId: string) {
    if (!this.enabled) return;

    const subscriptions = await this.prisma.focusPushSubscription.findMany({
      where: { userId },
    });

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify({
            title: '⏰ Study Buddy — Focus Check',
            body: '৩ ঘণ্টা হয়েছে! তুমি কি এখনো পড়ছো?',
            sessionId,
          }),
          {
            TTL: 3600,
            urgency: 'high',
          },
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;

        if (statusCode === 404 || statusCode === 410) {
          await this.prisma.focusPushSubscription.delete({
            where: { id: subscription.id },
          });
        } else {
          this.logger.warn(
            `Focus push delivery failed: ${statusCode ?? 'unknown'}`,
          );
        }
      }
    }
  }


    async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.focusPushSubscription.deleteMany({
        where: { userId, endpoint },
    });

    return {
        message: 'Focus Alarm disabled for this device',
        data: null,
    };
    }

}


