// ============================================================
// Path: apps/api/src/streak/streak.controller.ts
// ============================================================

import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { HeatmapQueryDto } from './dto';
import { StreakService } from './streak.service';

@ApiTags('Streak')
@ApiBearerAuth('access-token')
@Controller('streak')
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  // ----------------------------------------------------------
  // GET /streak
  // ----------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'স্ট্রিক তথ্য + ৯০ দিনের ক্যালেন্ডার' })
  getStreak(@CurrentUser() user: AuthUser) {
    return this.streakService.getStreak(user.id);
  }

  // ----------------------------------------------------------
  // GET /streak/heatmap
  // ----------------------------------------------------------
  @Get('heatmap')
  @ApiOperation({ summary: 'GitHub-স্টাইল হিটম্যাপ (ডিফল্ট ৩৬৫ দিন)' })
  getHeatmap(@CurrentUser() user: AuthUser, @Query() query: HeatmapQueryDto) {
    return this.streakService.getHeatmap(user.id, query.days ?? 365);
  }

  // ----------------------------------------------------------
  // GET /streak/weekly-challenge
  // ----------------------------------------------------------
  @Get('weekly-challenge')
  @ApiOperation({ summary: 'চলতি সপ্তাহের চ্যালেঞ্জ' })
  getWeeklyChallenge(@CurrentUser() user: AuthUser) {
    return this.streakService.getWeeklyChallenge(user.id);
  }
}