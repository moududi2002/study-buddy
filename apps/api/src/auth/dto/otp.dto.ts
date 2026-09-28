// ============================================================
// Path: apps/api/src/auth/dto/otp.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength, MaxLength } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: 'rafi@example.com' })
  @IsEmail({}, { message: 'সঠিক ইমেইল দিন' })
  email: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'rafi@example.com' })
  @IsEmail({}, { message: 'সঠিক ইমেইল দিন' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 8, { message: 'কোড সঠিক নয়' })
  otp: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'rafi@example.com' })
  @IsEmail({}, { message: 'সঠিক ইমেইল দিন' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'rafi@example.com' })
  @IsEmail({}, { message: 'সঠিক ইমেইল দিন' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 8, { message: 'কোড সঠিক নয়' })
  otp: string;

  @ApiProperty({ example: 'NewStrongPass123!' })
  @IsString()
  @MinLength(8, { message: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' })
  @MaxLength(72)
  newPassword: string;
}