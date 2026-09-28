// ============================================================
// Path: apps/api/src/study-entries/dto/create-study-entry.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StudyMood } from '../../generated/prisma/client';

export class CreateStudyEntryDto {
  @ApiProperty({ example: 'clx1234subject' })
  @IsString()
  subjectId: string;

  @ApiProperty({ example: '2025-01-15', description: 'YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'তারিখ সঠিক নয় (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ example: 45, description: 'মিনিটে (1 - 1440)' })
  @IsInt({ message: 'সময় সংখ্যায় দাও' })
  @Min(1, { message: 'সময় কমপক্ষে ১ মিনিট' })
  @Max(1440, { message: 'একদিনে ২৪ ঘণ্টার বেশি হতে পারে না' })
  durationMinutes: number;

  @ApiProperty({ required: false, example: 'অধ্যায় ৩: বীজগণিত' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  chapter?: string;

  @ApiProperty({ required: false, example: 'আজ অংকগুলো ভালোভাবে বুঝেছি' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ enum: StudyMood, example: 'HAPPY' })
  @IsEnum(StudyMood, { message: 'মুড সঠিক নয়' })
  mood: StudyMood;
}