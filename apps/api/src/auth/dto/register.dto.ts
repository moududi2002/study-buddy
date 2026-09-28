// ============================================================
// Path: apps/api/src/auth/dto/register.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'munira@example.com' })
  @IsEmail({}, { message: 'সঠিক ইমেইল দিন' })
  email: string;

  @ApiProperty({ example: 'munira_2010' })
  @IsString()
  @MinLength(3, { message: 'ইউজারনেম কমপক্ষে ৩ অক্ষরের হতে হবে' })
  @MaxLength(20, { message: 'ইউজারনেম সর্বোচ্চ ২০ অক্ষরের' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'ইউজারনেমে শুধু ইংরেজি অক্ষর, সংখ্যা ও _ ব্যবহার করা যাবে',
  })
  username: string;

  @ApiProperty({ example: 'রাফি আহমেদ' })
  @IsString()
  @MinLength(2, { message: 'নাম কমপক্ষে ২ অক্ষরের হতে হবে' })
  @MaxLength(60)
  fullName: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8, { message: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' })
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 9, description: '৬ থেকে ১০' })
  @IsInt()
  @Min(6, { message: 'ক্লাস ৬ থেকে ১০ এর মধ্যে হতে হবে' })
  @Max(10, { message: 'ক্লাস ৬ থেকে ১০ এর মধ্যে হতে হবে' })
  classLevel: number;
}