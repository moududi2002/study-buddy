// ============================================================
// Path: apps/api/src/chat/dto/create-personal-conversation.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePersonalConversationDto {
  @ApiProperty({ example: 'clx1234user' })
  @IsString()
  userId!: string;
}
