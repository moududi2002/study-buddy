// ============================================================
// Path: apps/api/src/users/dto/update-profile.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false, example: 'রাফি আহমেদ' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'নাম কমপক্ষে ২ অক্ষরের হতে হবে' })
  @MaxLength(60)
  fullName?: string;

  @ApiProperty({ required: false, example: 10, description: '৬ থেকে ১০' })
  @IsOptional()
  @IsInt()
  @Min(6, { message: 'ক্লাস ৬ থেকে ১০ এর মধ্যে হতে হবে' })
  @Max(10, { message: 'ক্লাস ৬ থেকে ১০ এর মধ্যে হতে হবে' })
  classLevel?: number;
}