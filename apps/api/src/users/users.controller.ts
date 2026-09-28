// ============================================================
// Path: apps/api/src/users/users.controller.ts
// ============================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { SelectAvatarDto, UpdateProfileDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ----------------------------------------------------------
  // GET /users/me
  // ----------------------------------------------------------
  @Get('me')
  @ApiOperation({ summary: 'আমার প্রোফাইল' })
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getProfile(user.id);
  }

  // ----------------------------------------------------------
  // PATCH /users/me
  // ----------------------------------------------------------
  @Patch('me')
  @ApiOperation({ summary: 'প্রোফাইল আপডেট (নাম, ক্লাস)' })
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // ----------------------------------------------------------
  // POST /users/me/avatar  (multipart)
  // ----------------------------------------------------------
  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'প্রোফাইল ছবি আপলোড (max 2MB)' })
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(user.id, file);
  }

  // ----------------------------------------------------------
  // POST /users/me/avatar/preset
  // ----------------------------------------------------------
  @Post('me/avatar/preset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'রেডি-মেড কিউট অ্যাভাটার নির্বাচন' })
  selectPreset(@CurrentUser() user: AuthUser, @Body() dto: SelectAvatarDto) {
    return this.usersService.selectPresetAvatar(user.id, dto);
  }

  // ----------------------------------------------------------
  // DELETE /users/me/avatar
  // ----------------------------------------------------------
  @Delete('me/avatar')
  @ApiOperation({ summary: 'অ্যাভাটার মুছে ফেলো' })
  removeAvatar(@CurrentUser() user: AuthUser) {
    return this.usersService.removeAvatar(user.id);
  }

  // ----------------------------------------------------------
  // GET /users/me/stats
  // ----------------------------------------------------------
  @Get('me/stats')
  @ApiOperation({ summary: 'সংক্ষিপ্ত পরিসংখ্যান (XP, Level, Streak, Total time)' })
  getStats(@CurrentUser() user: AuthUser) {
    return this.usersService.getStats(user.id);
  }

  // ----------------------------------------------------------
  // DELETE /users/me  (soft delete)
  // ----------------------------------------------------------
  @Delete('me')
  @ApiOperation({ summary: 'অ্যাকাউন্ট নিষ্ক্রিয় করো (soft delete)' })
  deactivate(@CurrentUser() user: AuthUser) {
    return this.usersService.deactivate(user.id);
  }
}