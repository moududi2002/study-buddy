// ============================================================
// Path: apps/api/src/study-entries/dto/query-study-entry.dto.ts
// ============================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class QueryStudyEntryDto {
  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2025-01-31' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ example: 'clx1234subject' })
  @IsOptional()
  @IsString()
  subjectId?: string;
}