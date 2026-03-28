'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { getPlatformColor, getPlatformBrand } from '@/utils/platformConfig';
import { useApp } from '@/context/AppContext';

interface MatrixRow {
  channel: string;
  genre_kr: string;
  total_sales: number;
}

interface Props {
  startDate: string;
  endDate: string;
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

export default function PlatformGenreMatrix({ startDate, endDate }: Props) {
  const { formatCurrency, t } = useApp();
  const [data, setData] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        const res = await fetch(`/api/analysis/platform-genre-matrix?${params}`);
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData([]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [startDate, endDate]);

  const { chartData, channels } = useMemo(() => {
    const genreSet = new Set<string>();
    const channelSet = new Set<string>();
    for (const row of data) {
      genreSet.add(row.genre_kr);
      channelSet.add(row.channel);
    }
    const genres = Array.from(genreSet);
    const channels = Array.from(channelSet);

    // Build stacked bar data: each genre is a bar, stacked by channel
    const chartData = genres.map((genre) => {
      const point: Record<string, string | number> = { genre };
      for (const ch of channels) {
        const match = data.find((r) => r.channel === ch && r.genre_kr === genre);
        point[ch] = match?.total_sales ?? 0;
      }
      return point;
    });

    // Sort by total sales descending
    chartData.sort((a, b) => {
      const totalA = channels.reduce((sum, ch) => sum + (Number(a[ch]) || 0), 0);
      const totalB = channels.reduce((sum, ch) => sum + (Number(b[ch]) || 0), 0);
      return totalB - totalA;
    });

    return { chartData: chartData.slice(0, 15), genres, channels };
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <p className="text-center py-8" style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
        {t('장르 데이터가 없습니다', 'ジャンルデータがありません')}
      </p>
    );
  }

  const formatShort = (v: number) => {
    if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}億`;
    if (v >= 10_000) return `${(v / 10_000).toFixed(0)}万`;
    return v.toLocaleString();
  };

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 35)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" horizontal={false} />
        <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} />
        <YAxis
          type="category"
          dataKey="genre"
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={80}
          tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + '...' : v}
        />
        <ReTooltip
          {...darkTooltipStyle}
          formatter={(v: unknown, name: unknown) => [formatCurrency(Number(v ?? 0)), getPlatformBrand(String(name)).nameJP || String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)' }} formatter={(v: string) => getPlatformBrand(v).nameJP || v} />
        {channels.map((ch) => (
          <Bar key={ch} dataKey={ch} stackId="a" fill={getPlatformColor(ch)} fillOpacity={0.8} barSize={20} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
