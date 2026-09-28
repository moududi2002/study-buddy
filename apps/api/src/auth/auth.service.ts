// ============================================================
// Path: apps/api/src/auth/auth.service.ts
// ============================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import { MESSAGES } from '../common/messages';
import { PasswordUtil } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_SUBJECTS } from '../../prisma/seed';
import { LoginDto, RegisterDto, ResetPasswordDto, VerifyEmailDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { OtpService } from './otp.service';
import { SignOptions } from 'jsonwebtoken';


interface ClientMeta {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly otp: OtpService,
  ) {}

  // ----------------------------------------------------------
  // REGISTER
  // ----------------------------------------------------------
  async register(dto: RegisterDto, meta: ClientMeta) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email.toLowerCase() }, { username: dto.username }],
      },
      select: { email: true, username: true },
    });

    if (existing) {
      if (existing.email === dto.email.toLowerCase()) {
        throw new ConflictException(MESSAGES.EMAIL_ALREADY_EXISTS);
      }
      throw new ConflictException(MESSAGES.USERNAME_ALREADY_EXISTS);
    }

    const passwordHash = await PasswordUtil.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          username: dto.username,
          fullName: dto.fullName,
          passwordHash,
          classLevel: dto.classLevel,
        },
      });

      await tx.subject.createMany({
        data: DEFAULT_SUBJECTS.map((s) => ({
          userId: created.id,
          name: s.name,
          color: s.color,
          icon: s.icon,
          isCustom: false,
        })),
      });

      return created;
    });

    // Auto-send email verification OTP
    await this.otp.issueOtp({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      purpose: 'EMAIL_VERIFICATION',
    });


    return {
      message: MESSAGES.REGISTER_SUCCESS,
      data: {
        user: this.toAuthUser(user),
      },
    };
  }

  // ----------------------------------------------------------
  // LOGIN
  // ----------------------------------------------------------
  async login(dto: LoginDto, meta: ClientMeta) {
    const identifier = dto.identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
      },
    });

    if (!user) throw new UnauthorizedException(MESSAGES.INVALID_CREDENTIALS);
    if (!user.isActive) throw new ForbiddenException(MESSAGES.ACCOUNT_DISABLED);

    if (!user.isEmailVerified) {
    throw new ForbiddenException('উহু, 🤨 । ইমেইল ভেরিফাই করা হয়নি সোনা । এত তাড়া কিসের, হুম? আগে OTP দিয়ে ইমেইল ভেরিফাই করে আসো। 🏃‍♀️দৌড় দিয়ে ইনবক্স থেকে OTP নিয়ে verify করে ফেলো কেমন 😽 ');
  }

    const valid = await PasswordUtil.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException(MESSAGES.INVALID_CREDENTIALS);

    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.username,
      user.role,
      !!dto.rememberMe,
      meta,
    );

    return {
      message: MESSAGES.LOGIN_SUCCESS,
      data: {
        user: this.toAuthUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  // ----------------------------------------------------------
  // REFRESH
  // ----------------------------------------------------------
  async refresh(rawRefresh: string, meta: ClientMeta) {
    if (!rawRefresh) throw new UnauthorizedException(MESSAGES.INVALID_TOKEN);

    const hash = this.hashToken(rawRefresh);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException(MESSAGES.TOKEN_EXPIRED);
    }
    if (!stored.user.isActive) throw new ForbiddenException(MESSAGES.ACCOUNT_DISABLED);
    if (!stored.user.isEmailVerified) {
  throw new ForbiddenException(
    'উহু, 🤨 । ইমেইল ভেরিফাই করা হয়নি সোনা । এত তাড়া কিসের, হুম? আগে OTP দিয়ে ইমেইল ভেরিফাই করে আসো। 🏃‍♀️দৌড় দিয়ে ইনবক্স থেকে OTP নিয়ে verify করে ফেলো কেমন 😽',
  );
}

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(
      stored.user.id,
      stored.user.email,
      stored.user.username,
      stored.user.role,
      stored.rememberMe,
      meta,
    );

    return {
      message: MESSAGES.SUCCESS,
      data: {
        user: this.toAuthUser(stored.user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  // ----------------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------------
  async logout(rawRefresh: string) {
    if (rawRefresh) {
      const hash = this.hashToken(rawRefresh);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: hash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: MESSAGES.LOGOUT_SUCCESS, data: null };
  }

  // ----------------------------------------------------------
  // ME
  // ----------------------------------------------------------
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException(MESSAGES.USER_NOT_FOUND);
    return { message: MESSAGES.SUCCESS, data: this.toAuthUser(user) };
  }

  // ----------------------------------------------------------
  // SEND OTP (resend email verification)
  // ----------------------------------------------------------
  async sendVerificationOtp(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) throw new NotFoundException(MESSAGES.USER_NOT_FOUND);
    if (user.isEmailVerified) {
      return { message: 'ইমেইল আগেই যাচাই করা হয়েছে', data: null };
    }

    await this.otp.issueOtp({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      purpose: 'EMAIL_VERIFICATION',
    });

    return { message: MESSAGES.OTP_SENT, data: null };
  }

  // ----------------------------------------------------------
// VERIFY EMAIL
// ----------------------------------------------------------
  async verifyEmail(dto: VerifyEmailDto, meta: ClientMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException(MESSAGES.USER_NOT_FOUND);
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('ইমেইল আগেই যাচাই করা হয়েছে');
    }

    // Verify OTP first
    await this.otp.verifyOtp({
      userId: user.id,
      code: dto.otp,
      purpose: 'EMAIL_VERIFICATION',
    });

    // Mark email as verified
    const verifiedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });

    // Create authenticated session ONLY after successful verification
    const tokens = await this.issueTokens(
      verifiedUser.id,
      verifiedUser.email,
      verifiedUser.username,
      verifiedUser.role,
      false,
      meta,
    );

    return {
      message: MESSAGES.EMAIL_VERIFIED,
      data: {
        user: this.toAuthUser(verifiedUser),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  // ----------------------------------------------------------
  // FORGOT PASSWORD (send reset OTP)
  // ----------------------------------------------------------
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always respond OK (do not reveal if email exists)
    if (!user) {
      return { message: MESSAGES.PASSWORD_RESET_SENT, data: null };
    }

    await this.otp.issueOtp({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      purpose: 'PASSWORD_RESET',
    });

    return { message: MESSAGES.PASSWORD_RESET_SENT, data: null };
  }

  // ----------------------------------------------------------
  // RESET PASSWORD (verify OTP + set new password)
  // ----------------------------------------------------------
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) throw new BadRequestException(MESSAGES.INVALID_OTP);

    await this.otp.verifyOtp({
      userId: user.id,
      code: dto.otp,
      purpose: 'PASSWORD_RESET',
    });

    const newHash = await PasswordUtil.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      }),
      // Revoke all refresh tokens on password change (security)
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: MESSAGES.PASSWORD_RESET_SUCCESS, data: null };
  }

  // ----------------------------------------------------------
  // INTERNAL
  // ----------------------------------------------------------
  private async issueTokens(
    userId: string,
    email: string,
    username: string,
    role: string,
    rememberMe: boolean,
    meta: ClientMeta,
  ) {
    const payload: JwtPayload = { sub: userId, email, username, role };

    const expiresIn = this.config.get<string>(
      'JWT_EXPIRES_IN',
      '15m',
    ) as SignOptions['expiresIn'];

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET')!,
      expiresIn,
    });


    const refreshRaw = randomBytes(48).toString('hex');
    const refreshHash = this.hashToken(refreshRaw);

    const refreshExpiresIn = rememberMe
      ? this.config.get<string>('JWT_REMEMBER_ME_EXPIRES_IN', '90d')
      : this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');

    const expiresAt = this.addDuration(new Date(), refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshHash,
        userAgent: meta.userAgent?.slice(0, 255),
        ipAddress: meta.ipAddress,
        rememberMe,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: refreshRaw };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private addDuration(date: Date, duration: string): Date {
    const m = /^(\d+)([smhd])$/.exec(duration);
    if (!m) throw new BadRequestException('ভুল সময় ফরম্যাট');
    const value = parseInt(m[1], 10);
    const unit = m[2];
    const ms =
      unit === 's'
        ? value * 1000
        : unit === 'm'
          ? value * 60_000
          : unit === 'h'
            ? value * 3_600_000
            : value * 86_400_000;
    return new Date(date.getTime() + ms);
  }

  private toAuthUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      classLevel: user.classLevel,
      avatarUrl: user.avatarUrl,
      role: user.role,
      xp: user.xp,
      level: user.level,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt.toISOString(),
    };
  }
}