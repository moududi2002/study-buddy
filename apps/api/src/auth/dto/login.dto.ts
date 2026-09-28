// ============================================================
// Path: apps/api/src/auth/dto/login.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'monira@example.com অথবা munira_2010',
    description: 'ইমেইল অথবা ইউজারনেম',
  })
  @IsString()
  @MinLength(3)
  identifier: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8, { message: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের' })
  password: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
