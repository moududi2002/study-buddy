// ============================================================
// Path: apps/api/src/gamification/gamification.controller.ts
// ============================================================

import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { LeaderboardQueryDto } from './dto';
import { GamificationService } from './gamification.service';

@ApiTags('Gamification')
@ApiBearerAuth('access-token')
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  // ----------------------------------------------------------
  // GET /gamification/badges
  // ----------------------------------------------------------
  @Get('badges')
  @ApiOperation({ summary: 'সব ব্যাজ + অর্জিত স্ট্যাটাস' })
  async badges(@CurrentUser() user: AuthUser) {
    const result = await this.gamification.getAllBadges(user.id);
    return {
      message: 'ব্যজ লিস্ট',
      data: result.data,
    };
  }

  // ----------------------------------------------------------
  // GET /gamification/level
  // ----------------------------------------------------------
  @Get('level')
  @ApiOperation({ summary: 'বর্তমান লেভেল ও XP প্রোগ্রেস' })
  async level(@CurrentUser() user: AuthUser) {
    const result = await this.gamification.getLevelInfo(user.id);
    return { message: 'লেভেল তথ্য', data: result.data };
  }

  // ----------------------------------------------------------
  // GET /gamification/level-progress
  // ----------------------------------------------------------
  @Get('level-progress')
  @ApiOperation({ summary: 'সব লেভেলের XP থ্রেশহোল্ড (১-২০)' })
  async levelProgress() {
    const result = await this.gamification.getLevelTable();
    return { message: 'লেভেল টেবিল', data: result.data };
  }

  // ----------------------------------------------------------
  // GET /gamification/leaderboard
  // ----------------------------------------------------------
  @Get('leaderboard')
  @ApiOperation({ summary: 'টপ শিক্ষার্থী লিডারবোর্ড' })
  async leaderboard(
    @CurrentUser() user: AuthUser,
    @Query() query: LeaderboardQueryDto,
  ) {
    const result = await this.gamification.getLeaderboard(user.id, query.limit ?? 20);
    return { message: 'লিডারবোর্ড', data: result.data };
  }

  // ----------------------------------------------------------
  // GET /gamification/recent-achievements
  // ----------------------------------------------------------
  @Get('recent-achievements')
  @ApiOperation({ summary: 'সাম্প্রতিক অর্জন' })
  async recent(@CurrentUser() user: AuthUser) {
    const result = await this.gamification.getRecentAchievements(user.id, 5);
    return { message: 'সাম্প্রতিক অর্জন', data: result.data };
  }

  // ----------------------------------------------------------
  // POST /gamification/check-badges
  // ----------------------------------------------------------
  @Post('check-badges')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ব্যাজ manually চেক করো (auto হয় entry তে)' })
  async checkBadges(@CurrentUser() user: AuthUser) {
    const result = await this.gamification.triggerCheck(user.id);
    return { message: 'ব্যাজ চেক সম্পন্ন', data: result.data };
  }
}