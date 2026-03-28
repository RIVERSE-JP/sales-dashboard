'use client';

interface RankBadgeProps {
  change: number;
}

export default function RankBadge({ change }: RankBadgeProps) {
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-[rgba(16,185,129,0.10)] text-[var(--color-accent-green)]">
        ▲{change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-[rgba(239,68,68,0.10)] text-[var(--color-accent-red)]">
        ▼{Math.abs(change)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-[rgba(139,146,168,0.10)] text-[var(--color-text-muted)]">
      -
    </span>
  );
}
