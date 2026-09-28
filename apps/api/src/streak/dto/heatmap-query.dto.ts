// ============================================================
// Path: apps/api/src/streak/dto/heatmap-query.dto.ts
// ============================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class HeatmapQueryDto {
  @ApiPropertyOptional({ example: 365, description: '1 - 730 দিন' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(730)
  days?: number;
}