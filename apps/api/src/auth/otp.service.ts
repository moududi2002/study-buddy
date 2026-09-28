// ============================================================
// Path: apps/api/src/auth/otp.service.ts
// ============================================================

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MESSAGES } from '../common/messages';
import { OtpUtil } from '../common/utils';
import { MailService, OtpPurpose } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private get length(): number {
    return this.config.get<number>('OTP_LENGTH', 6);
  }

  private get expiryMinutes(): number {
    return this.config.get<number>('OTP_EXPIRY_MINUTES', 10);
  }

  // ----------------------------------------------------------
  // Generate + send a new OTP for a user
  // ----------------------------------------------------------
  async issueOtp(params: {
    userId: string;
    email: string;
    fullName: string;
    purpose: OtpPurpose;
  }) {
    // Invalidate any prior unconsumed OTPs for same purpose
    await this.prisma.otpToken.updateMany({
      where: {
        userId: params.userId,
        purpose: params.purpose,
        consumed: false,
      },
      data: { consumed: true },
    });

    const code = OtpUtil.generate(this.length);
    const hashed = OtpUtil.hash(code);
    const expiresAt = new Date(Date.now() + this.expiryMinutes * 60_000);

    await this.prisma.otpToken.create({
      data: {
        userId: params.userId,
        code: hashed,
        purpose: params.purpose,
        expiresAt,
      },
    });

    await this.mail.sendOtp({
      to: params.email,
      fullName: params.fullName,
      otp: code,
      purpose: params.purpose,
      expiryMinutes: this.expiryMinutes,
    });

    return { sent: true, expiresAt };
  }

  // ----------------------------------------------------------
  // Verify OTP — marks as consumed on success
  // ----------------------------------------------------------
  async verifyOtp(params: {
    userId: string;
    code: string;
    purpose: OtpPurpose;
  }) {
    if (!params.code || params.code.length < 4) {
      throw new BadRequestException(MESSAGES.INVALID_OTP);
    }

    const hashed = OtpUtil.hash(params.code.trim());

    const record = await this.prisma.otpToken.findFirst({
      where: {
        userId: params.userId,
        purpose: params.purpose,
        consumed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) throw new BadRequestException(MESSAGES.INVALID_OTP);
    if (record.expiresAt < new Date()) {
      // mark it consumed to prevent reuse
      await this.prisma.otpToken.update({
        where: { id: record.id },
        data: { consumed: true },
      });
      throw new BadRequestException(MESSAGES.INVALID_OTP);
    }
    if (record.code !== hashed) {
      throw new BadRequestException(MESSAGES.INVALID_OTP);
    }

    await this.prisma.otpToken.update({
      where: { id: record.id },
      data: { consumed: true },
    });

    return { ok: true };
  }
}