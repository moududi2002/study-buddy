// ============================================================
// Path: apps/api/src/chat/dto/query-messages.dto.ts
// ============================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryMessagesDto {
  @ApiPropertyOptional({ description: 'এর আগের message এর id (pagination)' })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiPropertyOptional({ default: 30, description: '1-50' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}