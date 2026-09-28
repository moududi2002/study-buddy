// ============================================================
// Path: apps/api/src/goals/dto/create-goal.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { GoalType } from '../../generated/prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGoalDto {
  @ApiProperty({ example: 'প্রতিদিন ২ ঘণ্টা পড়ব' })
  @IsString()
  @MinLength(2, { message: 'লক্ষ্যের নাম কমপক্ষে ২ অক্ষরের' })
  @MaxLength(120)
  title: string;

  @ApiProperty({ enum: GoalType, example: 'DAILY' })
  @IsEnum(GoalType, { message: 'লক্ষ্যের ধরন সঠিক নয়' })
  type: GoalType;

  @ApiProperty({ required: false, example: 120, description: 'মিনিটে' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  targetMinutes?: number;

  @ApiProperty({ required: false, example: 5, description: 'অধ্যায় সংখ্যা' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  targetChapters?: number;

  @ApiProperty({ required: false, example: 'clx1234subject' })
  @IsOptional()
  @IsString()
  subjectId?: string;
}