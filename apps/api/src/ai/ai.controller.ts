// ============================================================
// Path: apps/api/src/ai/ai.controller.ts
// ============================================================

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { AiService } from './ai.service';
import { ExamPrepDto } from './dto';
import { GeminiClient } from './gemini.client';

@ApiTags('AI')
@ApiBearerAuth('access-token')
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly gemini: GeminiClient,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'AI সেটআপ স্ট্যাটাস' })
  status() {
    return {
      message: this.gemini.isConfigured ? 'AI প্রস্তুত' : 'AI সেটআপ হয়নি (fallback চালু)',
      data: {
        configured: this.gemini.isConfigured,
        mode: this.gemini.isConfigured ? 'ai' : 'rule-based-fallback',
      },
    };
  }

  @Get('weekly-insight')
  @ApiQuery({ name: 'refresh', required: false })
  @ApiOperation({ summary: 'সাপ্তাহিক AI insight (Bengali)' })
  weekly(@CurrentUser() user: AuthUser, @Query('refresh') refresh?: string) {
    return this.ai.weeklyInsight(user.id, refresh === 'true');
  }

  @Get('monthly-analysis')
  @ApiQuery({ name: 'refresh', required: false })
  @ApiOperation({ summary: 'মাসিক AI বিশ্লেষণ' })
  monthly(@CurrentUser() user: AuthUser, @Query('refresh') refresh?: string) {
    return this.ai.monthlyAnalysis(user.id, refresh === 'true');
  }

  @Get('study-plan')
  @ApiQuery({ name: 'refresh', required: false })
  @ApiOperation({ summary: 'ব্যক্তিগত ৭ দিনের পড়ার প্ল্যান' })
  plan(@CurrentUser() user: AuthUser, @Query('refresh') refresh?: string) {
    return this.ai.studyPlan(user.id, refresh === 'true');
  }

  @Post('exam-prep')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'পরীক্ষার প্রস্তুতি সাজেশন' })
  examPrep(@CurrentUser() user: AuthUser, @Body() dto: ExamPrepDto) {
    return this.ai.examPrep(user.id, dto.subject, dto.daysUntilExam);
  }
}