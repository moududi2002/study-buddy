// ============================================================
// Path: apps/api/src/goals/dto/query-goal.dto.ts
// ============================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { GoalType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryGoalDto {
  @ApiPropertyOptional({ enum: GoalType })
  @IsOptional()
  @IsEnum(GoalType)
  type?: GoalType;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional({ example: true, description: 'শুধু চলমান (endsAt >= today)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;
}