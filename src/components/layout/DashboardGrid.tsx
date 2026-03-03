import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

/**
 * Responsive dashboard grid layout.
 * Standardizes grid columns across all pages.
 */
export function DashboardGrid({ children, cols = 4, className }: DashboardGridProps) {
  return (
    <div
      className={cn(
        'grid gap-5',
        cols === 1 && 'grid-cols-1',
        cols === 2 && 'grid-cols-1 lg:grid-cols-2',
        cols === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
