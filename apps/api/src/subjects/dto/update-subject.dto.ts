// ============================================================
// Path: apps/api/src/subjects/dto/update-subject.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSubjectDto {
  @ApiProperty({ required: false, example: 'সাধারণ গণিত' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @ApiProperty({ required: false, example: '#F472B6' })
  @IsOptional()
  @IsHexColor({ message: 'রং সঠিক hex ফরম্যাটে দিন' })
  color?: string;

  @ApiProperty({ required: false, example: '🧮' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4)
  icon?: string;
}