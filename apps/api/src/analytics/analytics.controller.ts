// ============================================================
// Path: apps/api/src/analytics/analytics.controller.ts
// ============================================================

import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('weekly')
  @ApiOperation({ summary: 'সাপ্তাহিক বিশ্লেষণ + পরামর্শ' })
  weekly(@CurrentUser() user: AuthUser) {
    return this.analyticsService.weekly(user.id);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'মাসিক রিপোর্ট + growth + consistency' })
  monthly(@CurrentUser() user: AuthUser) {
    return this.analyticsService.monthly(user.id);
  }

  @Get('subject-distribution')
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOperation({ summary: 'বিষয়ভিত্তিক বিতরণ (pie chart)' })
  subjectDistribution(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.subjectDistribution(user.id, from, to);
  }

  @Get('daily-trend')
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiOperation({ summary: 'দৈনিক ট্রেন্ড (line chart)' })
  dailyTrend(@CurrentUser() user: AuthUser, @Query('days') days?: string) {
    const d = days ? parseInt(days, 10) : 30;
    return this.analyticsService.dailyTrend(user.id, Math.min(365, Math.max(7, d)));
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'ড্যাশবোর্ডের সব একসাথে' })
  dashboard(@CurrentUser() user: AuthUser) {
    return this.analyticsService.dashboard(user.id);
  }
}