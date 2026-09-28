// ============================================================
// Path: apps/api/src/auth/auth.controller.ts
// ============================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SendOtpDto,
  VerifyEmailDto,
} from './dto';
import { Public, CurrentUser, AuthUser } from '../common/decorators';

const REFRESH_COOKIE = 'sb_refresh';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ----------------------------------------------------------
  // POST /auth/register
  // ----------------------------------------------------------
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'নতুন অ্যাকাউন্ট তৈরি' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    this.setRefreshCookie(res, result.data.refreshToken, false);
    return {
      message: result.message,
      data: { user: result.data.user, accessToken: result.data.accessToken },
    };
  }

  // ----------------------------------------------------------
  // POST /auth/login
  // ----------------------------------------------------------
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'লগইন (ইমেইল অথবা ইউজারনেম)' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    this.setRefreshCookie(res, result.data.refreshToken, !!dto.rememberMe);
    return {
      message: result.message,
      data: { user: result.data.user, accessToken: result.data.accessToken },
    };
  }

  // ----------------------------------------------------------
  // POST /auth/refresh
  // ----------------------------------------------------------
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access token রিফ্রেশ' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefresh = req.cookies?.[REFRESH_COOKIE];
    const result = await this.authService.refresh(rawRefresh, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    this.setRefreshCookie(res, result.data.refreshToken, false);
    return {
      message: result.message,
      data: { user: result.data.user, accessToken: result.data.accessToken },
    };
  }

  // ----------------------------------------------------------
  // POST /auth/logout
  // ----------------------------------------------------------
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'লগআউট' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefresh = req.cookies?.[REFRESH_COOKIE];
    const result = await this.authService.logout(rawRefresh);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return result;
  }

  // ----------------------------------------------------------
  // GET /auth/me
  // ----------------------------------------------------------
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'বর্তমান ব্যবহারকারী' })
  async me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }

  // ----------------------------------------------------------
  // POST /auth/send-otp
  // ----------------------------------------------------------
  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ইমেইল ভেরিফিকেশন কোড পাঠাও' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendVerificationOtp(dto.email);
  }

  // ----------------------------------------------------------
  // POST /auth/verify-email
  // ----------------------------------------------------------
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ইমেইল যাচাই করো (OTP দিয়ে)' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    this.setRefreshCookie(res, result.data.refreshToken, false);

    return {
      message: result.message,
      data: {
        user: result.data.user,
        accessToken: result.data.accessToken,
      },
    };
  }

  // ----------------------------------------------------------
  // POST /auth/forgot-password
  // ----------------------------------------------------------
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'পাসওয়ার্ড রিসেট কোড পাঠাও' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // ----------------------------------------------------------
  // POST /auth/reset-password
  // ----------------------------------------------------------
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'পাসওয়ার্ড রিসেট করো (OTP + নতুন পাসওয়ার্ড)' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ----------------------------------------------------------
  // Cookie helper
  // ----------------------------------------------------------
  private setRefreshCookie(res: Response, token: string, rememberMe: boolean) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const maxAge = rememberMe
      ? 90 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;

    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      path: '/',
      maxAge,
    });
  }
}