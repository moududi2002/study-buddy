// ============================================================
// Path: apps/api/src/friends/dto/search-friends.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class SearchFriendsDto {
  @ApiProperty({ example: 'munira', description: 'ইউজারনেম বা ইমেইলের অংশ' })
  @IsString()
  @MinLength(2, { message: 'অন্তত ২ অক্ষর দাও' })
  q!: string;

  @ApiProperty({ required: false, default: 20, description: '1-30' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}