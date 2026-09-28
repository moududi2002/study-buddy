// ============================================================
// Path: apps/api/src/goals/goals.module.ts
// ============================================================

import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

@Module({
  imports: [GamificationModule],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}