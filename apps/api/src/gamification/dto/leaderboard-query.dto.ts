// ============================================================
// Path: apps/api/src/gamification/dto/leaderboard-query.dto.ts
// ============================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class LeaderboardQueryDto {
  @ApiPropertyOptional({ example: 20, description: '1 - 100' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}