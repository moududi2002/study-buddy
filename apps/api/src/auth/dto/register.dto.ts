// apps/api/src/auth/dto/register.dto.ts 

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { AcademicGroup } from '../../generated/prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail({}, { message: 'সঠিক ইমেইল দিন' })
  email: string;

  @ApiProperty({ example: 'student_2026' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'ইউজারনেমে শুধু ইংরেজি অক্ষর, সংখ্যা ও _ ব্যবহার করা যাবে',
  })
  username: string;

  @ApiProperty({ example: 'শিক্ষার্থীর নাম' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  fullName: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({
    example: 11,
    description: 'Class 6–12',
  })
  @IsInt()
  @Min(6)
  @Max(12)
  classLevel: number;

  @ApiPropertyOptional({
    enum: AcademicGroup,
    description: 'Class 9–12-এর জন্য বাধ্যতামূলক',
  })
  @IsOptional()
  @IsEnum(AcademicGroup)
  academicGroup?: AcademicGroup;
}
