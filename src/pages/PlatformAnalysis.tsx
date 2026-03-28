import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { Monitor, TrendingUp, BarChart3 } from 'lucide-react';
import { fetchPlatformSummary, fetchPlatformDetail } from '@/lib/supabase';
import { getPlatformColor, getPlatformBrand, getPlatformLogo } from '@/utils/platformConfig';
import { useApp } from '@/context/AppContext';

// ============================================================
// Types for RPC responses
// ============================================================

interface PlatformSummaryRow {
  channel: string;
  total_sales: number;
  title_count: number;
  avg_daily: number;
}

interface PlatformDetailData {
  total_sales: number;
  title_count: number;
  daily_avg: number;
  monthly_trend: Array<{ month: string; sales: number }>;
  top_titles: Array<{ title_jp: string; title_kr: string | null; total_sales: number }>;
}

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
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.2 },
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
// Main Component
// ============================================================

export function PlatformAnalysis() {
  const { formatCurrency, t } = useApp();

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

  const formatShort = (value: number): string => {
    if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}`;
    if (value >= 10_000) return `${(value / 10_000).toFixed(0)}`;
    return value.toLocaleString();
  };

  // Load platform summary via RPC
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchPlatformSummary();
        const rows = (data as PlatformSummaryRow[]) ?? [];
        setPlatformSummary(rows);
        if (rows.length > 0) {
          setSelectedPlatform(rows[0].channel);
        }
      } catch (err) {
        console.error('Failed to load platform summary:', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Load detail for selected platform
  const loadPlatformDetail = useCallback(async (channel: string) => {
    setDetailLoading(true);
    try {
      const data = await fetchPlatformDetail(channel);
      setDetailData(data as PlatformDetailData);
    } catch (err) {
      console.error('Failed to load platform detail:', err);
      setDetailData(null);
    }
    setDetailLoading(false);
  }, []);

  // When selected platform changes (single mode), load its detail
  useEffect(() => {
    if (selectedPlatform && !compareMode) {
      loadPlatformDetail(selectedPlatform);
    }
  }, [selectedPlatform, compareMode, loadPlatformDetail]);

  // Load comparison details when comparePlatforms changes
  useEffect(() => {
    if (!compareMode || comparePlatforms.length === 0) return;
    let cancelled = false;
    async function loadAll() {
      setCompareLoading(true);
      const newMap = new Map<string, PlatformDetailData>();
      for (const ch of comparePlatforms) {
        try {
          const data = await fetchPlatformDetail(ch);
          if (!cancelled && data) newMap.set(ch, data as PlatformDetailData);
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

  const platformNames = useMemo(() =>
    platformSummary.map((p) => p.channel),
    [platformSummary]
  );

  // Build compare chart data from compare details
  const compareChartData = useMemo(() => {
    if (comparePlatforms.length === 0 || compareDetails.size === 0) return [];

    // Get all unique months
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

  const toggleComparePlatform = (pf: string) => {
    setComparePlatforms((prev) =>
      prev.includes(pf) ? prev.filter((p) => p !== pf) : [...prev, pf]
    );
  };

  // KPIs from summary row
  const selectedSummary = useMemo(
    () => platformSummary.find((p) => p.channel === selectedPlatform),
    [platformSummary, selectedPlatform]
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
                      <img
                        src={logo}
                        alt={brand.nameJP || pf}
                        className="rounded-lg"
                        style={{ width: 40, height: 40, objectFit: 'contain' }}
                      />
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
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* KPI cards (single mode only) */}
          {!compareMode && selectedPlatform && (
            detailLoading ? <KPISkeleton /> : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    label: t('누적 매출', '累計売上'),
                    value: formatCurrency(detailData?.total_sales ?? selectedSummary?.total_sales ?? 0),
                    icon: <TrendingUp size={16} />,
                  },
                  {
                    label: t('작품 수', 'タイトル数'),
                    value: String(detailData?.title_count ?? selectedSummary?.title_count ?? 0),
                    icon: null,
                  },
                  {
                    label: t('일평균 매출', '日平均売上'),
                    value: formatCurrency(detailData?.daily_avg ?? selectedSummary?.avg_daily ?? 0),
                    icon: null,
                  },
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
            )
          )}

          {/* Trend chart */}
          <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
            <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
              {compareMode
                ? t('플랫폼 비교', 'プラットフォーム比較')
                : `${getPlatformBrand(selectedPlatform ?? '').nameJP || (selectedPlatform ?? '')} ${t('매출 추이', '売上推移')}`}
            </h2>

            {compareMode ? (
              // Compare mode: overlay trends from multiple platforms
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
              // Single mode: show trend from detail data
              detailLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : (detailData?.monthly_trend ?? []).length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={(detailData?.monthly_trend ?? []).map((d) => ({ label: d.month, sales: d.sales }))}>
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
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke={getPlatformColor(selectedPlatform ?? '')}
                      strokeWidth={2}
                      fill="url(#pfSingleGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                  {t('플랫폼을 선택해주세요', 'プラットフォームを選択してください')}
                </p>
              )
            )}
          </motion.div>

          {/* Top titles on this platform (single mode only) */}
          {!compareMode && selectedPlatform && !detailLoading && (detailData?.top_titles ?? []).length > 0 && (
            <motion.div variants={cardVariants} className="rounded-2xl p-6" style={GLASS_CARD}>
              <h2 className="text-base font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
                Top {t('작품', 'タイトル')} — {getPlatformBrand(selectedPlatform).nameJP || selectedPlatform}
              </h2>

              <ResponsiveContainer width="100%" height={Math.max(200, (detailData?.top_titles ?? []).slice(0, 10).length * 40)}>
                <BarChart data={(detailData?.top_titles ?? []).slice(0, 10)} layout="vertical" margin={{ left: 120 }}>
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

              {/* Table below chart */}
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
                    {(detailData?.top_titles ?? []).map((title, idx) => (
                      <tr key={title.title_jp} style={{ borderBottom: '1px solid var(--color-table-border-subtle)' }}>
                        <td className="py-3 px-2 font-bold" style={{ color: idx < 3 ? '#a5b4fc' : 'var(--color-text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td className="py-3 px-2">
                          <p className="font-medium truncate max-w-[300px]" style={{ color: 'var(--color-text-primary)' }}>{title.title_jp}</p>
                          {title.title_kr && <p className="text-xs truncate max-w-[300px]" style={{ color: 'var(--color-text-muted)' }}>{title.title_kr}</p>}
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
        </motion.div>
      )}
    </motion.div>
  );
}
