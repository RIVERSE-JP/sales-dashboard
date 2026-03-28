'use client';

import { GLASS_CARD } from './constants';

export function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl p-5 animate-pulse" style={GLASS_CARD}>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-glass)]" />
            <div className="flex-1">
              <div className="h-4 w-48 rounded skeleton-shimmer mb-2" />
              <div className="h-3 w-32 rounded skeleton-shimmer" />
            </div>
            <div className="h-5 w-24 rounded skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 360 }: { height?: number }) {
  return (
    <div className="rounded-2xl p-6 animate-pulse" style={{ ...GLASS_CARD, minHeight: height }}>
      <div className="h-4 w-40 rounded skeleton-shimmer mb-6" />
      <div className="flex items-end gap-1" style={{ height: height - 100 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-t bg-[var(--color-glass)]" style={{ height: `${30 + ((i * 37 + 13) % 60)}%` }} />
        ))}
      </div>
    </div>
  );
}
