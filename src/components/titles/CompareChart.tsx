'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { X, GitCompare } from 'lucide-react';
import { fetchTitleDetail } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';
import { GLASS_CARD, cardVariants, darkTooltipStyle, COMPARE_COLORS } from './constants';

interface CompareChartProps {
  selectedTitles: string[];
  onClose: () => void;
  t: (ko: string, ja: string) => string;
}

interface TitleTrend {
  titleJP: string;
  monthly: Array<{ month: string; sales: number }>;
}

export function CompareChart({ selectedTitles, onClose, t }: CompareChartProps) {
  const { formatCurrency } = useApp();
  const [trends, setTrends] = useState<TitleTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const results = await Promise.all(
        selectedTitles.map(async (titleJP) => {
          const data = await fetchTitleDetail(titleJP);
          return { titleJP, monthly: data?.monthly_trend ?? [] };
        })
      );
      if (!cancelled) {
        setTrends(results);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedTitles]);

  const chartData = useMemo(() => {
    const monthSet = new Set<string>();
    trends.forEach((t) => t.monthly.forEach((m) => monthSet.add(m.month)));
    const months = Array.from(monthSet).sort();
    return months.map((month) => {
      const row: Record<string, unknown> = { month };
      trends.forEach((t) => {
        const found = t.monthly.find((m) => m.month === month);
        row[t.titleJP] = found?.sales ?? 0;
      });
      return row;
    });
  }, [trends]);

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="show" className="rounded-2xl p-6 mb-6" style={GLASS_CARD}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitCompare size={16} color="var(--color-text-secondary)" />
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('작품 비교', 'タイトル比較')} ({selectedTitles.length})
          </h2>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--color-glass)] cursor-pointer">
          <X size={16} color="var(--color-text-muted)" />
        </button>
      </div>

      {loading ? (
        <div className="h-[320px] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-text-muted)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={60}
              tickFormatter={(v: number) => v >= 100_000_000 ? `${(v / 100_000_000).toFixed(1)}億` : v >= 10_000 ? `${(v / 10_000).toFixed(0)}万` : String(v)} />
            <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), '']} />
            <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--color-text-secondary)' }} />
            {selectedTitles.map((title, idx) => (
              <Line key={title} type="monotone" dataKey={title} stroke={COMPARE_COLORS[idx % COMPARE_COLORS.length]}
                strokeWidth={2} dot={false} name={title.length > 20 ? title.slice(0, 20) + '…' : title} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
