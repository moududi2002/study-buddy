// ============================================================
// Path: apps/api/src/notifications/notifications.controller.ts
// ============================================================

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { QueryNotificationsDto } from './dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // ----------------------------------------------------------
  // GET /notifications
  // ----------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'নোটিফিকেশন লিস্ট (paginated)' })
  list(@CurrentUser() user: AuthUser, @Query() query: QueryNotificationsDto) {
    return this.notifications.list(user.id, query);
  }

  // ----------------------------------------------------------
  // GET /notifications/unread-count
  // ----------------------------------------------------------
  @Get('unread-count')
  @ApiOperation({ summary: 'অপঠিত নোটিফিকেশনের সংখ্যা (bell badge)' })
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user.id);
  }

  // ----------------------------------------------------------
  // POST /notifications/read-all
  // ----------------------------------------------------------
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'সব পঠিত হিসেবে চিহ্নিত করো' })
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.id);
  }

  // ----------------------------------------------------------
  // POST /notifications/:id/read
  // ----------------------------------------------------------
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'একটি নোটিফিকেশন পঠিত করো' })
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  // ----------------------------------------------------------
  // DELETE /notifications/clear
  // ----------------------------------------------------------
  @Delete('clear')
  @ApiOperation({ summary: 'সব পঠিত নোটিফিকেশন মুছে ফেলো' })
  clearRead(@CurrentUser() user: AuthUser) {
    return this.notifications.clearRead(user.id);
  }

  // ----------------------------------------------------------
  // DELETE /notifications/:id
  // ----------------------------------------------------------
  @Delete(':id')
  @ApiOperation({ summary: 'একটি নোটিফিকেশন মুছে ফেলো' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.remove(user.id, id);
  }
}