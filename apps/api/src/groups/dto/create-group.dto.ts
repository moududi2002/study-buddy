// ============================================================
// Path: apps/api/src/groups/dto/create-group.dto.ts
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'গণিত দল' })
  @IsString()
  @MinLength(2, { message: 'গ্রুপের নাম কমপক্ষে ২ অক্ষরের' })
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({ example: 'প্রতিদিন একসাথে পড়ি!' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ example: 600, description: 'সাপ্তাহিক লক্ষ্য (মিনিট)' })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(100000)
  weeklyTargetMinutes?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  weeklyTargetChapters?: number;
}