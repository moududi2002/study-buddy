// ============================================================
// Path: apps/api/src/friends/friends.controller.ts
// ============================================================

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { SearchFriendsDto } from './dto';
import { FriendsService } from './friends.service';

@ApiTags('Friends')
@ApiBearerAuth('access-token')
@Controller('friends')
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  // ----------------------------------------------------------
  // GET /friends/search?q=...
  // ----------------------------------------------------------
  @Get('search')
  @ApiOperation({ summary: 'ইউজারনেম/ইমেইল দিয়ে বন্ধু খোঁজো' })
  search(@CurrentUser() user: AuthUser, @Query() query: SearchFriendsDto) {
    return this.friends.search(user.id, query);
  }

  // ----------------------------------------------------------
  // GET /friends/:userId/summary
  // ----------------------------------------------------------
  @Get(':userId/summary')
  @ApiOperation({ summary: 'বন্ধুর পাবলিক ড্যাশবোর্ড (aggregate only)' })
  summary(@CurrentUser() user: AuthUser, @Param('userId') id: string) {
    return this.friends.getSummary(user.id, id);
  }

  // ----------------------------------------------------------
  // GET /friends/:userId/badges
  // ----------------------------------------------------------
  @Get(':userId/badges')
  @ApiOperation({ summary: 'বন্ধুর অর্জিত ব্যাজ' })
  badges(@CurrentUser() user: AuthUser, @Param('userId') id: string) {
    return this.friends.getBadges(user.id, id);
  }

  // ----------------------------------------------------------
  // GET /friends/:userId/weekly-trend
  // ----------------------------------------------------------
  @Get(':userId/weekly-trend')
  @ApiOperation({ summary: 'বন্ধুর ৭ দিনের ট্রেন্ড' })
  weeklyTrend(@CurrentUser() user: AuthUser, @Param('userId') id: string) {
    return this.friends.getWeeklyTrend(user.id, id);
  }
}