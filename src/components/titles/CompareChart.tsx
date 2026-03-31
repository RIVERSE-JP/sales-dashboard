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
import { GLASS_CARD, cardVariants, COMPARE_COLORS } from './constants';

interface CompareChartProps {
  selectedTitles: string[];
  onClose: () => void;
  t: (ko: string, ja: string) => string;
  /** Optional map of title_jp -> service_launch_date from masterMap */
  launchDates?: Map<string, string | null>;
}

type TimeUnit = 'daily' | 'weekly' | 'monthly';

interface TitleDailyData {
  titleJP: string;
  dailySales: Array<{ date: string; sales: number }>;
  launchDate: string | null;
}

// Custom tooltip component
function CompareTooltip({ active, payload, label, formatCurrency }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatCurrency: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{
      background: 'var(--color-surface, var(--color-glass))',
      border: '1px solid var(--color-glass-border)',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(26, 43, 94, 0.12)',
    }}>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 6 }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, fontSize: 14, fontWeight: 600, margin: '2px 0' }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

function formatYAxis(v: number): string {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}億`;
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}万`;
  return String(v);
}

export function CompareChart({ selectedTitles, onClose, t, launchDates }: CompareChartProps) {
  const { formatCurrency } = useApp();
  const [titleData, setTitleData] = useState<TitleDailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('daily');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const results = await Promise.all(
        selectedTitles.map(async (titleJP) => {
          const data = await fetchTitleDetail(titleJP);
          const launchDate = launchDates?.get(titleJP) ?? null;
          return {
            titleJP,
            dailySales: data?.daily_recent ?? [],
            launchDate,
          };
        })
      );
      if (!cancelled) {
        setTitleData(results);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedTitles, launchDates]);

  const chartData = useMemo(() => {
    if (titleData.length === 0) return [];

    // For each title, compute relative days from launch date (or first data date)
    const titleRelativeData = titleData.map((td) => {
      const sorted = [...td.dailySales].sort((a, b) => a.date.localeCompare(b.date));
      const baseDate = td.launchDate ?? sorted[0]?.date;
      if (!baseDate || sorted.length === 0) return { titleJP: td.titleJP, days: new Map<number, number>() };

      const base = new Date(baseDate);
      const dayMap = new Map<number, number>();

      for (const entry of sorted) {
        const entryDate = new Date(entry.date);
        const dayNum = Math.floor((entryDate.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (dayNum < 1) continue; // Before launch
        dayMap.set(dayNum, (dayMap.get(dayNum) ?? 0) + entry.sales);
      }
      return { titleJP: td.titleJP, days: dayMap };
    });

    if (timeUnit === 'daily') {
      // Find max day across all titles
      let maxDay = 0;
      for (const td of titleRelativeData) {
        for (const d of td.days.keys()) {
          if (d > maxDay) maxDay = d;
        }
      }
      maxDay = Math.min(maxDay, 90);
      const rows: Record<string, unknown>[] = [];
      for (let day = 1; day <= maxDay; day++) {
        const row: Record<string, unknown> = { label: `Day ${day}` };
        for (const td of titleRelativeData) {
          row[td.titleJP] = td.days.get(day) ?? 0;
        }
        rows.push(row);
      }
      return rows;
    }

    if (timeUnit === 'weekly') {
      // Aggregate into weeks (7 days each)
      const maxWeeks = 12;
      const rows: Record<string, unknown>[] = [];
      for (let week = 1; week <= maxWeeks; week++) {
        const row: Record<string, unknown> = { label: `Week ${week}` };
        const dayStart = (week - 1) * 7 + 1;
        const dayEnd = week * 7;
        for (const td of titleRelativeData) {
          let sum = 0;
          for (let d = dayStart; d <= dayEnd; d++) {
            sum += td.days.get(d) ?? 0;
          }
          row[td.titleJP] = sum;
        }
        rows.push(row);
      }
      return rows;
    }

    // monthly
    const maxMonths = 12;
    const rows: Record<string, unknown>[] = [];
    for (let month = 1; month <= maxMonths; month++) {
      const row: Record<string, unknown> = { label: `Month ${month}` };
      const dayStart = (month - 1) * 30 + 1;
      const dayEnd = month * 30;
      for (const td of titleRelativeData) {
        let sum = 0;
        for (let d = dayStart; d <= dayEnd; d++) {
          sum += td.days.get(d) ?? 0;
        }
        row[td.titleJP] = sum;
      }
      rows.push(row);
    }
    return rows;
  }, [titleData, timeUnit]);

  const timeUnitOptions: { key: TimeUnit; ko: string; ja: string }[] = [
    { key: 'daily', ko: '일별', ja: '日別' },
    { key: 'weekly', ko: '주별', ja: '週別' },
    { key: 'monthly', ko: '월별', ja: '月別' },
  ];

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="show" className="rounded-2xl p-6 mb-6" style={GLASS_CARD}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GitCompare size={16} color="var(--color-text-secondary)" />
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('초동 매출 비교', '初動売上比較')} ({selectedTitles.length})
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Time unit toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-glass-border)' }}>
            {timeUnitOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setTimeUnit(opt.key)}
                className="px-2.5 py-1 text-[12px] font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none"
                style={{
                  background: timeUnit === opt.key ? '#1A2B5E' : 'transparent',
                  color: timeUnit === opt.key ? '#ffffff' : 'var(--color-text-muted)',
                  border: 'none',
                }}
              >
                {t(opt.ko, opt.ja)}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--color-glass)] cursor-pointer" style={{ background: 'transparent', border: 'none' }}>
            <X size={16} color="var(--color-text-muted)" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-[320px] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-text-muted)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 13 }}
              axisLine={false}
              tickLine={false}
              interval={timeUnit === 'daily' ? Math.max(Math.floor(chartData.length / 10) - 1, 0) : 0}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-muted)', fontSize: 13 }}
              axisLine={false}
              tickLine={false}
              width={65}
              tickFormatter={formatYAxis}
            />
            <ReTooltip content={<CompareTooltip formatCurrency={formatCurrency} />} />
            <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)' }} />
            {selectedTitles.map((title, idx) => (
              <Line
                key={title}
                type="monotone"
                dataKey={title}
                stroke={COMPARE_COLORS[idx % COMPARE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                name={title.length > 20 ? title.slice(0, 20) + '\u2026' : title}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}
