// ============================================================
// Path: apps/api/src/friends/friends.controller.ts
// ============================================================


import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import {
  AuthUser,
  CurrentUser,
} from '../common/decorators';

import { SearchFriendsDto } from './dto';
import { FriendsService } from './friends.service';

@ApiTags('Friends')
@ApiBearerAuth('access-token')
@Controller('friends')
export class FriendsController {
  constructor(
    private readonly friends: FriendsService,
  ) {}

  @Get('search')
  search(
    @CurrentUser() user: AuthUser,
    @Query() query: SearchFriendsDto,
  ) {
    return this.friends.search(user.id, query);
  }

  @Get('connections')
  connections(@CurrentUser() user: AuthUser) {
    return this.friends.connections(user.id);
  }

  @Get(':userId/profile')
  profile(
    @CurrentUser() user: AuthUser,
    @Param('userId') targetId: string,
  ) {
    return this.friends.profile(user.id, targetId);
  }

  @Post('request/:userId')
  request(
    @CurrentUser() user: AuthUser,
    @Param('userId') targetId: string,
  ) {
    return this.friends.request(user.id, targetId);
  }

  @Post('requests/:requestId/respond')
  respond(
    @CurrentUser() user: AuthUser,
    @Param('requestId') requestId: string,
    @Body() body: { accept: boolean },
  ) {
    if (typeof body?.accept !== 'boolean') {
      throw new BadRequestException('ভুল Request');
    }

    return this.friends.respond(
      user.id,
      requestId,
      body.accept,
    );
  }

  @Delete('connections/:userId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('userId') targetId: string,
  ) {
    return this.friends.remove(user.id, targetId);
  }

  // Old study-activity endpoints deliberately disabled.
  @Get(':userId/summary')
  summary() {
    throw new ForbiddenException(
      'অন্যের পড়াশোনার তথ্য ব্যক্তিগত',
    );
  }

  @Get(':userId/badges')
  badges() {
    throw new ForbiddenException(
      'অন্যের অর্জন ব্যক্তিগত',
    );
  }

  @Get(':userId/weekly-trend')
  weeklyTrend() {
    throw new ForbiddenException(
      'অন্যের পড়াশোনার তথ্য ব্যক্তিগত',
    );
  }
}
