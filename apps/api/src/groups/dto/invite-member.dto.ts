// ============================================================
// Path: apps/api/src/groups/dto/invite-member.dto.ts
// ============================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({ example: 'munira_2010 অথবা munira@example.com' })
  @IsString()
  @MinLength(3, { message: 'ইউজারনেম অথবা ইমেইল দাও' })
  @MaxLength(120)
  identifier!: string;

  @ApiPropertyOptional({ example: 'চলো একসাথে পড়ি!' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;
}