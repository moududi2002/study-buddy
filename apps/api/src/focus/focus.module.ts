
import { Module } from '@nestjs/common';

import { StudyEntriesModule } from '../study-entries/study-entries.module';

import { FocusController } from './focus.controller';
import { FocusService } from './focus.service';
import { FocusPushService } from './focus-push.service';

@Module({
  imports: [StudyEntriesModule],
  controllers: [FocusController],
  providers: [
    FocusService,
    FocusPushService,
  ],
})
export class FocusModule {}
