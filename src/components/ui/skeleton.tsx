import * as React from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Skeleton (generic block)                                           */
/* ------------------------------------------------------------------ */

type SkeletonProps = React.ComponentPropsWithoutRef<'div'>;

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'animate-shimmer rounded-md bg-muted',
        className,
      )}
      {...props}
    />
  ),
);
Skeleton.displayName = 'Skeleton';

/* ------------------------------------------------------------------ */
/*  SkeletonCard                                                       */
/* ------------------------------------------------------------------ */

type SkeletonCardProps = React.ComponentPropsWithoutRef<'div'>;

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-card p-6 space-y-4',
        className,
      )}
      {...props}
    >
      {/* Title line */}
      <Skeleton className="h-4 w-2/5" />
      {/* Description line */}
      <Skeleton className="h-3 w-3/4" />
      {/* Body block */}
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  ),
);
SkeletonCard.displayName = 'SkeletonCard';

/* ------------------------------------------------------------------ */
/*  SkeletonChart                                                      */
/* ------------------------------------------------------------------ */

type SkeletonChartProps = React.ComponentPropsWithoutRef<'div'>;

const SkeletonChart = React.forwardRef<HTMLDivElement, SkeletonChartProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-card p-6 space-y-4',
        className,
      )}
      {...props}
    >
      {/* Chart title placeholder */}
      <Skeleton className="h-4 w-1/3" />

      {/* Chart area placeholder -- rounded box with shimmer */}
      <Skeleton className="h-48 w-full rounded-xl" />

      {/* Legend row */}
      <div className="flex items-center gap-4 pt-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  ),
);
SkeletonChart.displayName = 'SkeletonChart';

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { Skeleton, SkeletonCard, SkeletonChart };
