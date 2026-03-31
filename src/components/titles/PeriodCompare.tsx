'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { CalendarDays } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { GLASS_CARD, cardVariants, darkTooltipStyle } from './constants';

interface PeriodCompareProps {
  monthlyTrend: Array<{ month: string; sales: number }>;
  periodA: { start: string; end: string };
  periodB: { start: string; end: string };
  setPeriodA: (v: { start: string; end: string }) => void;
  setPeriodB: (v: { start: string; end: string }) => void;
  t: (ko: string, ja: string) => string;
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-glass)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: '8px',
  padding: '4px 8px',
  fontSize: '12px',
  outline: 'none',
};

export function PeriodCompare({ monthlyTrend, periodA, periodB, setPeriodA, setPeriodB, t }: PeriodCompareProps) {
  const { formatCurrency } = useApp();

  const chartData = useMemo(() => {
    const sumRange = (start: string, end: string) => {
      return monthlyTrend
        .filter((m) => m.month >= start && m.month <= end)
        .reduce((sum, m) => sum + m.sales, 0);
    };
    const salesA = sumRange(periodA.start, periodA.end);
    const salesB = sumRange(periodB.start, periodB.end);
    return [
      { name: `A: ${periodA.start}~${periodA.end}`, sales: salesA, color: '#3B6FF6' },
      { name: `B: ${periodB.start}~${periodB.end}`, sales: salesB, color: '#f472b6' },
    ];
  }, [monthlyTrend, periodA, periodB]);

  const diff = chartData[1].sales - chartData[0].sales;
  const diffPct = chartData[0].sales > 0 ? (diff / chartData[0].sales) * 100 : 0;

  return (
    <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={16} color="var(--color-text-secondary)" />
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('기간 비교', '期間比較')}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl p-3" style={{ background: 'var(--color-glass)' }}>
          <p className="text-xs mb-2 font-medium" style={{ color: '#3B6FF6' }}>{t('A기간', 'A期間')}</p>
          <div className="flex gap-2">
            <input type="month" value={periodA.start} onChange={(e) => setPeriodA({ ...periodA, start: e.target.value })} style={inputStyle} />
            <span className="text-xs self-center" style={{ color: 'var(--color-text-muted)' }}>~</span>
            <input type="month" value={periodA.end} onChange={(e) => setPeriodA({ ...periodA, end: e.target.value })} style={inputStyle} />
          </div>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'var(--color-glass)' }}>
          <p className="text-xs mb-2 font-medium" style={{ color: '#f472b6' }}>{t('B기간', 'B期間')}</p>
          <div className="flex gap-2">
            <input type="month" value={periodB.start} onChange={(e) => setPeriodB({ ...periodB, start: e.target.value })} style={inputStyle} />
            <span className="text-xs self-center" style={{ color: 'var(--color-text-muted)' }}>~</span>
            <input type="month" value={periodB.end} onChange={(e) => setPeriodB({ ...periodB, end: e.target.value })} style={inputStyle} />
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => v >= 100_000_000 ? `${(v / 100_000_000).toFixed(1)}億` : v >= 10_000 ? `${(v / 10_000).toFixed(0)}万` : String(v)} />
          <YAxis type="category" dataKey="name" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
          <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('매출', '売上')]} />
          <Bar dataKey="sales" radius={[0, 6, 6, 0]} barSize={28}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 text-center">
        <span className="text-sm font-semibold" style={{ color: diff >= 0 ? '#22c55e' : '#ef4444' }}>
          B vs A: {diff >= 0 ? '+' : ''}{diffPct.toFixed(1)}% ({formatCurrency(Math.abs(diff))})
        </span>
      </div>
    </motion.div>
  );
}
