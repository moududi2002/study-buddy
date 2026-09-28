// ============================================================
// Path: apps/web/src/components/dashboard/section.tsx
// ============================================================

import { cn } from '@/lib/utils';

export function SectionHeader({
  emoji,
  title,
  action,
  className,
}: {
  emoji?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between mb-3 px-1', className)}>
      <h2 className="text-base md:text-lg font-bold text-primary-800 flex items-center gap-2">
        {emoji && <span>{emoji}</span>}
        {title}
      </h2>
      {action}
    </div>
  );
}