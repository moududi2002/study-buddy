// ============================================================
// Path: apps/api/src/groups/groups.controller.ts
// ============================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import {
  CreateGroupDto,
  InviteMemberDto,
  RespondInvitationDto,
  UpdateGroupDto,
  UpdateMemberRoleDto,
} from './dto';
import { GroupsService } from './groups.service';

@ApiTags('Groups')
@ApiBearerAuth('access-token')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  // ----------------------------------------------------------
  // POST /groups
  // ----------------------------------------------------------
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'নতুন গ্রুপ তৈরি করো' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(user.id, dto);
  }

  // ----------------------------------------------------------
  // GET /groups
  // ----------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'আমার সব গ্রুপ' })
  list(@CurrentUser() user: AuthUser) {
    return this.groups.listMine(user.id);
  }

  // ----------------------------------------------------------
  // GET /groups/invitations/mine
  // ----------------------------------------------------------
  @Get('invitations/mine')
  @ApiOperation({ summary: 'আমার pending ইনভাইটেশন' })
  myInvitations(@CurrentUser() user: AuthUser) {
    return this.groups.myInvitations(user.id);
  }

  // ----------------------------------------------------------
  // POST /groups/invitations/:id/respond
  // ----------------------------------------------------------
  @Post('invitations/:id/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ইনভাইটেশনে সাড়া দাও (গ্রহণ/বাতিল)' })
  respond(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RespondInvitationDto,
  ) {
    return this.groups.respondInvitation(user.id, id, dto);
  }

  // ----------------------------------------------------------
  // GET /groups/:id
  // ----------------------------------------------------------
  @Get(':id')
  @ApiOperation({ summary: 'গ্রুপের বিস্তারিত (সদস্য, leaderboard, target)' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.groups.getDetail(user.id, id);
  }

  // ----------------------------------------------------------
  // PATCH /groups/:id
  // ----------------------------------------------------------
  @Patch(':id')
  @ApiOperation({ summary: 'গ্রুপ আপডেট (owner/admin)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groups.update(user.id, id, dto);
  }

  // ----------------------------------------------------------
  // DELETE /groups/:id
  // ----------------------------------------------------------
  @Delete(':id')
  @ApiOperation({ summary: 'গ্রুপ মুছে ফেলো (owner only)' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.groups.remove(user.id, id);
  }

  // ----------------------------------------------------------
  // POST /groups/:id/image
  // ----------------------------------------------------------
  @Post(':id/image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'গ্রুপের ছবি আপলোড (max 3MB)' })
  uploadImage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.groups.uploadImage(user.id, id, file);
  }

  // ----------------------------------------------------------
  // POST /groups/:id/invite
  // ----------------------------------------------------------
  @Post(':id/invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ইউজারনেম/ইমেইল দিয়ে ইনভাইট পাঠাও' })
  invite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.groups.invite(user.id, id, dto);
  }

  // ----------------------------------------------------------
  // POST /groups/:id/leave
  // ----------------------------------------------------------
  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'গ্রুপ থেকে বের হয়ে যাও' })
  leave(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.groups.leave(user.id, id);
  }

  // ----------------------------------------------------------
  // DELETE /groups/:id/members/:userId
  // ----------------------------------------------------------
  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'সদস্য সরাও (owner/admin)' })
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') memberId: string,
  ) {
    return this.groups.removeMember(user.id, id, memberId);
  }

  // ----------------------------------------------------------
  // PATCH /groups/:id/members/:userId/role
  // ----------------------------------------------------------
  @Patch(':id/members/:userId/role')
  @ApiOperation({ summary: 'সদস্যের ভূমিকা বদলাও (owner only)' })
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('userId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.groups.updateMemberRole(user.id, id, memberId, dto);
  }

  // ----------------------------------------------------------
  // POST /groups/:id/mute
  // ----------------------------------------------------------
  @Post(':id/mute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'গ্রুপ মিউট/আনমিউট করো' })
  toggleMute(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.groups.toggleMute(user.id, id);
  }
}