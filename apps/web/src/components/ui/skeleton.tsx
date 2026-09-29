// ============================================================
// Path: apps/web/src/components/ui/skeleton.tsx
// ============================================================

import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-lavender-200/60',
        className,
      )}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card-soft p-4">
      <Skeleton className="h-8 w-8 rounded-xl mb-3" />
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="card-soft p-5">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-48 w-full rounded-3xl" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-24 w-full rounded-3xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
}