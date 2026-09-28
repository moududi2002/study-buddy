// ============================================================
// Path: apps/api/src/goals/dto/update-goal.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateGoalDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  targetMinutes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  targetChapters?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}