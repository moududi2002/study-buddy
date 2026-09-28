// ============================================================
// Path: apps/api/src/gamification/gamification.module.ts
// ============================================================

import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';

@Module({
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}