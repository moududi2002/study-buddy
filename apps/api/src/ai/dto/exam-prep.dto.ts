// ============================================================
// Path: apps/api/src/ai/dto/exam-prep.dto.ts
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ExamPrepDto {
  @ApiPropertyOptional({ example: 'গণিত' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  subject?: string;

  @ApiPropertyOptional({ example: 14, description: '1 - 365' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  daysUntilExam?: number;
}

export class AiQueryDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsString()
  refresh?: string;
}