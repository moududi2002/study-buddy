// ============================================================
// Path: apps/api/src/groups/dto/respond-invitation.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class RespondInvitationDto {
  @ApiProperty({ enum: ['ACCEPTED', 'REJECTED'] })
  @IsIn(['ACCEPTED', 'REJECTED'], { message: 'সিদ্ধান্ত সঠিক নয়' })
  action: 'ACCEPTED' | 'REJECTED';
}