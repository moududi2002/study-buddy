// ============================================================
// Path: apps/api/src/users/dto/select-avatar.dto.ts
// ============================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

// Preset cute avatar keys (frontend maps to emoji/illustration)
export const PRESET_AVATARS = [
  'cat_smile',
  'cat_sleepy',
  'cat_wink',
  'cat_reader',
  'cat_star',
  'cat_heart',
  'bunny_happy',
  'bunny_reader',
] as const;

export type PresetAvatar = (typeof PRESET_AVATARS)[number];

export class SelectAvatarDto {
  @ApiProperty({ example: 'cat_reader', enum: PRESET_AVATARS })
  @IsIn(PRESET_AVATARS, { message: 'অ্যাভাটার সঠিক নয়' })
  preset: PresetAvatar;
}