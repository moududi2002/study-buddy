// ============================================================
// Path: apps/api/src/chat/dto/send-message.dto.ts
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'clx1234conversation' })
  @IsString()
  conversationId!: string;

  @ApiPropertyOptional({ example: 'কেমন আছো?' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ApiProperty({ enum: ['TEXT', 'IMAGE'] })
  @IsIn(['TEXT', 'IMAGE'])
  type!: 'TEXT' | 'IMAGE';

  @ApiPropertyOptional({ example: '/uploads/chat/xyz.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}