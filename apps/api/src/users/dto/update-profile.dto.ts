// ============================================================
// Path: apps/api/src/users/dto/update-profile.dto.ts
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

import { IsEnum } from 'class-validator';
import { AcademicGroup } from '../../generated/prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'সিরাজুম মুনিরা' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'নাম কমপক্ষে ২ অক্ষরের হতে হবে' })
  @MaxLength(60)
  fullName?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(6, { message: 'ক্লাস ৬ থেকে ১২ এর মধ্যে হতে হবে' })
  @Max(12, { message: 'ক্লাস ৬ থেকে ১২ এর মধ্যে হতে হবে' })
  classLevel?: number;

  @ApiPropertyOptional({ example: true, description: 'প্রোফাইল পাবলিক রাখো?' })
  @IsOptional()
  @IsBoolean()
  isProfilePublic?: boolean;


@ApiPropertyOptional({
  enum: AcademicGroup,
  description: 'Class 9–12-এর বিভাগ',
})
@IsOptional()
@IsEnum(AcademicGroup)
academicGroup?: AcademicGroup;
}