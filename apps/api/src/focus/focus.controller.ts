
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import {
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
  IsOptional,
} from 'class-validator';

import { Type } from 'class-transformer';
import { AuthUser, CurrentUser } from '../common/decorators';

import { FocusService } from './focus.service';
import { FocusPushService } from './focus-push.service';

export class StartFocusDto {
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  chapter?: string;
}

class FocusPushKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

class SubscribeFocusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  endpoint: string;

  @ValidateNested()
  @Type(() => FocusPushKeysDto)
  keys: FocusPushKeysDto;
}


class UnsubscribeFocusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  endpoint: string;
}


@ApiTags('Focus')
@ApiBearerAuth('access-token')
@Controller('focus')
export class FocusController {
  constructor(
    private readonly focus: FocusService,
    private readonly push: FocusPushService,
  ) {}

  @Get('active')
  active(@CurrentUser() user: AuthUser) {
    return this.focus.active(user.id);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.focus.history(user.id);
  }

  @Post('start')
  start(
    @CurrentUser() user: AuthUser,
    @Body() body: StartFocusDto,
  ) {
    return this.focus.start(
        user.id,
        body.subjectId,
        body.chapter,
        );
  }

  @Post(':id/continue')
  continueFocus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.focus.continueFocus(user.id, id);
  }

  @Post(':id/stop')
  stop(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.focus.stop(user.id, id);
  }

  @Get('push/config')
  pushConfig() {
    return {
      message: 'Focus Notification Configuration',
      data: this.push.config(),
    };
  }

  @Post('push/subscribe')
  subscribe(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubscribeFocusDto,
  ) {
    return this.push.subscribe(
      user.id,
      dto.endpoint,
      dto.keys.p256dh,
      dto.keys.auth,
    );
  }



    @Post('push/unsubscribe')
    unsubscribe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UnsubscribeFocusDto,
    ) {
    return this.push.unsubscribe(user.id, dto.endpoint);
    }

}
