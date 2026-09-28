// ============================================================
// Path: apps/web/src/components/ui/badge.tsx
// ============================================================

import * as React from 'react';
import { cn } from '@/lib/utils';

type Color = 'primary' | 'pink' | 'peach' | 'mint' | 'star' | 'gray';

const colors: Record<Color, string> = {
  primary: 'bg-lavender-100 text-primary-700 border-primary-200',
  pink: 'bg-pink-soft-100 text-pink-soft-400 border-pink-soft-200',
  peach: 'bg-peach-100 text-peach-400 border-peach-200',
  mint: 'bg-mint-100 text-mint-500 border-mint-300',
  star: 'bg-yellow-50 text-amber-600 border-amber-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function Badge({
  children,
  color = 'primary',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { color?: Color }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-semibold',
        colors[color],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}