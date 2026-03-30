'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTitleSummaries, useTitleMaster, useGenres, useTitleRankings } from '@/hooks/useData';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { BookOpen, ArrowLeft, GitCompare, CheckSquare, Square } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { fetchTitleDetail } from '@/lib/supabase';
import { getPlatformColor } from '@/utils/platformConfig';
import { PlatformBadge } from '@/components/PlatformBadge';
import { useApp } from '@/context/AppContext';
import type { TitleSummaryRow, TitleDetailData, TitleMasterRow, TitleRankingRow } from '@/types';

import { GLASS_CARD, containerVariants, cardVariants, darkTooltipStyle } from '@/components/titles/constants';
import type { SalesPreset } from '@/components/titles/constants';
import { ListSkeleton, ChartSkeleton } from '@/components/titles/Skeletons';
import { FilterPanel } from '@/components/titles/FilterPanel';
import { CompareChart } from '@/components/titles/CompareChart';
import { PeriodCompare } from '@/components/titles/PeriodCompare';
import { TitleLifecycle } from '@/components/titles/TitleLifecycle';
import { PlatformTimeSeries } from '@/components/titles/PlatformTimeSeries';
import { PlatformContribution } from '@/components/titles/PlatformContribution';

// ============================================================
// Props — server-side prefetched data
// ============================================================

export interface TitlesInitialData {
  summaries: TitleSummaryRow[] | null;
  titleMaster: TitleMasterRow[] | null;
  genres: Array<{ id: number; name: string }> | null;
}

interface TitlesClientProps {
  initialData?: TitlesInitialData | null;
}

// ============================================================
// Helpers
// ============================================================

function formatShort(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}億`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}万`;
  return value.toLocaleString();
}

function isNewTitle(firstDate: string | null, launchDate: string | null): boolean {
  const ref = launchDate ?? firstDate;
  if (!ref) return false;
  const d = new Date(ref);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return d >= threeMonthsAgo;
}

function getDateRangeForRanking() {
  const now = new Date();
  const currentEnd = now.toISOString().slice(0, 10);
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  return { currentStart, currentEnd, prevStart, prevEnd };
}

// ============================================================
// Enriched title type
// ============================================================

interface EnrichedTitle extends TitleSummaryRow {
  genre_name?: string;
  company_name?: string;
  serial_status?: string;
  content_format?: string;
  latest_episode_count?: number;
  service_launch_date?: string;
  isNew: boolean;
  rank_change?: number;
}

// ============================================================
// Main Page
// ============================================================

export default function TitlesClient({ initialData }: TitlesClientProps) {
  const { formatCurrency, t } = useApp();
  const searchParams = useSearchParams();
  const highlightTitle = searchParams.get('highlight');

  // SWR data hooks (client-side fetch with server prefetch as fallback)
  const { data: summariesRaw } = useTitleSummaries();
  const { data: masterRaw } = useTitleMaster();
  const { data: genreListRaw } = useGenres();

  const { currentStart, currentEnd, prevStart, prevEnd } = useMemo(() => getDateRangeForRanking(), []);
  const { data: rankingsRaw } = useTitleRankings(currentStart, currentEnd, prevStart, prevEnd);

  // Normalize SWR data — prefer SWR, then initialData, then empty
  const effectiveSummaries = summariesRaw ?? initialData?.summaries;
  const titles = useMemo<TitleSummaryRow[]>(() => {
    if (!effectiveSummaries) return [];
    return (effectiveSummaries as TitleSummaryRow[]).map((row: TitleSummaryRow) => ({
      title_jp: row.title_jp,
      title_kr: row.title_kr,
      channels: row.channels ?? [],
      first_date: row.first_date,
      total_sales: row.total_sales,
      day_count: row.day_count,
    })).sort((a: TitleSummaryRow, b: TitleSummaryRow) => b.total_sales - a.total_sales);
  }, [effectiveSummaries]);

  const titleMaster = useMemo<TitleMasterRow[]>(() => (masterRaw as unknown as TitleMasterRow[]) ?? (initialData?.titleMaster as unknown as TitleMasterRow[]) ?? [], [masterRaw, initialData?.titleMaster]);
  const genres = useMemo<Array<{ id: number; name: string }>>(() => genreListRaw ?? initialData?.genres ?? [], [genreListRaw, initialData?.genres]);
  const rankings = useMemo<TitleRankingRow[]>(() => rankingsRaw ?? [], [rankingsRaw]);

  const loading = !summariesRaw && !masterRaw && !initialData?.summaries;

  // Detail state
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<TitleDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filter state (B1)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [salesPreset, setSalesPreset] = useState<SalesPreset>('all');
  const [serialStatusTab, setSerialStatusTab] = useState('all');

  // Sort state
  const [sortBy, setSortBy] = useState('sales_desc');

  // Compare mode (B5)
  const [compareMode, setCompareMode] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  // Period compare (B4) — for detail view
  const [periodA, setPeriodA] = useState({ start: '', end: '' });
  const [periodB, setPeriodB] = useState({ start: '', end: '' });

  // ============================================================
  // Title master map
  // ============================================================

  const masterMap = useMemo(() => {
    const map = new Map<string, TitleMasterRow>();
    titleMaster.forEach((m) => map.set(m.title_jp, m));
    return map;
  }, [titleMaster]);

  const rankingMap = useMemo(() => {
    const map = new Map<string, number>();
    rankings.forEach((r) => map.set(r.title_jp, r.rank_change));
    return map;
  }, [rankings]);

  // ============================================================
  // Derived filter options
  // ============================================================

  const companies = useMemo(() => {
    const set = new Set<string>();
    titleMaster.forEach((m) => {
      const name = m.company_name ?? (m as unknown as Record<string, unknown>).production_companies?.toString();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [titleMaster]);

  const platforms = useMemo(() => {
    const set = new Set<string>();
    titles.forEach((t) => t.channels.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [titles]);

  // ============================================================
  // Enriched + filtered titles
  // ============================================================

  const enrichedTitles = useMemo((): EnrichedTitle[] => {
    return titles.map((t) => {
      const master = masterMap.get(t.title_jp);
      return {
        ...t,
        genre_name: master?.genre_name ?? undefined,
        company_name: master?.company_name ?? undefined,
        serial_status: master?.serial_status ?? undefined,
        content_format: master?.content_format ?? undefined,
        latest_episode_count: master?.latest_episode_count ?? undefined,
        service_launch_date: master?.service_launch_date ?? undefined,
        isNew: isNewTitle(t.first_date, master?.service_launch_date ?? null),
        rank_change: rankingMap.get(t.title_jp),
      };
    });
  }, [titles, masterMap, rankingMap]);

  const filteredTitles = useMemo(() => {
    let result = enrichedTitles;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) => t.title_jp.toLowerCase().includes(q) || (t.title_kr?.toLowerCase().includes(q) ?? false)
      );
    }

    // Serial status tab (B6)
    if (serialStatusTab !== 'all') {
      result = result.filter((t) => t.serial_status === serialStatusTab);
    }

    // Genre (B1)
    if (selectedGenre) {
      result = result.filter((t) => t.genre_name === selectedGenre);
    }

    // Company (B1)
    if (selectedCompany) {
      result = result.filter((t) => t.company_name === selectedCompany);
    }

    // Platform (B1)
    if (selectedPlatform) {
      result = result.filter((t) => t.channels.includes(selectedPlatform));
    }

    // Serial status dropdown (B1)
    if (selectedStatus) {
      result = result.filter((t) => t.serial_status === selectedStatus);
    }

    // Content format (B1)
    if (selectedFormat) {
      result = result.filter((t) => t.content_format === selectedFormat);
    }

    // Sales preset (B2)
    if (salesPreset !== 'all' && result.length > 0) {
      const sorted = [...result].sort((a, b) => b.total_sales - a.total_sales);
      const len = sorted.length;
      if (salesPreset === 'top10') {
        result = sorted.slice(0, Math.ceil(len * 0.1));
      } else if (salesPreset === 'top50') {
        result = sorted.slice(0, Math.ceil(len * 0.5));
      } else if (salesPreset === 'bottom50') {
        result = sorted.slice(Math.ceil(len * 0.5));
      }
    }

    // Sort
    if (sortBy === 'sales_desc') result.sort((a, b) => b.total_sales - a.total_sales);
    else if (sortBy === 'sales_asc') result.sort((a, b) => a.total_sales - b.total_sales);
    else if (sortBy === 'name_asc') result.sort((a, b) => a.title_jp.localeCompare(b.title_jp));
    else if (sortBy === 'newest') result.sort((a, b) => (b.first_date ?? '').localeCompare(a.first_date ?? ''));

    return result;
  }, [enrichedTitles, searchQuery, serialStatusTab, selectedGenre, selectedCompany, selectedPlatform, selectedStatus, selectedFormat, salesPreset, sortBy]);

  // ============================================================
  // Detail loading
  // ============================================================

  const loadTitleDetail = useCallback(async (titleJP: string) => {
    setDetailLoading(true);
    setSelectedTitle(titleJP);
    try {
      const data = await fetchTitleDetail(titleJP);
      setDetailData(data);
      // Initialize period comparison defaults from monthly trend
      if (data?.monthly_trend && data.monthly_trend.length >= 2) {
        const months = data.monthly_trend;
        const last = months[months.length - 1].month;
        const prev = months[months.length - 2].month;
        setPeriodA({ start: prev, end: prev });
        setPeriodB({ start: last, end: last });
      }
    } catch (err) {
      console.error('Failed to load title detail:', err);
      setDetailData(null);
    }
    setDetailLoading(false);
  }, []);

  // URL-based drill-down: auto-select highlighted title
  useEffect(() => {
    if (highlightTitle && titles.length > 0 && !loading) {
      const found = titles.find((ti) => ti.title_jp === highlightTitle);
      if (found) {
        loadTitleDetail(found.title_jp); // eslint-disable-line react-hooks/set-state-in-effect
      }
    }
  }, [highlightTitle, titles, loading, loadTitleDetail]);

  // Compare toggle
  const toggleCompare = (titleJP: string) => {
    setCompareList((prev) => {
      if (prev.includes(titleJP)) return prev.filter((t) => t !== titleJP);
      if (prev.length >= 5) return prev;
      return [...prev, titleJP];
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedGenre('');
    setSelectedCompany('');
    setSelectedPlatform('');
    setSelectedStatus('');
    setSelectedFormat('');
    setSalesPreset('all');
    setSerialStatusTab('all');
  };

  const selectedTitleInfo = useMemo(
    () => enrichedTitles.find((t) => t.title_jp === selectedTitle),
    [enrichedTitles, selectedTitle]
  );

  // ============================================================
  // Detail View
  // ============================================================

  if (selectedTitle) {
    const monthlyTrend = detailData?.monthly_trend ?? [];
    const platformBreakdown = (detailData?.platform_breakdown ?? []).map((p) => ({
      ...p,
      color: getPlatformColor(p.channel),
    }));
    const dailyRecent = (detailData?.daily_recent ?? []).map((d) => ({
      label: d.date.slice(5),
      sales: d.sales,
    }));

    const trendLen = monthlyTrend.length;
    const recentMonth = trendLen > 0 ? monthlyTrend[trendLen - 1].sales : 0;
    const prevMonth = trendLen > 1 ? monthlyTrend[trendLen - 2].sales : 0;
    const periodChange = prevMonth > 0 ? ((recentMonth - prevMonth) / prevMonth) * 100 : 0;

    // B7: Episode efficiency
    const epCount = selectedTitleInfo?.latest_episode_count;
    const totalSales = detailData?.total_sales ?? selectedTitleInfo?.total_sales ?? 0;
    const perEpisodeSales = epCount && epCount > 0 ? totalSales / epCount : null;

    return (
      <AnimatePresence mode="wait">
      <motion.div key={selectedTitle} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }} style={{ minHeight: '100vh' }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setSelectedTitle(null); setDetailData(null); }}
            className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer"
            style={{ ...GLASS_CARD }}
          >
            <ArrowLeft size={18} color="var(--color-text-secondary)" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {selectedTitle}
              </h1>
              {/* B3: New badge */}
              {selectedTitleInfo?.isNew && (
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#22c55e20', color: '#22c55e' }}>
                  🆕 {t('신작', '新作')}
                </span>
              )}
            </div>
            {(detailData?.title_kr || selectedTitleInfo?.title_kr) && (
              <p className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
                {detailData?.title_kr || selectedTitleInfo?.title_kr}
              </p>
            )}
            {/* Master info badges */}
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedTitleInfo?.genre_name && (
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)' }}>
                  {selectedTitleInfo.genre_name}
                </span>
              )}
              {selectedTitleInfo?.serial_status && (
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)' }}>
                  {selectedTitleInfo.serial_status}
                </span>
              )}
              {selectedTitleInfo?.content_format && (
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)' }}>
                  {selectedTitleInfo.content_format}
                </span>
              )}
              {selectedTitleInfo?.company_name && (
                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: 'var(--color-glass)', color: 'var(--color-text-secondary)' }}>
                  {selectedTitleInfo.company_name}
                </span>
              )}
            </div>
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
            {/* KPI Cards — now 4 columns with B7 */}
            <div className={`grid grid-cols-1 gap-4 ${perEpisodeSales !== null ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
              {[
                { label: t('누적 매출', '累計売上'), value: formatCurrency(totalSales) },
                { label: t('플랫폼 수', 'プラットフォーム数'), value: String(platformBreakdown.length || (detailData?.channels ?? []).length) },
                {
                  label: t('최근 추이', '期間トレンド'),
                  value: prevMonth > 0 ? `${periodChange > 0 ? '+' : ''}${periodChange.toFixed(1)}%` : '-',
                  color: periodChange >= 0 ? '#22c55e' : '#ef4444',
                },
                // B7: Per-episode sales
                ...(perEpisodeSales !== null ? [{
                  label: t('에피소드당 매출', 'エピソード当たり売上'),
                  value: formatCurrency(perEpisodeSales),
                  sub: `${epCount} ${t('화', '話')}`,
                }] : []),
              ].map((kpi, idx) => (
                <motion.div key={idx} variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>{kpi.label}</p>
                  <p className="text-2xl font-bold" style={{ color: (kpi as { color?: string }).color ?? 'var(--color-text-primary)' }}>{kpi.value}</p>
                  {(kpi as { sub?: string }).sub && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{(kpi as { sub?: string }).sub}</p>
                  )}
                </motion.div>
              ))}
            </div>

            {/* B8: Lifecycle Timeline */}
            {monthlyTrend.length > 0 && (
              <TitleLifecycle
                firstDate={selectedTitleInfo?.first_date ?? monthlyTrend[0].month}
                monthlyTrend={monthlyTrend}
                t={t}
              />
            )}

            {/* Monthly Trend Chart */}
            {monthlyTrend.length > 0 && (
              <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                  {t('월별 매출 추이', '月別売上推移')}
                </h2>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={monthlyTrend.map((d) => ({ label: d.month, sales: d.sales }))}>
                    <defs>
                      <linearGradient id="titleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} width={60} />
                    <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('매출', '売上')]} />
                    <Area type="monotone" dataKey="sales" stroke="#818cf8" strokeWidth={2} fill="url(#titleGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Platform breakdown bar chart */}
            {platformBreakdown.length > 0 && (
              <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                <h2 className="text-base font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                  {t('플랫폼별 매출', 'プラットフォーム別売上')}
                </h2>
                <ResponsiveContainer width="100%" height={Math.max(200, platformBreakdown.length * 48)}>
                  <BarChart data={platformBreakdown} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                    <YAxis type="category" dataKey="channel" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                    <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('매출', '売上')]} />
                    <Bar dataKey="sales" radius={[0, 6, 6, 0]} barSize={24}>
                      {platformBreakdown.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Platform Contribution: month-over-month change */}
            {platformBreakdown.length > 0 && monthlyTrend.length >= 2 && (
              <PlatformContribution
                currentBreakdown={platformBreakdown}
                monthlyTrend={monthlyTrend}
                t={t}
              />
            )}

            {/* B10: Platform Time Series */}
            <PlatformTimeSeries
              titleJP={selectedTitle}
              channels={detailData?.channels ?? selectedTitleInfo?.channels ?? []}
              t={t}
            />

            {/* Daily Recent */}
            {dailyRecent.length > 0 && (
              <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                <h2 className="text-base font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                  {t('최근 일별 매출', '直近の日別売上')}
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailyRecent}>
                    <defs>
                      <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} width={60} />
                    <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('매출', '売上')]} />
                    <Area type="monotone" dataKey="sales" stroke="#34d399" strokeWidth={2} fill="url(#dailyGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* B4: Period Comparison */}
            {monthlyTrend.length >= 2 && (
              <PeriodCompare
                monthlyTrend={monthlyTrend}
                periodA={periodA}
                periodB={periodB}
                setPeriodA={setPeriodA}
                setPeriodB={setPeriodB}
                t={t}
              />
            )}
          </motion.div>
        )}
      </motion.div>
      </AnimatePresence>
    );
  }

  // ============================================================
  // List View
  // ============================================================

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow">
          <BookOpen size={20} color="white" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('작품 분석', 'タイトル分析')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('작품별 매출 분석 및 트렌드', '作品別の売上分析・トレンド')}
          </p>
        </div>
        {/* B5: Compare mode toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setCompareMode((prev) => !prev);
            if (compareMode) { setCompareList([]); setShowCompare(false); }
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all"
          style={{
            ...GLASS_CARD,
            background: compareMode ? 'var(--color-accent-blue, #818cf8)' : 'var(--color-glass)',
            color: compareMode ? '#fff' : 'var(--color-text-secondary)',
          }}
        >
          <GitCompare size={14} />
          {t('비교 모드', '比較モード')}
        </motion.button>
      </div>

      {/* B5: Compare bar */}
      {compareMode && compareList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl p-4 mb-4 flex items-center gap-3 flex-wrap"
          style={GLASS_CARD}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {compareList.length}/5 {t('선택됨', '選択済み')}
          </span>
          <div className="flex gap-1 flex-wrap flex-1">
            {compareList.map((title) => (
              <span key={title} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--color-glass)', color: 'var(--color-text-primary)' }}>
                {title.length > 15 ? title.slice(0, 15) + '…' : title}
                <button onClick={() => toggleCompare(title)} className="ml-1 cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>×</button>
              </span>
            ))}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCompare(true)}
            disabled={compareList.length < 2}
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-40"
            style={{ background: '#818cf8', color: '#fff' }}
          >
            {t('비교하기', '比較する')}
          </motion.button>
        </motion.div>
      )}

      {/* B5: Compare chart overlay */}
      {showCompare && compareList.length >= 2 && (
        <CompareChart selectedTitles={compareList} onClose={() => setShowCompare(false)} t={t} />
      )}

      {/* Filter Panel (B1, B2, B6) */}
      <FilterPanel
        t={t}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        genres={genres}
        companies={companies}
        platforms={platforms}
        selectedGenre={selectedGenre}
        setSelectedGenre={setSelectedGenre}
        selectedCompany={selectedCompany}
        setSelectedCompany={setSelectedCompany}
        selectedPlatform={selectedPlatform}
        setSelectedPlatform={setSelectedPlatform}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedFormat={selectedFormat}
        setSelectedFormat={setSelectedFormat}
        salesPreset={salesPreset}
        setSalesPreset={setSalesPreset}
        serialStatusTab={serialStatusTab}
        setSerialStatusTab={setSerialStatusTab}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onReset={resetFilters}
        filteredCount={filteredTitles.length}
        totalCount={titles.length}
      />

      {/* Title List */}
      {loading ? (
        <ListSkeleton />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-2">
          {filteredTitles.slice(0, 50).map((title, idx) => {
            const isCompareSelected = compareList.includes(title.title_jp);

            return (
              <motion.div
                key={title.title_jp}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.25, delay: idx * 0.05 } },
                }}
                whileHover={{ x: 2 }}
                className="rounded-2xl cursor-pointer transition-all relative overflow-hidden group"
                style={{
                  ...GLASS_CARD,
                  borderLeft: isCompareSelected ? '3px solid var(--color-accent-blue, #818cf8)' : '3px solid transparent',
                }}
                onClick={() => {
                  if (compareMode) {
                    toggleCompare(title.title_jp);
                  } else {
                    loadTitleDetail(title.title_jp);
                  }
                }}
              >
                {/* Hover border slide-in */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl transition-all duration-300 origin-top scale-y-0 group-hover:scale-y-100"
                  style={{ background: 'var(--color-accent-blue, #818cf8)' }}
                />

                <div className="flex items-center gap-4 px-5 py-4">
                  {/* B5: Checkbox in compare mode */}
                  {compareMode && (
                    <div className="shrink-0">
                      {isCompareSelected ? (
                        <CheckSquare size={18} color="#818cf8" />
                      ) : (
                        <Square size={18} color="var(--color-text-muted)" />
                      )}
                    </div>
                  )}

                  {/* Rank number - large, grey */}
                  <div className="shrink-0 w-10 text-center">
                    <span className="text-lg font-bold" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                      {idx + 1}
                    </span>
                  </div>

                  {/* Title info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate" title={title.title_jp} style={{ color: 'var(--color-text-primary)' }}>
                        {title.title_jp}
                      </p>
                      {/* New badge - blue pill */}
                      {title.isNew && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#3b82f620', color: '#3b82f6' }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {title.title_kr && (
                        <p className="text-xs truncate" title={title.title_kr} style={{ color: 'var(--color-text-muted)' }}>{title.title_kr}</p>
                      )}
                      {/* Platform logo badges */}
                      <div className="flex gap-1 shrink-0 ml-1">
                        {title.channels.slice(0, 4).map((p) => (
                          <PlatformBadge key={p} name={p} showName={false} size="sm" />
                        ))}
                        {title.channels.length > 4 && (
                          <span className="text-[10px] px-1 py-0.5 rounded-full font-medium" style={{ color: 'var(--color-text-muted)' }}>
                            +{title.channels.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Sales + Change */}
                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {formatCurrency(title.total_sales)}
                    </p>
                    {/* B9: Rank change badge */}
                    {title.rank_change !== undefined && title.rank_change !== 0 && (
                      <span
                        className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          background: title.rank_change > 0 ? '#22c55e15' : '#ef444415',
                          color: title.rank_change > 0 ? '#22c55e' : '#ef4444',
                        }}
                      >
                        {title.rank_change > 0 ? '▲' : '▼'}{Math.abs(title.rank_change)}
                      </span>
                    )}
                    {title.rank_change === 0 && (
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>-</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {filteredTitles.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <BookOpen size={48} color="var(--color-text-muted)" strokeWidth={1.2} />
              </motion.div>
              <p className="mt-4 text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {t('해당하는 작품이 없습니다', '該当するタイトルがありません')}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                {t('필터를 조정해 보세요', 'フィルターを調整してみてください')}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
