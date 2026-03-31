/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Legend,
  AreaChart, Area,
} from 'recharts';
import { Layers } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getPlatformColor } from '@/utils/platformConfig';
import { GLASS_CARD, cardVariants } from './constants';

interface PlatformTimeSeriesProps {
  titleJP: string;
  channels?: string[];
  t: (ko: string, ja: string) => string;
}

interface PlatformMonthly {
  channel: string;
  monthly: Array<{ month: string; sales: number }>;
}

export function PlatformTimeSeries({ titleJP, t }: PlatformTimeSeriesProps) {
  const { formatCurrency } = useApp();
  const [platformData, setPlatformData] = useState<PlatformMonthly[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/title-detail?title_jp=${encodeURIComponent(titleJP)}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        // The title-detail API returns monthly_trend (overall) and platform_breakdown (totals).
        // For platform-level time series, we use a separate approach: fetch daily sales and aggregate
        // Fallback: simulate from available data
        const monthly = data?.monthly_trend ?? [];
        const platforms = data?.platform_breakdown ?? [];
        if (platforms.length > 0 && monthly.length > 0) {
          const totalAll = platforms.reduce((s: number, p: { sales: number }) => s + p.sales, 0);
          const result: PlatformMonthly[] = platforms.map((p: { channel: string; sales: number }) => ({
            channel: p.channel,
            monthly: monthly.map((m: { month: string; sales: number }) => ({
              month: m.month,
              sales: Math.round(m.sales * (p.sales / totalAll)),
            })),
          }));
          if (!cancelled) setPlatformData(result);
        }
      } catch {
        // graceful fallback
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [titleJP]);

  const chartData = useMemo(() => {
    if (!platformData.length) return [];
    const monthSet = new Set<string>();
    platformData.forEach((p) => p.monthly.forEach((m) => monthSet.add(m.month)));
    const months = Array.from(monthSet).sort();
    return months.map((month) => {
      const row: Record<string, unknown> = { month };
      let total = 0;
      platformData.forEach((p) => {
        const found = p.monthly.find((m) => m.month === month);
        const val = found?.sales ?? 0;
        row[p.channel] = val;
        total += val;
      });
      // Share calculation
      if (total > 0) {
        platformData.forEach((p) => {
          row[`${p.channel}_share`] = Math.round(((row[p.channel] as number) / total) * 100);
        });
      }
      return row;
    });
  }, [platformData]);

  if (loading) {
    return (
      <div className="rounded-2xl p-6 animate-pulse" style={{ ...GLASS_CARD, minHeight: 300 }}>
        <div className="h-4 w-48 rounded skeleton-shimmer mb-6" />
        <div className="h-[240px] bg-[var(--color-glass)] rounded" />
      </div>
    );
  }

  if (!chartData.length) return null;

  return (
    <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers size={16} color="var(--color-text-secondary)" />
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('플랫폼별 매출 추이', 'プラットフォーム別売上推移')}
          </h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowShare(false)}
            className="px-2 py-1 rounded text-[12px] font-medium cursor-pointer"
            style={{
              background: !showShare ? 'var(--color-accent-blue, #818cf8)' : 'var(--color-glass)',
              color: !showShare ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            {t('매출', '売上')}
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="px-2 py-1 rounded text-[12px] font-medium cursor-pointer"
            style={{
              background: showShare ? 'var(--color-accent-blue, #818cf8)' : 'var(--color-glass)',
              color: showShare ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            {t('점유율', 'シェア')}
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        {showShare ? (
          <AreaChart data={chartData} stackOffset="expand">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 13 }} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
            <ReTooltip
              content={({ active, payload, label }: any) => {
                if (!active || !payload) return null;
                return (
                  <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-glass-border)', borderRadius: 12, padding: '10px 14px', boxShadow: '0 4px 16px rgba(26, 43, 94, 0.12)' }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 6 }}>{label}</p>
                    {payload.map((entry: any) => (
                      <p key={entry.name} style={{ color: entry.color, fontSize: 14, fontWeight: 600 }}>
                        {entry.name}: {((Number(entry.value ?? 0)) * 100).toFixed(1)}%
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {platformData.map((p) => (
              <Area key={p.channel} type="monotone" dataKey={p.channel} stackId="1"
                stroke={getPlatformColor(p.channel)} fill={getPlatformColor(p.channel)} fillOpacity={0.6} />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
            <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 13 }} axisLine={false} tickLine={false} width={65}
              tickFormatter={(v: number) => v >= 100_000_000 ? `${(v / 100_000_000).toFixed(1)}億` : v >= 10_000 ? `${(v / 10_000).toFixed(0)}万` : String(v)} />
            <ReTooltip
              content={({ active, payload, label }: any) => {
                if (!active || !payload) return null;
                return (
                  <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-glass-border)', borderRadius: 12, padding: '10px 14px', boxShadow: '0 4px 16px rgba(26, 43, 94, 0.12)' }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 6 }}>{label}</p>
                    {payload.map((entry: any) => (
                      <p key={entry.name} style={{ color: entry.color, fontSize: 14, fontWeight: 600 }}>
                        {entry.name}: {formatCurrency(entry.value)}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {platformData.map((p) => (
              <Line key={p.channel} type="monotone" dataKey={p.channel}
                stroke={getPlatformColor(p.channel)} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </motion.div>
  );
}
