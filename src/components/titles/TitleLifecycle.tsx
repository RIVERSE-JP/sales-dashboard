'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { GLASS_CARD, cardVariants } from './constants';

interface TitleLifecycleProps {
  firstDate: string;
  monthlyTrend: Array<{ month: string; sales: number }>;
  t: (ko: string, ja: string) => string;
}

export function TitleLifecycle({ firstDate, monthlyTrend, t }: TitleLifecycleProps) {
  const { formatCurrency } = useApp();

  const milestones = useMemo(() => {
    if (!monthlyTrend.length) return [];
    const peakMonth = monthlyTrend.reduce((max, m) => m.sales > max.sales ? m : max, monthlyTrend[0]);
    const now = new Date().toISOString().slice(0, 7);
    const items: Array<{ label: string; date: string; detail: string; color: string }> = [];

    items.push({
      label: t('첫 판매', '初売上'),
      date: firstDate?.slice(0, 7) ?? monthlyTrend[0].month,
      detail: '',
      color: '#34d399',
    });

    items.push({
      label: t('최고 매출월', '最高売上月'),
      date: peakMonth.month,
      detail: formatCurrency(peakMonth.sales),
      color: '#fbbf24',
    });

    items.push({
      label: t('현재', '現在'),
      date: now,
      detail: '',
      color: '#818cf8',
    });

    return items;
  }, [firstDate, monthlyTrend, t, formatCurrency]);

  if (!milestones.length) return null;

  return (
    <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
      <div className="flex items-center gap-2 mb-4">
        <Clock size={16} color="var(--color-text-secondary)" />
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('작품 라이프사이클', 'タイトルライフサイクル')}
        </h2>
      </div>

      <div className="relative flex items-center justify-between px-4">
        {/* Connecting line */}
        <div className="absolute left-8 right-8 top-1/2 h-0.5" style={{ background: 'var(--color-glass-border)', transform: 'translateY(-50%)' }} />

        {milestones.map((m, idx) => (
          <div key={idx} className="relative flex flex-col items-center z-10">
            <div className="w-4 h-4 rounded-full mb-2" style={{ background: m.color, boxShadow: `0 0 0 4px var(--color-glass)` }} />
            <p className="text-xs font-semibold" style={{ color: m.color }}>{m.label}</p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{m.date}</p>
            {m.detail && <p className="text-[10px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>{m.detail}</p>}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
