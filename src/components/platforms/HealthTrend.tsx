'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { getPlatformColor } from '@/utils/platformConfig';
import { useApp } from '@/context/AppContext';

interface MonthlyHealth {
  month: string;
  total_sales: number;
  active_titles: number;
  days_with_sales: number;
  daily_avg: number;
}

interface Props {
  channel: string;
  months?: number;
}

const darkTooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--color-tooltip-bg)',
    border: '1px solid var(--color-tooltip-border)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
    padding: '14px 18px',
  },
  labelStyle: { color: 'var(--color-tooltip-label)', fontWeight: 600, fontSize: '12px', marginBottom: '6px' },
  itemStyle: { color: 'var(--color-tooltip-value)', fontWeight: 700, fontSize: '14px' },
};

export default function HealthTrend({ channel, months = 6 }: Props) {
  const { formatCurrency, t } = useApp();
  const [data, setData] = useState<MonthlyHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const color = getPlatformColor(channel);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ channel, months: String(months) });
        const res = await fetch(`/api/analysis/platform-health?${params}`);
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        if (!cancelled) setData(json.monthly_health ?? []);
      } catch {
        if (!cancelled) setData([]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [channel, months]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-center py-6" style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
        {t('건강도 데이터가 없습니다', 'ヘルスデータがありません')}
      </p>
    );
  }

  const formatShort = (v: number) => {
    if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}億`;
    if (v >= 10_000) return `${(v / 10_000).toFixed(0)}万`;
    return v.toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Active titles trend */}
      <div>
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          {t('활성 작품 수 추이', 'アクティブタイトル数推移')}
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
            <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [String(v), t('작품 수', 'タイトル数')]} />
            <Line type="monotone" dataKey="active_titles" stroke={color} strokeWidth={2} dot={{ fill: color, r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily avg trend */}
      <div>
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          {t('일평균 매출 추이', '日平均売上推移')}
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`healthGrad-${channel.replace(/[^a-zA-Z0-9]/g, '_')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={50} tickFormatter={formatShort} />
            <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('일평균', '日平均')]} />
            <Area
              type="monotone"
              dataKey="daily_avg"
              stroke={color}
              strokeWidth={2}
              fill={`url(#healthGrad-${channel.replace(/[^a-zA-Z0-9]/g, '_')})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
