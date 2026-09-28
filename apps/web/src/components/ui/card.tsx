// ============================================================
// Path: apps/web/src/components/ui/card.tsx
// ============================================================

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
  hover,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn(
        'card-soft p-5',
        hover && 'card-soft-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}