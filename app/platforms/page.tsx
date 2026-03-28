'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { Monitor, TrendingUp, BarChart3, ChevronUp, ChevronDown, Minus, Activity, PieChart } from 'lucide-react';
import { fetchPlatformSummary, fetchPlatformDetail } from '@/lib/supabase';
import { getPlatformColor, getPlatformBrand, getPlatformLogo } from '@/utils/platformConfig';
import { useApp } from '@/context/AppContext';
import type { PlatformSummaryRow, PlatformDetailData } from '@/types';
import DateRangePicker from '@/components/platforms/DateRangePicker';
import PlatformGenreMatrix from '@/components/platforms/PlatformGenreMatrix';
import ParetoChart from '@/components/platforms/ParetoChart';
import HealthTrend from '@/components/platforms/HealthTrend';

// ─── Shared styles ───────────────────────────────────────────
const GLASS_CARD = {
  background: 'var(--color-glass)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: '16px',
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

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

// ─── Skeletons ───────────────────────────────────────────────
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
          <div key={i} className="flex-1 rounded-t bg-[var(--color-glass)]" style={{ height: `${30 + ((i * 37 + 13) % 60)}%` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Growth badge component (C2) ────────────────────────────
function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct > 0;
  const isFlat = Math.abs(pct) < 0.5;

  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md"
      style={{
        background: isFlat ? 'rgba(148, 163, 184, 0.15)' : isUp ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
        color: isFlat ? '#94a3b8' : isUp ? '#22c55e' : '#ef4444',
      }}
    >
      {isFlat ? <Minus size={10} /> : isUp ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      {isFlat ? '0%' : `${isUp ? '+' : ''}${pct.toFixed(1)}%`}
    </span>
  );
}

// ─── Rank change badge (C2) ─────────────────────────────────
function RankChangeBadge({ change }: { change: number }) {
  if (change === 0) return null;
  const isUp = change > 0;
  return (
    <span
      className="text-[10px] font-bold"
      style={{ color: isUp ? '#22c55e' : '#ef4444' }}
    >
      {isUp ? `↑${change}` : `↓${Math.abs(change)}`}
    </span>
  );
}

// ─── Top N options (C8) ──────────────────────────────────────
const TOP_N_OPTIONS = [5, 10, 20, 50];

export default function PlatformAnalysisPage() {
  const { formatCurrency, t } = useApp();

  // Core state
  const [loading, setLoading] = useState(true);
  const [platformSummary, setPlatformSummary] = useState<PlatformSummaryRow[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<PlatformDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [comparePlatforms, setComparePlatforms] = useState<string[]>([]);
  const [compareDetails, setCompareDetails] = useState<Map<string, PlatformDetailData>>(new Map());
  const [compareLoading, setCompareLoading] = useState(false);

  // C1: Date range
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // C2: Previous period summary for growth
  const [prevSummary, setPrevSummary] = useState<PlatformSummaryRow[]>([]);

  // C8: Top N
  const [topN, setTopN] = useState(10);

  const formatShort = (value: number): string => {
    if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}億`;
    if (value >= 10_000) return `${(value / 10_000).toFixed(0)}万`;
    return value.toLocaleString();
  };

  // ─── Data loading ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchPlatformSummary();
        const rows = data ?? [];
        setPlatformSummary(rows);
        // Store as previous period baseline on initial load
        setPrevSummary(rows);
        if (rows.length > 0) setSelectedPlatform(rows[0].channel);
      } catch (err) {
        console.error('Failed to load platform summary:', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const loadPlatformDetail = useCallback(async (channel: string) => {
    setDetailLoading(true);
    try {
      const data = await fetchPlatformDetail(channel);
      setDetailData(data);
    } catch (err) {
      console.error('Failed to load platform detail:', err);
      setDetailData(null);
    }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on selection change
    if (selectedPlatform && !compareMode) loadPlatformDetail(selectedPlatform);
  }, [selectedPlatform, compareMode, loadPlatformDetail]);

  useEffect(() => {
    if (!compareMode || comparePlatforms.length === 0) return;
    let cancelled = false;
    async function loadAll() {
      setCompareLoading(true);
      const newMap = new Map<string, PlatformDetailData>();
      for (const ch of comparePlatforms) {
        try {
          const data = await fetchPlatformDetail(ch);
          if (!cancelled && data) newMap.set(ch, data);
        } catch (err) {
          console.error(`Failed to load detail for ${ch}:`, err);
        }
      }
      if (!cancelled) {
        setCompareDetails(newMap);
        setCompareLoading(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, [compareMode, comparePlatforms]);

  // ─── Computed values ───────────────────────────────────────
  const platformNames = useMemo(() => platformSummary.map((p) => p.channel), [platformSummary]);

  // C2: sorted platforms with rank info
  const sortedPlatforms = useMemo(() => {
    const current = [...platformSummary].sort((a, b) => b.total_sales - a.total_sales);
    const prevRanks = new Map<string, number>();
    const prevSorted = [...prevSummary].sort((a, b) => b.total_sales - a.total_sales);
    prevSorted.forEach((p, i) => prevRanks.set(p.channel, i + 1));

    return current.map((p, i) => {
      const prevRank = prevRanks.get(p.channel) ?? (i + 1);
      const prevData = prevSummary.find((ps) => ps.channel === p.channel);
      return {
        ...p,
        rank: i + 1,
        rankChange: prevRank - (i + 1),
        prevTotalSales: prevData?.total_sales ?? 0,
      };
    });
  }, [platformSummary, prevSummary]);

  // C4: New titles count from detail data
  const newTitlesInfo = useMemo(() => {
    if (!detailData?.top_titles || !detailData.monthly_trend) return null;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Use monthly_trend to estimate: if a title's first appearance in trend data matches a month
    // This is approximate since we don't have firstDate per title in the current API
    const trendMonths = (detailData.monthly_trend ?? []).map((t) => t.month);
    const firstMonth = trendMonths.length > 0 ? trendMonths[0] : '';

    return {
      totalTitles: detailData.top_titles.length,
      currentMonth: thisMonth,
      previousMonth: lastMonth,
      firstDataMonth: firstMonth,
    };
  }, [detailData]);

  // Compare chart data
  const compareChartData = useMemo(() => {
    if (comparePlatforms.length === 0 || compareDetails.size === 0) return [];
    const monthSet = new Set<string>();
    for (const detail of compareDetails.values()) {
      for (const t of detail.monthly_trend ?? []) monthSet.add(t.month);
    }
    const months = Array.from(monthSet).sort();
    return months.map((month) => {
      const point: Record<string, string | number> = { label: month };
      for (const [ch, detail] of compareDetails) {
        const match = (detail.monthly_trend ?? []).find((t) => t.month === month);
        point[ch] = match?.sales ?? 0;
      }
      return point;
    });
  }, [comparePlatforms, compareDetails]);

  // Filter monthly trend by date range (C1)
  const filteredMonthlyTrend = useMemo(() => {
    const trend = detailData?.monthly_trend ?? [];
    if (!startDate && !endDate) return trend;
    return trend.filter((t) => {
      if (startDate && t.month < startDate.substring(0, 7)) return false;
      if (endDate && t.month > endDate.substring(0, 7)) return false;
      return true;
    });
  }, [detailData, startDate, endDate]);

  const toggleComparePlatform = (pf: string) => {
    setComparePlatforms((prev) =>
      prev.includes(pf) ? prev.filter((p) => p !== pf) : [...prev, pf]
    );
  };

  const selectedSummary = useMemo(
    () => platformSummary.find((p) => p.channel === selectedPlatform),
    [platformSummary, selectedPlatform]
  );

  const selectedSorted = useMemo(
    () => sortedPlatforms.find((p) => p.channel === selectedPlatform),
    [sortedPlatforms, selectedPlatform]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow">
          <Monitor size={20} color="white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('플랫폼 분석', 'プラットフォーム分析')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('플랫폼별 매출 분석', 'プラットフォーム別売上分析')}
          </p>
        </div>
      </div>

      {/* C1: Date Range Picker */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-4 mb-6"
        style={GLASS_CARD}
      >
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          {t('기간 선택', '期間選択')}
        </p>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </motion.div>

      {loading ? (
        <div className="space-y-6"><KPISkeleton /><ChartSkeleton /></div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          {/* Platform selector + Compare mode toggle */}
          <motion.div variants={cardVariants} className="rounded-2xl p-4" style={GLASS_CARD}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                {compareMode
                  ? t('플랫폼을 복수 선택하여 비교', 'プラットフォームを複数選択して比較')
                  : t('플랫폼 선택', 'プラットフォームを選択')}
              </p>
              <button
                onClick={() => {
                  setCompareMode(!compareMode);
                  setComparePlatforms(selectedPlatform ? [selectedPlatform] : []);
                }}
                className="text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                style={{
                  background: compareMode ? 'rgba(99, 102, 241, 0.2)' : 'var(--color-input-bg)',
                  color: compareMode ? '#a5b4fc' : 'var(--color-text-secondary)',
                  border: compareMode ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                }}
              >
                <BarChart3 size={12} className="inline mr-1" />
                {t('비교 모드', '比較モード')}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {platformNames.map((pf) => {
                const brand = getPlatformBrand(pf);
                const logo = getPlatformLogo(pf);
                const isSelected = compareMode ? comparePlatforms.includes(pf) : selectedPlatform === pf;
                const sorted = sortedPlatforms.find((s) => s.channel === pf);
                return (
                  <motion.button
                    key={pf}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => compareMode ? toggleComparePlatform(pf) : setSelectedPlatform(pf)}
                    className="relative cursor-pointer transition-all"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      opacity: isSelected ? 1 : 0.45,
                      filter: isSelected ? 'none' : 'grayscale(0.3)',
                    }}
                    title={brand.nameJP || pf}
                  >
                    {logo ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={logo} alt={brand.nameJP || pf} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <span className="text-lg font-bold" style={{ color: brand.color }}>{brand.icon}</span>
                    )}
                    {isSelected && (
                      <motion.div
                        layoutId="platform-indicator"
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full"
                        style={{ background: brand.color }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    {/* C2: Rank change badge */}
                    {sorted && sorted.rankChange !== 0 && (
                      <span className="absolute -top-2 -right-2">
                        <RankChangeBadge change={sorted.rankChange} />
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* KPI cards (single mode) with C2 growth badges */}
          {!compareMode && selectedPlatform && (
            detailLoading ? <KPISkeleton /> : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    label: t('누적 매출', '累計売上'),
                    value: formatCurrency(detailData?.total_sales ?? selectedSummary?.total_sales ?? 0),
                    icon: <TrendingUp size={16} />,
                    growth: selectedSorted ? { current: selectedSorted.total_sales, previous: selectedSorted.prevTotalSales } : null,
                  },
                  {
                    label: t('작품 수', 'タイトル数'),
                    value: String(detailData?.title_count ?? selectedSummary?.title_count ?? 0),
                    icon: null,
                    growth: null,
                  },
                  {
                    label: t('일평균 매출', '日平均売上'),
                    value: formatCurrency(detailData?.daily_avg ?? selectedSummary?.avg_daily ?? 0),
                    icon: null,
                    growth: null,
                  },
                ].map((kpi, idx) => (
                  <motion.div key={idx} variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                    <div className="flex items-center gap-2 mb-2">
                      {kpi.icon && <span style={{ color: getPlatformColor(selectedPlatform) }}>{kpi.icon}</span>}
                      <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{kpi.label}</p>
                      {/* C2: Growth badge */}
                      {kpi.growth && <GrowthBadge current={kpi.growth.current} previous={kpi.growth.previous} />}
                    </div>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{kpi.value}</p>
                  </motion.div>
                ))}
              </div>
            )
          )}

          {/* Monthly trend chart */}
          <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
            <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
              {compareMode
                ? t('플랫폼 비교', 'プラットフォーム比較')
                : `${getPlatformBrand(selectedPlatform ?? '').nameJP || (selectedPlatform ?? '')} ${t('매출 추이', '売上推移')}`}
            </h2>

            {compareMode ? (
              compareLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : compareChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={compareChartData}>
                    <defs>
                      {comparePlatforms.map((pf) => (
                        <linearGradient key={pf} id={`pfGrad-${pf.replace(/[^a-zA-Z0-9]/g, '_')}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={getPlatformColor(pf)} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={getPlatformColor(pf)} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} width={60} />
                    <ReTooltip {...darkTooltipStyle} formatter={(v: unknown, name: unknown) => [formatCurrency(Number(v ?? 0)), String(name)]} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
                    {comparePlatforms.map((pf) => (
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
                <p className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                  {t('플랫폼을 선택해주세요', 'プラットフォームを選択してください')}
                </p>
              )
            ) : (
              detailLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : filteredMonthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={filteredMonthlyTrend.map((d) => ({ label: d.month, sales: d.sales }))}>
                    <defs>
                      <linearGradient id="pfSingleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={getPlatformColor(selectedPlatform ?? '')} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={getPlatformColor(selectedPlatform ?? '')} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} width={60} />
                    <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('매출', '売上')]} />
                    <Area type="monotone" dataKey="sales" stroke={getPlatformColor(selectedPlatform ?? '')} strokeWidth={2} fill="url(#pfSingleGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                  {t('플랫폼을 선택해주세요', 'プラットフォームを選択してください')}
                </p>
              )
            )}
          </motion.div>

          {/* ═══ Single mode detail sections ═══ */}
          {!compareMode && selectedPlatform && !detailLoading && (
            <>
              {/* C5: Pareto Analysis */}
              {(detailData?.top_titles ?? []).length > 0 && (
                <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart size={16} style={{ color: getPlatformColor(selectedPlatform) }} />
                    <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {t('매출 집중도 (파레토 분석)', '売上集中度（パレート分析）')}
                    </h2>
                  </div>
                  <ParetoChart
                    titles={detailData?.top_titles ?? []}
                    channel={selectedPlatform}
                    topN={topN}
                  />
                </motion.div>
              )}

              {/* C6 + C7: Platform Health Trend */}
              <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={16} style={{ color: getPlatformColor(selectedPlatform) }} />
                  <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {t('플랫폼 건강도', 'プラットフォーム健全性')} — {getPlatformBrand(selectedPlatform).nameJP || selectedPlatform}
                  </h2>
                </div>
                <HealthTrend channel={selectedPlatform} months={6} />
              </motion.div>

              {/* Top Titles (with C8: Top N selector) */}
              {(detailData?.top_titles ?? []).length > 0 && (
                <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      Top {t('작품', 'タイトル')} — {getPlatformBrand(selectedPlatform).nameJP || selectedPlatform}
                    </h2>
                    {/* C8: Top N selector */}
                    <select
                      value={topN}
                      onChange={(e) => setTopN(Number(e.target.value))}
                      className="text-xs px-2 py-1.5 rounded-lg cursor-pointer outline-none"
                      style={{
                        background: 'var(--color-input-bg)',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-glass-border)',
                      }}
                    >
                      {TOP_N_OPTIONS.map((n) => (
                        <option key={n} value={n}>Top {n}</option>
                      ))}
                    </select>
                  </div>

                  {/* C4: New titles info */}
                  {newTitlesInfo && (
                    <div className="flex items-center gap-4 mb-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      <span>{t('총 작품 수', '総タイトル数')}: <strong style={{ color: 'var(--color-text-primary)' }}>{newTitlesInfo.totalTitles}</strong></span>
                    </div>
                  )}

                  <ResponsiveContainer width="100%" height={Math.max(200, (detailData?.top_titles ?? []).slice(0, topN).length * 40)}>
                    <BarChart data={(detailData?.top_titles ?? []).slice(0, topN)} layout="vertical" margin={{ left: 120 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                      <YAxis
                        type="category"
                        dataKey="title_jp"
                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={120}
                        tickFormatter={(v: string) => v.length > 15 ? v.slice(0, 15) + '...' : v}
                      />
                      <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('매출', '売上')]} />
                      <Bar dataKey="total_sales" radius={[0, 6, 6, 0]} barSize={20} fill={getPlatformColor(selectedPlatform)} fillOpacity={0.7} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm table-striped">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-table-border)' }}>
                          <th className="text-left py-3 px-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>#</th>
                          <th className="text-left py-3 px-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('작품', 'タイトル')}
                          </th>
                          <th className="text-right py-3 px-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            {t('매출', '売上')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detailData?.top_titles ?? []).slice(0, topN).map((title, idx) => (
                          <tr key={title.title_jp} style={{ borderBottom: '1px solid var(--color-table-border-subtle)' }}>
                            <td className="py-3 px-2 font-bold" style={{ color: idx < 3 ? '#a5b4fc' : 'var(--color-text-muted)' }}>
                              {idx + 1}
                            </td>
                            <td className="py-3 px-2" style={{ maxWidth: '300px' }}>
                              <p className="font-medium truncate" title={title.title_jp} style={{ color: 'var(--color-text-primary)' }}>{title.title_jp}</p>
                              {title.title_kr && <p className="text-xs truncate" title={title.title_kr} style={{ color: 'var(--color-text-muted)' }}>{title.title_kr}</p>}
                            </td>
                            <td className="py-3 px-2 text-right font-bold" style={{ color: 'var(--color-text-primary)' }}>
                              {formatCurrency(title.total_sales)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* C3: Platform x Genre Cross Analysis */}
          <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {t('플랫폼 × 장르 크로스 분석', 'プラットフォーム × ジャンル クロス分析')}
            </h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {t('어떤 장르가 어떤 플랫폼에서 강한지 한눈에', 'どのジャンルがどのプラットフォームで強いか一目で確認')}
            </p>
            <PlatformGenreMatrix startDate={startDate} endDate={endDate} />
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
