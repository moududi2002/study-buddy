// ============================================================
// Path: apps/web/src/components/ui/label.tsx
// ============================================================

'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'block text-sm font-medium text-primary-700 mb-1.5 pl-1',
      className,
    )}
    {...props}
  />
));
Label.displayName = 'Label';