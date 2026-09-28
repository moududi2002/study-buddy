// ============================================================
// Path: apps/api/src/study-entries/study-entries.module.ts
// ============================================================

import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { StudyEntriesController } from './study-entries.controller';
import { StudyEntriesService } from './study-entries.service';

@Module({
  imports: [GamificationModule],
  controllers: [StudyEntriesController],
  providers: [StudyEntriesService],
  exports: [StudyEntriesService],
})
export class StudyEntriesModule {}