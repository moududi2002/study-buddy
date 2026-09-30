// ============================================================
// Path: apps/api/src/chat/dto/send-message.dto.ts
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MessageType } from '../../generated/prisma/client';

export class SendMessageDto {
  @ApiProperty({ example: 'clx1234conversation' })
  @IsString()
  conversationId!: string;

  @ApiPropertyOptional({ example: 'কেমন আছো?' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ApiProperty({ enum: MessageType })
  @IsEnum(MessageType)
  type!: MessageType;

  @ApiPropertyOptional({ example: '/uploads/chat/xyz.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: '/uploads/chat/xyz.mp3' })
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  audioDuration?: number;
}
