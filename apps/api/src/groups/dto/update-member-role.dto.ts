// ============================================================
// Path: apps/api/src/groups/dto/update-member-role.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ['ADMIN', 'MEMBER'] })
  @IsIn(['ADMIN', 'MEMBER'], { message: 'ভূমিকা সঠিক নয়' })
  role: 'ADMIN' | 'MEMBER';
}