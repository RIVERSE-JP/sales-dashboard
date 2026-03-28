'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { BookOpen, Search, ArrowLeft, TrendingUp } from 'lucide-react';
import { fetchTitleSummaries, fetchTitleDetail } from '@/lib/supabase';
import { getPlatformColor } from '@/utils/platformConfig';
import { PlatformBadge } from '@/components/PlatformBadge';
import { useApp } from '@/context/AppContext';
import type { TitleSummaryRow, TitleDetailData } from '@/types';

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

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl p-5 animate-pulse" style={GLASS_CARD}>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-glass)]" />
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
          <div key={i} className="flex-1 rounded-t bg-[var(--color-glass)]" style={{ height: `${30 + ((i * 37 + 13) % 60)}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function TitleAnalysisPage() {
  const { formatCurrency, t } = useApp();

  const [loading, setLoading] = useState(true);
  const [titles, setTitles] = useState<TitleSummaryRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<TitleDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const formatShort = (value: number): string => {
    if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}`;
    if (value >= 10_000) return `${(value / 10_000).toFixed(0)}`;
    return value.toLocaleString();
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchTitleSummaries();
        const result: TitleSummaryRow[] = (data ?? []).map((row: TitleSummaryRow) => ({
          title_jp: row.title_jp,
          title_kr: row.title_kr,
          channels: row.channels ?? [],
          first_date: row.first_date,
          total_sales: row.total_sales,
          day_count: row.day_count,
        }));
        setTitles(result.sort((a, b) => b.total_sales - a.total_sales));
      } catch (err) {
        console.error('Failed to load title summaries:', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const loadTitleDetail = useCallback(async (titleJP: string) => {
    setDetailLoading(true);
    setSelectedTitle(titleJP);
    try {
      const data = await fetchTitleDetail(titleJP);
      setDetailData(data);
    } catch (err) {
      console.error('Failed to load title detail:', err);
      setDetailData(null);
    }
    setDetailLoading(false);
  }, []);

  const filteredTitles = useMemo(() => {
    if (!searchQuery.trim()) return titles;
    const q = searchQuery.toLowerCase();
    return titles.filter(
      (t) => t.title_jp.toLowerCase().includes(q) || (t.title_kr?.toLowerCase().includes(q) ?? false)
    );
  }, [titles, searchQuery]);

  const selectedTitleInfo = useMemo(
    () => titles.find((t) => t.title_jp === selectedTitle),
    [titles, selectedTitle]
  );

  // Detail view
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

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} style={{ minHeight: '100vh' }}>
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
            <h1 className="text-xl font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {selectedTitle}
            </h1>
            {(detailData?.title_kr || selectedTitleInfo?.title_kr) && (
              <p className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
                {detailData?.title_kr || selectedTitleInfo?.title_kr}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: t('누적 매출', '累計売上'), value: formatCurrency(detailData?.total_sales ?? selectedTitleInfo?.total_sales ?? 0) },
                { label: t('플랫폼 수', 'プラットフォーム数'), value: String(platformBreakdown.length || (detailData?.channels ?? []).length) },
                {
                  label: t('최근 추이', '期間トレンド'),
                  value: prevMonth > 0 ? `${periodChange > 0 ? '+' : ''}${periodChange.toFixed(1)}%` : '-',
                  color: periodChange >= 0 ? '#22c55e' : '#ef4444',
                },
              ].map((kpi, idx) => (
                <motion.div key={idx} variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>{kpi.label}</p>
                  <p className="text-2xl font-bold" style={{ color: kpi.color ?? 'var(--color-text-primary)' }}>{kpi.value}</p>
                </motion.div>
              ))}
            </div>

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

            {prevMonth > 0 && (
              <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
                <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                  {t('기간 비교', '期間比較')}
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl p-4" style={{ background: 'var(--color-glass)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t('전월', '前月')}</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(prevMonth)}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: 'var(--color-glass)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>{t('이번달', '今月')}</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(recentMonth)}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <TrendingUp size={16} color={periodChange >= 0 ? '#22c55e' : '#ef4444'} />
                  <span className="text-sm font-semibold" style={{ color: periodChange >= 0 ? '#22c55e' : '#ef4444' }}>
                    {periodChange > 0 ? '+' : ''}{periodChange.toFixed(1)}% {t('변화', '変化')}
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  }

  // List view
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow">
          <BookOpen size={20} color="white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('작품 분석', 'タイトル分析')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('작품별 매출 분석 및 트렌드', '作品別の売上分析・トレンド')}
          </p>
        </div>
      </div>

      <motion.div variants={cardVariants} initial="hidden" animate="show" className="rounded-2xl p-4 mb-6" style={GLASS_CARD}>
        <div className="flex items-center gap-3">
          <Search size={18} color="var(--color-text-muted)" />
          <input
            type="text"
            placeholder={t('작품명으로 검색 (JP / KR)...', 'タイトル名で検索 (JP / KR)...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--color-text-primary)' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs cursor-pointer hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:rounded" style={{ color: 'var(--color-text-secondary)' }}>
              {t('초기화', 'クリア')}
            </button>
          )}
        </div>
      </motion.div>

      <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
        {filteredTitles.length} {t('개 작품', 'タイトル')} {searchQuery && `("${searchQuery}")`}
      </p>

      {loading ? (
        <ListSkeleton />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
          {filteredTitles.slice(0, 50).map((title) => (
            <motion.div
              key={title.title_jp}
              variants={cardVariants}
              whileHover={{ scale: 1.01, background: 'var(--color-glass-hover)' }}
              className="rounded-2xl p-5 cursor-pointer transition-all"
              style={GLASS_CARD}
              onClick={() => loadTitleDetail(title.title_jp)}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{
                    background: `${getPlatformColor(title.channels[0])}20`,
                    color: getPlatformColor(title.channels[0]),
                  }}
                >
                  {title.channels.length}P
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" title={title.title_jp} style={{ color: 'var(--color-text-primary)' }}>
                    {title.title_jp}
                  </p>
                  {title.title_kr && (
                    <p className="text-xs truncate" title={title.title_kr} style={{ color: 'var(--color-text-muted)' }}>{title.title_kr}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {title.channels.slice(0, 3).map((p) => (
                    <PlatformBadge key={p} name={p} showName={false} size="sm" />
                  ))}
                  {title.channels.length > 3 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      +{title.channels.length - 3}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(title.total_sales)}
                </p>
              </div>
            </motion.div>
          ))}
          {filteredTitles.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
              {t('해당하는 작품이 없습니다', '該当するタイトルがありません')}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
