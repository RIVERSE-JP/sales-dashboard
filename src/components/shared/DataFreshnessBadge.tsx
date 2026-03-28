'use client';

import { useApp } from '@/context/AppContext';

interface DataFreshnessBadgeProps {
  lastUpdate?: string;
  hasPreliminary?: boolean;
}

export default function DataFreshnessBadge({ lastUpdate, hasPreliminary }: DataFreshnessBadgeProps) {
  const { t } = useApp();

  return (
    <div className="flex items-center gap-2 text-xs">
      {lastUpdate && (
        <span className="text-[var(--color-text-muted)]">
          {t('최종 업데이트', '最終更新')}: {lastUpdate}
        </span>
      )}
      {hasPreliminary && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(245,158,11,0.12)] text-[var(--color-accent-amber)] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-amber)] inline-block" />
          {t('속보치 포함', '速報値含む')}
        </span>
      )}
    </div>
  );
}
