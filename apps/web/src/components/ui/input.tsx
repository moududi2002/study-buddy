// ============================================================
// Path: apps/web/src/components/ui/input.tsx
// ============================================================

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <div
          className={cn(
            'flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 transition-all',
            error
              ? 'border-red-300 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100'
              : 'border-primary-200 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-lavender-200',
          )}
        >
          {icon && <span className="text-primary-400 shrink-0">{icon}</span>}
          <input
            ref={ref}
            className={cn(
              'flex-1 bg-transparent outline-none placeholder:text-primary-300 text-primary-900',
              className,
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 pl-1">{error}</p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';