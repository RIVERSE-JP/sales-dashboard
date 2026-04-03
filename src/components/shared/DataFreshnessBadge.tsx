'use client';

import { useApp } from '@/context/AppContext';

interface DataFreshnessBadgeProps {
  lastUpdate?: string;
  hasPreliminary?: boolean;
}

export default function DataFreshnessBadge({ lastUpdate }: DataFreshnessBadgeProps) {
  const { t } = useApp();

  return (
    <div className="flex items-center gap-2 text-xs">
      {lastUpdate && (
        <span className="text-[var(--color-text-muted)]">
          {t('최종 업데이트', '最終更新')}: {lastUpdate}
        </span>
      )}
    </div>
  );
}
