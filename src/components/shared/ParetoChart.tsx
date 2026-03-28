'use client';

import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

interface ParetoChartProps {
  data: Array<{ name: string; value: number }>;
  topNLabel?: string;
}

export default function ParetoChart({ data, topNLabel }: ParetoChartProps) {
  const { t } = useApp();

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((s, d) => s + d.value, 0);
    let cumulative = 0;
    return sorted.map((d) => {
      // eslint-disable-next-line react-hooks/immutability -- accumulator pattern in useMemo is safe
      cumulative += d.value;
      return {
        name: d.name,
        value: d.value,
        cumulativePercent: total > 0 ? (cumulative / total) * 100 : 0,
      };
    });
  }, [data]);

  return (
    <div className="glass-card p-5 space-y-3">
      {topNLabel && (
        <p className="text-xs text-[var(--color-text-muted)]">{topNLabel}</p>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border-subtle)' }}
          />
          <YAxis
            yAxisId="value"
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="percent"
            orientation="right"
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-tooltip-bg)',
              border: '1px solid var(--color-tooltip-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--color-tooltip-label)' }}
            itemStyle={{ color: 'var(--color-tooltip-value)' }}
            formatter={((val: number | undefined, name: string) => {
              const v = val ?? 0;
              if (name === 'cumulativePercent') return [`${v.toFixed(1)}%`, t('누적 비율', '累積比率')];
              return [v.toLocaleString(), t('매출', '売上')];
            }) as never}
          />
          <ReferenceLine
            yAxisId="percent"
            y={80}
            stroke="var(--color-accent-amber)"
            strokeDasharray="4 4"
            label={{ value: '80%', position: 'right', fontSize: 10, fill: 'var(--color-accent-amber)' }}
          />
          <Bar
            yAxisId="value"
            dataKey="value"
            fill="var(--color-accent-blue)"
            radius={[4, 4, 0, 0]}
            opacity={0.85}
          />
          <Line
            yAxisId="percent"
            dataKey="cumulativePercent"
            type="monotone"
            stroke="var(--color-accent-purple)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-accent-purple)' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
