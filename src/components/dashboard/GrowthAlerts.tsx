'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { GLASS_CARD, cardVariants } from './shared';
import type { GrowthAlertRow } from '@/types';

interface GrowthAlertsProps {
  data: GrowthAlertRow[];
}

export default function GrowthAlerts({ data }: GrowthAlertsProps) {
  const { formatCurrency, t } = useApp();

  const declining = data.filter((a) => a.growth_pct <= -30);
  const surging = data.filter((a) => a.growth_pct >= 50);

  if (declining.length === 0 && surging.length === 0) return null;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="show"
      className="rounded-2xl p-6"
      style={GLASS_CARD}
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} color="#f59e0b" />
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('이상 감지', '異常検知')}
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
          {declining.length + surging.length}{t('건', '件')}
        </span>
      </div>

      {/* Surging titles */}
      {surging.length > 0 && (
        <div className="mb-4">
          <p className="text-xs mb-2 font-medium" style={{ color: '#22c55e' }}>
            {t('급증 작품 (+50% 이상)', '急増作品 (+50%以上)')}
          </p>
          <div className="space-y-2">
            {surging.slice(0, 5).map((alert) => (
              <div
                key={`surge-${alert.title_jp}`}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.1)' }}
              >
                <TrendingUp size={16} color="#22c55e" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {alert.title_jp}
                  </p>
                  {alert.title_kr && (
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{alert.title_kr}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: '#22c55e' }}>
                    +{alert.growth_pct.toFixed(1)}%
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {formatCurrency(alert.last_month)} → {formatCurrency(alert.this_month)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Declining titles */}
      {declining.length > 0 && (
        <div>
          <p className="text-xs mb-2 font-medium" style={{ color: '#ef4444' }}>
            {t('급감 작품 (-30% 이상)', '急減作品 (-30%以上)')}
          </p>
          <div className="space-y-2">
            {declining.slice(0, 5).map((alert) => (
              <div
                key={`decline-${alert.title_jp}`}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}
              >
                <TrendingDown size={16} color="#ef4444" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {alert.title_jp}
                  </p>
                  {alert.title_kr && (
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{alert.title_kr}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: '#ef4444' }}>
                    {alert.growth_pct.toFixed(1)}%
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {formatCurrency(alert.last_month)} → {formatCurrency(alert.this_month)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
