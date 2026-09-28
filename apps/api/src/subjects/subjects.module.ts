// ============================================================
// Path: apps/api/src/subjects/subjects.module.ts
// ============================================================

import { Module } from '@nestjs/common';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Module({
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}