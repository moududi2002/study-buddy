// ============================================================
// Path: apps/api/src/chat/chat.controller.ts
// ============================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
import { ChatService } from './chat.service';
import { CreatePersonalConversationDto, QueryMessagesDto, SendMessageDto } from './dto';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  // ----------------------------------------------------------
  // GET /chat/conversations
  // ----------------------------------------------------------
  @Get('conversations')
  @ApiOperation({ summary: 'আমার সব চ্যাট (last message + unread সহ)' })
  listConversations(@CurrentUser() user: AuthUser) {
    return this.chat.listConversations(user.id);
  }

  // ----------------------------------------------------------
  // POST /chat/conversations
  // ----------------------------------------------------------
  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ব্যক্তিগত চ্যাট শুরু (বা existing ফেরত)' })
  createPersonal(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePersonalConversationDto,
  ) {
    return this.chat.createPersonalConversation(user.id, dto.userId);
  }

  // ----------------------------------------------------------
  // GET /chat/conversations/:id
  // ----------------------------------------------------------
  @Get('conversations/:id')
  @ApiOperation({ summary: 'চ্যাটের বিস্তারিত' })
  getConversation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.getConversation(user.id, id);
  }

  // ----------------------------------------------------------
  // GET /chat/conversations/:id/messages
  // ----------------------------------------------------------
  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'মেসেজ লিস্ট (paginated, ২৪ ঘণ্টার ভেতরের)' })
  listMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: QueryMessagesDto,
  ) {
    return this.chat.listMessages(user.id, id, query);
  }

  // ----------------------------------------------------------
  // POST /chat/conversations/:id/read
  // ----------------------------------------------------------
  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'সব পঠিত হিসেবে চিহ্নিত করো' })
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.markRead(user.id, id);
  }

  // ----------------------------------------------------------
  // POST /chat/messages
  // ----------------------------------------------------------
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'মেসেজ পাঠাও (REST fallback)' })
  sendMessage(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.chat.sendMessage(user.id, dto);
  }

  // ----------------------------------------------------------
  // POST /chat/images
  // ----------------------------------------------------------
  @Post('images')
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
  @ApiOperation({ summary: 'চ্যাটের ছবি আপলোড (max 5MB)' })
  uploadImage(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.chat.uploadImage(user.id, file);
  }

  // ----------------------------------------------------------
  // DELETE /chat/messages/:id
  // ----------------------------------------------------------
  @Delete('messages/:id')
  @ApiOperation({ summary: 'নিজের মেসেজ মুছে ফেলো' })
  deleteMessage(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.deleteMessage(user.id, id);
  }


  // ----------------------------------------------------------
  // POST /chat/audio
  // ----------------------------------------------------------

  @Post('audio')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'চ্যাটের voice message upload' })
  uploadAudio(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.chat.uploadAudio(user.id, file);
  }

}