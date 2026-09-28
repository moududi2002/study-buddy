// ============================================================
// Path: apps/api/src/auth/dto/auth-response.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() username: string;
  @ApiProperty() fullName: string;
  @ApiProperty() classLevel: number;
  @ApiProperty({ nullable: true }) avatarUrl: string | null;
  @ApiProperty() role: string;
  @ApiProperty() xp: number;
  @ApiProperty() level: number;
  @ApiProperty() currentStreak: number;
  @ApiProperty() longestStreak: number;
  @ApiProperty() isEmailVerified: boolean;
  @ApiProperty() createdAt: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
  @ApiProperty() accessToken: string;
}