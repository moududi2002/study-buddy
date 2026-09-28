// ============================================================
// Path: apps/api/src/study-entries/dto/update-study-entry.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StudyMood } from '@prisma/client';

export class UpdateStudyEntryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  durationMinutes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  chapter?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ required: false, enum: StudyMood })
  @IsOptional()
  @IsEnum(StudyMood)
  mood?: StudyMood;
}