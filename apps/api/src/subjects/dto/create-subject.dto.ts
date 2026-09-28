// ============================================================
// Path: apps/api/src/subjects/dto/create-subject.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import {
  IsHexColor,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSubjectDto {
  @ApiProperty({ example: 'উচ্চতর গণিত' })
  @IsString()
  @MinLength(1, { message: 'বিষয়ের নাম দিন' })
  @MaxLength(40, { message: 'নাম সর্বোচ্চ ৪০ অক্ষরের' })
  name: string;

  @ApiProperty({ example: '#A78BFA', description: 'Hex color' })
  @IsHexColor({ message: 'রং সঠিক hex ফরম্যাটে দিন (যেমন #A78BFA)' })
  color: string;

  @ApiProperty({ example: '📐', description: 'একটি emoji আইকন' })
  @IsString()
  @MinLength(1)
  @MaxLength(4, { message: 'একটি emoji ব্যবহার করুন' })
  icon: string;
}