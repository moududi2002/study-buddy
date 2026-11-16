// ============================================================
// Path: apps/api/src/analytics/analytics.module.ts
// ============================================================


import { Module } from '@nestjs/common';
import { GoalsModule } from '../goals/goals.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [GoalsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
