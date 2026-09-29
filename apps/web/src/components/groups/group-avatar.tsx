// ============================================================
// Path: apps/web/src/components/groups/group-avatar.tsx
// ============================================================

'use client';

import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_URL } from '@/lib/api';

export function GroupAvatar({
  name,
  imageUrl,
  size = 48,
  className,
}: {
  name: string;
  imageUrl: string | null;
  size?: number;
  className?: string;
}) {
  const fullUrl = imageUrl
    ? imageUrl.startsWith('http')
      ? imageUrl
      : `${API_URL.replace('/api/v1', '')}${imageUrl}`
    : null;

  if (fullUrl) {
    return (
      <img
        src={fullUrl}
        alt={name}
        width={size}
        height={size}
        className={cn('rounded-2xl object-cover ring-2 ring-lavender-200', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl gradient-primary flex items-center justify-center text-white font-bold',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Users size={size * 0.45} />
    </div>
  );
}