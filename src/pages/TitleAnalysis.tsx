import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { BookOpen, Search, ArrowLeft, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { DailySale, TimeGranularity } from '@/types';
import { getPlatformColor, PLATFORM_BRANDS } from '@/utils/platformConfig';
import { startOfWeek, format, parseISO } from 'date-fns';

// ============================================================
// Shared styles & animation variants (mirrors Dashboard.tsx)
// ============================================================

const GLASS_CARD = {
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
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
    backgroundColor: 'rgba(15, 15, 25, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    padding: '12px 16px',
  },
  labelStyle: { color: '#a0a0b8', fontWeight: 600, fontSize: '12px', marginBottom: '4px' },
  itemStyle: { color: '#e0e0f0', fontWeight: 700, fontSize: '13px' },
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

interface TitleSummary {
  titleJP: string;
  titleKR: string | null;
  totalSales: number;
  platforms: string[];
  salesCount: number;
}

interface TimeSeriesPoint {
  period: string;
  label: string;
  sales: number;
}

interface PlatformBreakdown {
  platform: string;
  sales: number;
  color: string;
}

// ============================================================
// Loading Skeletons
// ============================================================

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl p-5 animate-pulse" style={GLASS_CARD}>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-white/5" />
            <div className="flex-1">
              <div className="h-4 w-48 rounded skeleton-shimmer mb-2" />
              <div className="h-3 w-32 rounded skeleton-shimmer" />
            </div>
            <div className="h-5 w-24 rounded skeleton-shimmer" />
          </div>
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
          <div key={i} className="flex-1 rounded-t bg-white/[0.03]" style={{ height: `${30 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Data aggregation
// ============================================================

function aggregateTimeSeries(rows: DailySale[], granularity: TimeGranularity): TimeSeriesPoint[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    let key: string;
    const d = parseISO(row.sale_date);
    switch (granularity) {
      case 'daily': key = row.sale_date; break;
      case 'weekly': key = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'); break;
      case 'monthly': key = format(d, 'yyyy-MM'); break;
    }
    map.set(key, (map.get(key) ?? 0) + row.sales_amount);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, sales]) => {
      let label: string;
      switch (granularity) {
        case 'daily': label = format(parseISO(period), 'M/d'); break;
        case 'weekly': label = format(parseISO(period), 'M/d') + '~'; break;
        case 'monthly': label = period.slice(0, 7); break;
      }
      return { period, label, sales };
    });
}

function computePlatformBreakdown(rows: DailySale[]): PlatformBreakdown[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.channel, (map.get(row.channel) ?? 0) + row.sales_amount);
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([platform, sales]) => ({ platform, sales, color: getPlatformColor(platform) }));
}

// ============================================================
// Main Component
// ============================================================

export function TitleAnalysis() {
  const [loading, setLoading] = useState(true);
  const [titles, setTitles] = useState<TitleSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [titleSales, setTitleSales] = useState<DailySale[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [granularity, setGranularity] = useState<TimeGranularity>('daily');

  // Fetch all sales to build title summaries
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('daily_sales_v2')
        .select('title_jp, title_kr, channel, sales_amount');

      if (data) {
        const map = new Map<string, TitleSummary>();
        for (const row of data as Array<{ title_jp: string; title_kr: string | null; channel: string; sales_amount: number }>) {
          const existing = map.get(row.title_jp);
          if (existing) {
            existing.totalSales += row.sales_amount;
            existing.salesCount += 1;
            if (!existing.platforms.includes(row.channel)) existing.platforms.push(row.channel);
            if (row.title_kr && !existing.titleKR) existing.titleKR = row.title_kr;
          } else {
            map.set(row.title_jp, {
              titleJP: row.title_jp,
              titleKR: row.title_kr,
              totalSales: row.sales_amount,
              platforms: [row.channel],
              salesCount: 1,
            });
          }
        }
        setTitles(Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales));
      }
      setLoading(false);
    }
    load();
  }, []);

  // Fetch detail data when a title is selected
  const loadTitleDetail = useCallback(async (titleJP: string) => {
    setDetailLoading(true);
    setSelectedTitle(titleJP);
    const { data } = await supabase
      .from('daily_sales_v2')
      .select('*')
      .eq('title_jp', titleJP)
      .order('sale_date', { ascending: true });
    setTitleSales((data as DailySale[] | null) ?? []);
    setDetailLoading(false);
  }, []);

  // Filtered title list
  const filteredTitles = useMemo(() => {
    if (!searchQuery.trim()) return titles;
    const q = searchQuery.toLowerCase();
    return titles.filter(
      (t) => t.titleJP.toLowerCase().includes(q) || (t.titleKR?.toLowerCase().includes(q) ?? false)
    );
  }, [titles, searchQuery]);

  // Detail computations
  const timeSeries = useMemo(() => aggregateTimeSeries(titleSales, granularity), [titleSales, granularity]);
  const platformBreakdown = useMemo(() => computePlatformBreakdown(titleSales), [titleSales]);

  const selectedTitleInfo = useMemo(
    () => titles.find((t) => t.titleJP === selectedTitle),
    [titles, selectedTitle]
  );

  // Period comparison
  const periodComparison = useMemo(() => {
    if (titleSales.length === 0) return null;
    const dates = titleSales.map((r) => r.sale_date).sort();
    const mid = dates[Math.floor(dates.length / 2)];
    const firstHalf = titleSales.filter((r) => r.sale_date <= mid).reduce((s, r) => s + r.sales_amount, 0);
    const secondHalf = titleSales.filter((r) => r.sale_date > mid).reduce((s, r) => s + r.sales_amount, 0);
    const change = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    return { firstHalf, secondHalf, change };
  }, [titleSales]);

  // ============================================================
  // Detail view
  // ============================================================

  if (selectedTitle) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ minHeight: '100vh' }}
      >
        {/* Back button + title */}
        <div className="flex items-center gap-3 mb-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setSelectedTitle(null); setTitleSales([]); }}
            className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ ...GLASS_CARD }}
          >
            <ArrowLeft size={18} color="#8888a0" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate" style={{ color: '#f0f0f5' }}>
              {selectedTitle}
            </h1>
            {selectedTitleInfo?.titleKR && (
              <p className="text-sm truncate" style={{ color: '#55556a' }}>
                {selectedTitleInfo.titleKR}
              </p>
            )}
          </div>
        </div>

        {detailLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl p-6 animate-pulse" style={{ ...GLASS_CARD, minHeight: 100 }}>
                  <div className="h-3 w-20 rounded skeleton-shimmer mb-3" />
                  <div className="h-7 w-28 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
            <ChartSkeleton />
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: '累計売上', value: formatYen(selectedTitleInfo?.totalSales ?? 0) },
                { label: 'プラットフォーム数', value: String(platformBreakdown.length) },
                {
                  label: '期間トレンド',
                  value: periodComparison ? `${periodComparison.change > 0 ? '+' : ''}${periodComparison.change.toFixed(1)}%` : '-',
                  color: periodComparison && periodComparison.change >= 0 ? '#22c55e' : '#ef4444',
                },
              ].map((kpi, idx) => (
                <motion.div
                  key={idx}
                  variants={cardVariants}
                  className="rounded-2xl p-6"
                  style={GLASS_CARD}
                >
                  <p className="text-xs font-medium mb-2" style={{ color: '#8888a0' }}>{kpi.label}</p>
                  <p className="text-2xl font-bold" style={{ color: kpi.color ?? '#f0f0f5' }}>{kpi.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Granularity selector + area chart */}
            <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold" style={{ color: '#f0f0f5' }}>売上推移</h2>
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {(['daily', 'weekly', 'monthly'] as TimeGranularity[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGranularity(g)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
                      style={{
                        background: granularity === g ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                        color: granularity === g ? '#a5b4fc' : '#55556a',
                        border: granularity === g ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                      }}
                    >
                      {{ daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }[g]}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={timeSeries}>
                  <defs>
                    <linearGradient id="titleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fill: '#55556a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#55556a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatYenShort} width={60} />
                  <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatYen(Number(v ?? 0)), '売上']} />
                  <Area type="monotone" dataKey="sales" stroke="#818cf8" strokeWidth={2} fill="url(#titleGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Platform breakdown bar chart */}
            <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
              <h2 className="text-base font-semibold mb-6" style={{ color: '#f0f0f5' }}>
                プラットフォーム別売上
              </h2>
              {platformBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, platformBreakdown.length * 48)}>
                  <BarChart data={platformBreakdown} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#55556a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatYenShort} />
                    <YAxis type="category" dataKey="platform" tick={{ fill: '#8888a0', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                    <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatYen(Number(v ?? 0)), '売上']} />
                    <Bar dataKey="sales" radius={[0, 6, 6, 0]} barSize={24}>
                      {platformBreakdown.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8" style={{ color: '#55556a' }}>データがありません</p>
              )}
            </motion.div>

            {/* Period comparison */}
            {periodComparison && (
              <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                <h2 className="text-base font-semibold mb-4" style={{ color: '#f0f0f5' }}>期間比較</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-xs mb-1" style={{ color: '#8888a0' }}>前半期間</p>
                    <p className="text-lg font-bold" style={{ color: '#f0f0f5' }}>{formatYen(periodComparison.firstHalf)}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-xs mb-1" style={{ color: '#8888a0' }}>後半期間</p>
                    <p className="text-lg font-bold" style={{ color: '#f0f0f5' }}>{formatYen(periodComparison.secondHalf)}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <TrendingUp size={16} color={periodComparison.change >= 0 ? '#22c55e' : '#ef4444'} />
                  <span className="text-sm font-semibold" style={{ color: periodComparison.change >= 0 ? '#22c55e' : '#ef4444' }}>
                    {periodComparison.change > 0 ? '+' : ''}{periodComparison.change.toFixed(1)}% 変化
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  }

  // ============================================================
  // List view
  // ============================================================

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
          <BookOpen size={20} color="white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>Title Analysis</h1>
          <p className="text-sm" style={{ color: '#55556a' }}>作品別の売上分析・トレンド</p>
        </div>
      </div>

      {/* Search bar */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="show"
        className="rounded-2xl p-4 mb-6"
        style={GLASS_CARD}
      >
        <div className="flex items-center gap-3">
          <Search size={18} color="#55556a" />
          <input
            type="text"
            placeholder="タイトル名で検索 (JP / KR)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: '#f0f0f5' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs cursor-pointer" style={{ color: '#8888a0' }}>
              クリア
            </button>
          )}
        </div>
      </motion.div>

      {/* Results count */}
      <p className="text-xs mb-4" style={{ color: '#55556a' }}>
        {filteredTitles.length} タイトル {searchQuery && `(「${searchQuery}」で検索)`}
      </p>

      {/* Title list */}
      {loading ? (
        <ListSkeleton />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
          {filteredTitles.slice(0, 50).map((title) => (
            <motion.div
              key={title.titleJP}
              variants={cardVariants}
              whileHover={{ scale: 1.01, background: 'rgba(255,255,255,0.05)' }}
              className="rounded-2xl p-5 cursor-pointer transition-all"
              style={GLASS_CARD}
              onClick={() => loadTitleDetail(title.titleJP)}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{
                    background: `${getPlatformColor(title.platforms[0])}20`,
                    color: getPlatformColor(title.platforms[0]),
                  }}
                >
                  {title.platforms.length}P
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#f0f0f5' }}>
                    {title.titleJP}
                  </p>
                  {title.titleKR && (
                    <p className="text-xs truncate" style={{ color: '#55556a' }}>{title.titleKR}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {title.platforms.slice(0, 3).map((p) => (
                    <span
                      key={p}
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${getPlatformColor(p)}20`, color: getPlatformColor(p) }}
                    >
                      {PLATFORM_BRANDS[p]?.icon ?? p.charAt(0)}
                    </span>
                  ))}
                  {title.platforms.length > 3 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: '#55556a' }}>
                      +{title.platforms.length - 3}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold shrink-0" style={{ color: '#f0f0f5' }}>
                  {formatYen(title.totalSales)}
                </p>
              </div>
            </motion.div>
          ))}
          {filteredTitles.length === 0 && (
            <div className="text-center py-12" style={{ color: '#55556a' }}>
              該当するタイトルがありません
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
