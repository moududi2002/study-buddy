// ============================================================
// Path: apps/web/src/components/chat/conversation-avatar.tsx
// ============================================================

'use client';

import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { API_URL } from '@/lib/api';
import { toBnDigits } from '@/lib/bn';

const PRESET_EMOJI: Record<string, string> = {
  cat_smile: '😺',
  cat_sleepy: '😴',
  cat_wink: '😸',
  cat_reader: '📖',
  cat_star: '🌟',
  cat_heart: '💖',
  bunny_happy: '🐰',
  bunny_reader: '📚',
};

export function ConversationAvatar({
  name,
  imageUrl,
  isGroup,
  size = 48,
}: {
  name: string;
  imageUrl: string | null;
  isGroup?: boolean;
  size?: number;
}) {
  const isPreset = imageUrl?.startsWith('preset:');
  const presetEmoji = isPreset
    ? PRESET_EMOJI[imageUrl!.replace('preset:', '')] ?? '🐱'
    : null;

  const fullUrl =
    imageUrl && !isPreset
      ? imageUrl.startsWith('http')
        ? imageUrl
        : `${API_URL.replace('/api/v1', '')}${imageUrl}`
      : null;

  return (
    <Avatar
      className="shrink-0 ring-2 ring-lavender-200"
      style={{ width: size, height: size }}
    >
      {fullUrl && <AvatarImage src={fullUrl} alt={name} />}
      <AvatarFallback className="text-xl">
        {presetEmoji ?? (isGroup ? <Users size={size * 0.4} /> : name[0])}
      </AvatarFallback>
    </Avatar>
  );
}

export function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return `${toBnDigits(String(d.getHours()).padStart(2, '0'))}:${toBnDigits(
      String(d.getMinutes()).padStart(2, '0'),
    )}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'গতকাল';
  return `${toBnDigits(d.getDate())}/${toBnDigits(d.getMonth() + 1)}`;
}