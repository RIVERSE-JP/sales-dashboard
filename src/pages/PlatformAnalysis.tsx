import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { Monitor, TrendingUp, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Platform, TimeGranularity } from '@/types';
import { getPlatformColor, getPlatformBrand } from '@/utils/platformConfig';
import { startOfWeek, format, parseISO } from 'date-fns';

// ============================================================
// Shared styles & animation variants
// ============================================================

const GLASS_CARD = {
  background: 'var(--color-glass)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: '16px',
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const darkTooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--color-tooltip-bg)',
    border: '1px solid var(--color-tooltip-border)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    padding: '12px 16px',
  },
  labelStyle: { color: 'var(--color-tooltip-label)', fontWeight: 600, fontSize: '12px', marginBottom: '4px' },
  itemStyle: { color: 'var(--color-tooltip-value)', fontWeight: 700, fontSize: '13px' },
};

// ============================================================
// Helpers
// ============================================================

function formatYen(value: number): string {
  if (value >= 100_000_000) return `¥${(value / 100_000_000).toFixed(2)}億`;
  if (value >= 10_000) return `¥${(value / 10_000).toFixed(1)}万`;
  return `¥${value.toLocaleString()}`;
}

function formatYenShort(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}億`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}万`;
  return value.toLocaleString();
}

interface SalesRow {
  sale_date: string;
  sales_amount: number;
  channel: string;
  title_jp: string;
  title_kr: string | null;
}

interface TimeSeriesPoint {
  period: string;
  label: string;
  [key: string]: string | number;
}

interface TitleRank {
  titleJP: string;
  titleKR: string | null;
  totalSales: number;
}

// ============================================================
// Loading Skeletons
// ============================================================

function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl p-6 animate-pulse" style={{ ...GLASS_CARD, minHeight: 120 }}>
          <div className="h-3 w-20 rounded skeleton-shimmer mb-4" />
          <div className="h-7 w-28 rounded skeleton-shimmer mb-2" />
          <div className="h-3 w-16 rounded skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton({ height = 360 }: { height?: number }) {
  return (
    <div className="rounded-2xl p-6 animate-pulse" style={{ ...GLASS_CARD, minHeight: height }}>
      <div className="h-4 w-40 rounded skeleton-shimmer mb-6" />
      <div className="flex items-end gap-1" style={{ height: height - 100 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-t bg-[var(--color-glass)]" style={{ height: `${30 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Data aggregation
// ============================================================

function aggregateTimeSeries(
  rows: SalesRow[],
  granularity: TimeGranularity,
  platforms: string[],
): TimeSeriesPoint[] {
  const map = new Map<string, Record<string, number>>();

  for (const row of rows) {
    if (!platforms.includes(row.channel)) continue;
    let key: string;
    const d = parseISO(row.sale_date);
    switch (granularity) {
      case 'daily': key = row.sale_date; break;
      case 'weekly': key = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'); break;
      case 'monthly': key = format(d, 'yyyy-MM'); break;
    }
    const bucket = map.get(key) ?? {};
    bucket[row.channel] = (bucket[row.channel] ?? 0) + row.sales_amount;
    map.set(key, bucket);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, buckets]) => {
      let label: string;
      switch (granularity) {
        case 'daily': label = format(parseISO(period), 'M/d'); break;
        case 'weekly': label = format(parseISO(period), 'M/d') + '~'; break;
        case 'monthly': label = period.slice(0, 7); break;
      }
      return { period, label, ...buckets };
    });
}

function computeTopTitles(rows: SalesRow[], platform: string, limit = 10): TitleRank[] {
  const map = new Map<string, { titleKR: string | null; total: number }>();
  for (const row of rows) {
    if (row.channel !== platform) continue;
    const existing = map.get(row.title_jp);
    if (existing) {
      existing.total += row.sales_amount;
      if (row.title_kr && !existing.titleKR) existing.titleKR = row.title_kr;
    } else {
      map.set(row.title_jp, { titleKR: row.title_kr, total: row.sales_amount });
    }
  }
  return Array.from(map.entries())
    .map(([titleJP, v]) => ({ titleJP, titleKR: v.titleKR, totalSales: v.total }))
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, limit);
}

// ============================================================
// Main Component
// ============================================================

export function PlatformAnalysis() {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesRow[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePlatforms, setComparePlatforms] = useState<string[]>([]);
  const [granularity, setGranularity] = useState<TimeGranularity>('weekly');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [salesRes, platformRes] = await Promise.all([
        supabase.from('daily_sales_v2').select('sale_date, sales_amount, channel, title_jp, title_kr'),
        supabase.from('platforms').select('*').eq('is_active', true).order('sort_order'),
      ]);
      const sales = (salesRes.data as SalesRow[] | null) ?? [];
      const pfs = (platformRes.data as Platform[] | null) ?? [];
      setSalesData(sales);
      setPlatforms(pfs);

      const allChannels = [...new Set(sales.map((r) => r.channel))];
      if (allChannels.length > 0) setSelectedPlatform(allChannels[0]);
      setLoading(false);
    }
    load();
  }, []);

  const platformNames = useMemo(() => {
    const fromData = [...new Set(salesData.map((r) => r.channel))];
    return fromData.sort((a, b) => {
      const aIdx = platforms.findIndex((p) => p.code === a || p.name_jp === a);
      const bIdx = platforms.findIndex((p) => p.code === b || p.name_jp === b);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
  }, [salesData, platforms]);

  const kpis = useMemo(() => {
    if (!selectedPlatform) return { totalSales: 0, titleCount: 0, dailyAvg: 0 };
    const filtered = salesData.filter((r) => r.channel === selectedPlatform);
    const totalSales = filtered.reduce((s, r) => s + r.sales_amount, 0);
    const titles = new Set(filtered.map((r) => r.title_jp));
    const days = new Set(filtered.map((r) => r.sale_date));
    return {
      totalSales,
      titleCount: titles.size,
      dailyAvg: days.size > 0 ? totalSales / days.size : 0,
    };
  }, [salesData, selectedPlatform]);

  const chartPlatforms = useMemo(
    () => compareMode ? comparePlatforms : (selectedPlatform ? [selectedPlatform] : []),
    [compareMode, comparePlatforms, selectedPlatform]
  );

  const timeSeries = useMemo(
    () => aggregateTimeSeries(salesData, granularity, chartPlatforms),
    [salesData, granularity, chartPlatforms]
  );

  const topTitles = useMemo(
    () => selectedPlatform ? computeTopTitles(salesData, selectedPlatform) : [],
    [salesData, selectedPlatform]
  );

  const toggleComparePlatform = (pf: string) => {
    setComparePlatforms((prev) =>
      prev.includes(pf) ? prev.filter((p) => p !== pf) : [...prev, pf]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow"
        >
          <Monitor size={20} color="white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Platform Analysis</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>プラットフォーム別売上分析</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <KPISkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          {/* Platform selector + compare toggle */}
          <motion.div variants={cardVariants} className="rounded-2xl p-4" style={GLASS_CARD}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {compareMode ? 'プラットフォームを複数選択して比較' : 'プラットフォームを選択'}
              </p>
              <button
                onClick={() => { setCompareMode(!compareMode); setComparePlatforms(selectedPlatform ? [selectedPlatform] : []); }}
                className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                style={{
                  background: compareMode ? 'rgba(99, 102, 241, 0.2)' : 'var(--color-input-bg)',
                  color: compareMode ? '#a5b4fc' : 'var(--color-text-secondary)',
                  border: compareMode ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                }}
              >
                <BarChart3 size={12} className="inline mr-1" />
                比較モード
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {platformNames.map((pf) => {
                const brand = getPlatformBrand(pf);
                const isSelected = compareMode ? comparePlatforms.includes(pf) : selectedPlatform === pf;
                return (
                  <motion.button
                    key={pf}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => compareMode ? toggleComparePlatform(pf) : setSelectedPlatform(pf)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    style={{
                      background: isSelected ? `${brand.color}25` : 'var(--color-glass)',
                      color: isSelected ? brand.color : 'var(--color-text-secondary)',
                      border: isSelected ? `1px solid ${brand.color}40` : '1px solid var(--color-glass-border)',
                    }}
                  >
                    {brand.icon !== '?' && <span className="mr-1">{brand.icon}</span>}
                    {brand.nameJP || pf}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* KPI cards (only in single mode) */}
          {!compareMode && selectedPlatform && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: '累計売上', value: formatYen(kpis.totalSales), icon: <TrendingUp size={16} /> },
                { label: 'タイトル数', value: String(kpis.titleCount), icon: null },
                { label: '日平均売上', value: formatYen(kpis.dailyAvg), icon: null },
              ].map((kpi, idx) => (
                <motion.div key={idx} variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                  <div className="flex items-center gap-2 mb-2">
                    {kpi.icon && <span style={{ color: getPlatformColor(selectedPlatform) }}>{kpi.icon}</span>}
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{kpi.label}</p>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{kpi.value}</p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Granularity selector + trend chart */}
          <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {compareMode ? 'プラットフォーム比較' : `${selectedPlatform ?? ''} 売上推移`}
              </h2>
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-input-bg)' }}>
                {(['daily', 'weekly', 'monthly'] as TimeGranularity[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                    style={{
                      background: granularity === g ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      color: granularity === g ? '#a5b4fc' : 'var(--color-text-muted)',
                      border: granularity === g ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                    }}
                  >
                    {{ daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }[g]}
                  </button>
                ))}
              </div>
            </div>
            {timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={timeSeries}>
                  <defs>
                    {chartPlatforms.map((pf) => (
                      <linearGradient key={pf} id={`pfGrad-${pf.replace(/[^a-zA-Z0-9]/g, '_')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={getPlatformColor(pf)} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={getPlatformColor(pf)} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatYenShort} width={60} />
                  <ReTooltip {...darkTooltipStyle} formatter={(v: unknown, name: unknown) => [formatYen(Number(v ?? 0)), String(name)]} />
                  {compareMode && <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />}
                  {chartPlatforms.map((pf) => (
                    <Area
                      key={pf}
                      type="monotone"
                      dataKey={pf}
                      name={getPlatformBrand(pf).nameJP || pf}
                      stroke={getPlatformColor(pf)}
                      strokeWidth={2}
                      fill={`url(#pfGrad-${pf.replace(/[^a-zA-Z0-9]/g, '_')})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>プラットフォームを選択してください</p>
            )}
          </motion.div>

          {/* Top titles on this platform (single mode only) */}
          {!compareMode && selectedPlatform && topTitles.length > 0 && (
            <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
              <h2 className="text-base font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                Top タイトル — {getPlatformBrand(selectedPlatform).nameJP || selectedPlatform}
              </h2>

              <ResponsiveContainer width="100%" height={Math.max(200, topTitles.slice(0, 10).length * 40)}>
                <BarChart data={topTitles.slice(0, 10)} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatYenShort} />
                  <YAxis
                    type="category"
                    dataKey="titleJP"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                    tickFormatter={(v: string) => v.length > 15 ? v.slice(0, 15) + '...' : v}
                  />
                  <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatYen(Number(v ?? 0)), '売上']} />
                  <Bar dataKey="totalSales" radius={[0, 6, 6, 0]} barSize={20} fill={getPlatformColor(selectedPlatform)} fillOpacity={0.7} />
                </BarChart>
              </ResponsiveContainer>

              {/* Table below chart */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm table-striped">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-table-border)' }}>
                      <th className="text-left py-3 px-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>#</th>
                      <th className="text-left py-3 px-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>タイトル</th>
                      <th className="text-right py-3 px-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>売上</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTitles.map((t, idx) => (
                      <tr key={t.titleJP} style={{ borderBottom: '1px solid var(--color-table-border-subtle)' }}>
                        <td className="py-3 px-2 font-bold" style={{ color: idx < 3 ? '#a5b4fc' : 'var(--color-text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td className="py-3 px-2">
                          <p className="font-medium truncate max-w-[300px]" style={{ color: 'var(--color-text-primary)' }}>{t.titleJP}</p>
                          {t.titleKR && <p className="text-xs truncate max-w-[300px]" style={{ color: 'var(--color-text-muted)' }}>{t.titleKR}</p>}
                        </td>
                        <td className="py-3 px-2 text-right font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {formatYen(t.totalSales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
