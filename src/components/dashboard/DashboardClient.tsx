'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  LayoutDashboard, TrendingUp, TrendingDown, AlertTriangle, Rocket,
  Zap, ChevronRight, ChevronLeft, Activity, BarChart3, Globe, Layers, Building2,
  BookOpen,
} from 'lucide-react';
import {
  useDashboardKPIs, useMonthlyTrend, usePlatformSummary,
  useTopTitles, useGrowthAlerts, usePeriodKpis,
  useGenreSummary, useCompanySummary,
  useDailyTrend, useWeeklyTrend,
} from '@/hooks/useData';
import { getPlatformColor, getPlatformBrand, PLATFORM_BRANDS } from '@/utils/platformConfig';
import { PlatformBadge } from '@/components/PlatformBadge';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import type {
  KPIData, MonthlyTrendRow, PlatformSummaryRow, TopTitleRow, GrowthAlertRow,
  GenreSalesRow, CompanySalesRow, DailyTrendRow, WeeklyTrendRow,
} from '@/types';

import StatusKPICard from '@/components/dashboard/StatusKPICard';
import InsightPanel from '@/components/dashboard/InsightPanel';
import {
  GLASS_CARD, darkTooltipStyle, formatShort, GENRE_COLORS,
} from '@/components/dashboard/shared';

// ============================================================
// Props — server-side prefetched data
// ============================================================

export interface DashboardInitialData {
  kpis: KPIData | null;
  trend: MonthlyTrendRow[] | null;
  platforms: PlatformSummaryRow[] | null;
  topTitles: TopTitleRow[] | null;
  growthAlerts: GrowthAlertRow[] | null;
}

interface DashboardClientProps {
  initialData?: DashboardInitialData | null;
}

// ============================================================
// Types
// ============================================================

type TrendMode = 'daily' | 'weekly' | 'monthly';
type TabId = 'status' | 'trend' | 'platform' | 'genre' | 'company';

// ============================================================
// Date helpers
// ============================================================

function getThisMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return {
    start: `${y}-${String(m + 1).padStart(2, '0')}-01`,
    end: now.toISOString().slice(0, 10),
  };
}

function getYoYRange(start: string, end: string): { start: string; end: string } {
  if (!start || !end) return { start: '', end: '' };
  const s = new Date(start);
  const e = new Date(end);
  s.setFullYear(s.getFullYear() - 1);
  e.setFullYear(e.getFullYear() - 1);
  return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) };
}

// ============================================================
// Loading skeletons
// ============================================================

function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl p-5" style={{ ...GLASS_CARD, minHeight: '150px', borderLeft: '3px solid var(--color-glass-border)' }}>
          <div className="h-3 w-20 rounded skeleton-shimmer mb-4" />
          <div className="h-9 w-32 rounded skeleton-shimmer mb-2" />
          <div className="h-5 w-24 rounded-full skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton({ height = 360 }: { height?: number }) {
  return (
    <div className="rounded-2xl p-6" style={{ ...GLASS_CARD, minHeight: height }}>
      <div className="h-4 w-40 rounded skeleton-shimmer mb-6" />
      <div className="flex items-end gap-1" style={{ height: height - 100 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-t skeleton-shimmer" style={{ height: `${30 + ((i * 37 + 13) % 60)}%` }} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Custom chart tooltip
// ============================================================

function AreaChartTooltip({ active, payload, label, fmtCurrency }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  fmtCurrency: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{
      background: 'var(--color-tooltip-bg)',
      border: '1px solid var(--color-tooltip-border)',
      borderRadius: '12px',
      padding: '14px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      backdropFilter: 'blur(8px)',
      minWidth: 140,
    }}>
      <p style={{ color: 'var(--color-tooltip-label)', fontSize: 12, marginBottom: 8, fontWeight: 600 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #a78bfa)', boxShadow: '0 0 6px rgba(99,102,241,0.5)', flexShrink: 0 }} />
        <p style={{ color: 'var(--color-tooltip-value)', fontSize: 16, fontWeight: 700, margin: 0 }}>
          {fmtCurrency(payload[0].value)}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Donut label
// ============================================================

function renderDonutLabel(props: {
  cx?: number; cy?: number; midAngle?: number;
  innerRadius?: number; outerRadius?: number; percent?: number; name?: string;
}) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = Number(props.percent ?? 0);
  const name = String(props.name ?? '');
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const displayName = PLATFORM_BRANDS[name]?.nameJP || name;
  return (
    <text x={x} y={y} fill="var(--color-text-secondary)" textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central" fontSize={11} fontWeight={500}>
      {displayName} ({(percent * 100).toFixed(1)}%)
    </text>
  );
}

// ============================================================
// Tab configuration
// ============================================================

const TABS: Array<{ id: TabId; labelKo: string; labelJa: string; icon: React.ReactNode }> = [
  { id: 'status', labelKo: '현황', labelJa: '現況', icon: <Activity size={15} /> },
  { id: 'trend', labelKo: '트렌드', labelJa: 'トレンド', icon: <BarChart3 size={15} /> },
  { id: 'platform', labelKo: '플랫폼', labelJa: 'PF', icon: <Globe size={15} /> },
  { id: 'genre', labelKo: '장르', labelJa: 'ジャンル', icon: <Layers size={15} /> },
  { id: 'company', labelKo: '제작사', labelJa: '制作会社', icon: <Building2 size={15} /> },
];

// ============================================================
// Main Dashboard Page
// ============================================================

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const { formatCurrency, t } = useApp();
  const router = useRouter();

  // Date range
  const defaultRange = useMemo(() => getThisMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [activePreset, setActivePreset] = useState('thisMonth');

  // Tab
  const [activeTab, setActiveTab] = useState<TabId>('status');

  // Trend mode
  const [trendMode, setTrendMode] = useState<TrendMode>('monthly');

  // Sales goal
  const [salesGoal] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_sales_goal');
      if (saved) return parseInt(saved, 10);
    }
    return 0;
  });

  // SWR data hooks (client-side fetch with server prefetch as fallback)
  const sd = startDate || undefined;
  const ed = endDate || undefined;

  const { data: kpisRaw, error: kpiError } = useDashboardKPIs();
  const { data: monthlyTrendRaw } = useMonthlyTrend();
  const { data: platformSummaryRaw } = usePlatformSummary();
  const { data: topTitlesRaw } = useTopTitles(20);
  const { data: growthAlertsRaw } = useGrowthAlerts();
  const { data: genreSummaryRaw } = useGenreSummary(sd, ed);
  const { data: companySummaryRaw } = useCompanySummary(sd, ed);
  const { data: dailyTrendRaw } = useDailyTrend(sd, ed);
  const { data: weeklyTrendRaw } = useWeeklyTrend(sd, ed);

  // Use SWR data, fall back to server-prefetched initialData
  const kpis = (kpisRaw ?? initialData?.kpis) as KPIData | undefined;

  // YoY
  const yoyRange = useMemo(() => startDate && endDate ? getYoYRange(startDate, endDate) : null, [startDate, endDate]);
  const { data: yoyKpis } = usePeriodKpis(yoyRange?.start ?? '', yoyRange?.end ?? '');

  // Normalize SWR data with fallbacks — prefer SWR, then initialData, then empty
  const monthlyTrend = useMemo<MonthlyTrendRow[]>(() => monthlyTrendRaw ?? initialData?.trend ?? [], [monthlyTrendRaw, initialData?.trend]);
  const platformSummary = useMemo<PlatformSummaryRow[]>(() => platformSummaryRaw ?? initialData?.platforms ?? [], [platformSummaryRaw, initialData?.platforms]);
  const topTitles = useMemo<TopTitleRow[]>(() => topTitlesRaw ?? initialData?.topTitles ?? [], [topTitlesRaw, initialData?.topTitles]);
  const growthAlerts = useMemo<GrowthAlertRow[]>(() => growthAlertsRaw ?? initialData?.growthAlerts ?? [], [growthAlertsRaw, initialData?.growthAlerts]);
  const genreSummary = useMemo<GenreSalesRow[]>(() => (genreSummaryRaw ?? []) as GenreSalesRow[], [genreSummaryRaw]);
  const companySummary = useMemo<CompanySalesRow[]>(() => (companySummaryRaw ?? []) as CompanySalesRow[], [companySummaryRaw]);
  const dailyTrend = useMemo<DailyTrendRow[]>(() => (dailyTrendRaw ?? []) as DailyTrendRow[], [dailyTrendRaw]);
  const weeklyTrend = useMemo<WeeklyTrendRow[]>(() => (weeklyTrendRaw ?? []) as WeeklyTrendRow[], [weeklyTrendRaw]);

  const loading = !kpis && !monthlyTrendRaw && !initialData?.kpis;
  const error = kpiError ? (kpiError instanceof Error ? kpiError.message : 'Failed to load data') : null;

  // Data freshness
  const [freshnessDate, setFreshnessDate] = useState('');
  const [hasPreliminary, setHasPreliminary] = useState(false);

  const lastDataDate = useMemo(() => {
    if (freshnessDate) return freshnessDate;
    if (monthlyTrend.length > 0) return monthlyTrend[monthlyTrend.length - 1].month;
    return '';
  }, [freshnessDate, monthlyTrend]);

  useEffect(() => {
    async function checkFreshness() {
      try {
        const res = await fetch('/api/sales/paginated?page=1&pageSize=1&sortBy=sale_date&sortDir=desc');
        if (res.ok) {
          const data = await res.json();
          if (data.rows?.[0]) {
            setFreshnessDate(data.rows[0].sale_date);
            setHasPreliminary(data.rows[0].is_preliminary === true);
          }
        }
      } catch { /* non-critical */ }
    }
    checkFreshness();
  }, []);

  // ---------- Derived data ----------
  const yoyChange = useMemo(() => {
    if (!kpis || !yoyKpis || yoyKpis.total_sales === 0) return null;
    return ((kpis.this_month_sales - yoyKpis.total_sales) / yoyKpis.total_sales) * 100;
  }, [kpis, yoyKpis]);

  const goalRate = useMemo(() => {
    if (!kpis || salesGoal <= 0) return null;
    return (kpis.this_month_sales / salesGoal) * 100;
  }, [kpis, salesGoal]);

  const trendChartData = useMemo(() => {
    if (trendMode === 'daily') return dailyTrend.map(r => ({ label: r.day.length >= 10 ? r.day.slice(5) : r.day, sales: r.total_sales }));
    if (trendMode === 'weekly') return weeklyTrend.map(r => ({ label: r.week, sales: r.total_sales }));
    return monthlyTrend.map(r => ({ label: r.month.length >= 7 ? r.month.slice(2) : r.month, sales: r.total_sales }));
  }, [trendMode, dailyTrend, weeklyTrend, monthlyTrend]);

  const pieData = platformSummary.map(r => ({ name: r.channel, value: r.total_sales, color: getPlatformColor(r.channel) }));
  const platformBarData = platformSummary.slice(0, 8).map(r => ({ name: r.channel, sales: r.total_sales, color: getPlatformColor(r.channel) }));

  const trendLabels: Record<TrendMode, string> = {
    daily: t('일별', '日別'),
    weekly: t('주별', '週別'),
    monthly: t('월별', '月別'),
  };

  // ---------- Alert data ----------
  const declining = useMemo(() => growthAlerts.filter(a => a.growth_pct <= -30).sort((a, b) => a.growth_pct - b.growth_pct), [growthAlerts]);
  const surging = useMemo(() => growthAlerts.filter(a => a.growth_pct >= 50).sort((a, b) => b.growth_pct - a.growth_pct), [growthAlerts]);

  // Genre pie data
  const genrePieData = genreSummary.map((d, i) => ({
    name: d.genre_kr || d.genre_code,
    value: d.total_sales,
    color: GENRE_COLORS[i % GENRE_COLORS.length],
    genre_code: d.genre_code,
  }));
  const genreTotal = genreSummary.reduce((s, d) => s + d.total_sales, 0);

  // ---------- Error state ----------
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p style={{ color: '#ef4444', fontSize: 14 }}>Error: {error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}>
          {t('재시도', 'リトライ')}
        </button>
      </div>
    );
  }

  // =================================================================
  // RENDER
  // =================================================================

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* ===== HEADER ===== */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow">
          <LayoutDashboard size={22} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('경영 브리핑', '経営ブリーフィング')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {lastDataDate
              ? `${lastDataDate} ${t('기준', '基準')}`
              : t('실시간 매출 개요', 'リアルタイム売上概要')}
          </p>
        </div>

        {/* Date selector + badges */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* 월 선택 네비게이션 */}
          <div className="flex items-center gap-1 rounded-xl px-1 py-1" style={{ background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}>
            <button
              onClick={() => {
                const d = new Date(startDate);
                d.setMonth(d.getMonth() - 1);
                const y = d.getFullYear();
                const m = d.getMonth();
                setStartDate(`${y}-${String(m + 1).padStart(2, '0')}-01`);
                const lastDay = new Date(y, m + 1, 0);
                setEndDate(lastDay.toISOString().slice(0, 10));
                setActivePreset('custom');
              }}
              className="p-1.5 rounded-lg transition-colors hover:brightness-125"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[14px] font-bold px-3 min-w-[140px] text-center" style={{ color: 'var(--color-text-primary)' }}>
              {(() => {
                const d = new Date(startDate);
                return `${d.getFullYear()}${t('년', '年')} ${d.getMonth() + 1}${t('월', '月')}`;
              })()}
            </span>
            <button
              onClick={() => {
                const d = new Date(startDate);
                d.setMonth(d.getMonth() + 1);
                const y = d.getFullYear();
                const m = d.getMonth();
                setStartDate(`${y}-${String(m + 1).padStart(2, '0')}-01`);
                const lastDay = new Date(y, m + 1, 0);
                const today = new Date();
                setEndDate(lastDay > today ? today.toISOString().slice(0, 10) : lastDay.toISOString().slice(0, 10));
                setActivePreset('custom');
              }}
              className="p-1.5 rounded-lg transition-colors hover:brightness-125"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 프리셋 버튼 */}
          {[
            { id: 'thisMonth', ko: '이번달', ja: '今月' },
            { id: 'lastMonth', ko: '지난달', ja: '先月' },
            { id: 'thisYear', ko: '올해', ja: '今年' },
            { id: 'all', ko: '전체', ja: '全体' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setActivePreset(preset.id);
                const now = new Date();
                if (preset.id === 'thisMonth') {
                  setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
                  setEndDate(now.toISOString().slice(0, 10));
                } else if (preset.id === 'lastMonth') {
                  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  setStartDate(`${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}-01`);
                  const lastDay = new Date(lm.getFullYear(), lm.getMonth() + 1, 0);
                  setEndDate(lastDay.toISOString().slice(0, 10));
                } else if (preset.id === 'thisYear') {
                  setStartDate(`${now.getFullYear()}-01-01`);
                  setEndDate(now.toISOString().slice(0, 10));
                } else {
                  setStartDate('2020-01-01');
                  setEndDate(now.toISOString().slice(0, 10));
                }
              }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: activePreset === preset.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--color-glass)',
                color: activePreset === preset.id ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${activePreset === preset.id ? 'transparent' : 'var(--color-glass-border)'}`,
              }}
            >
              {t(preset.ko, preset.ja)}
            </button>
          ))}

          {/* 속보치 배지 */}
          {hasPreliminary && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              <Zap size={12} />
              {t('속보치', '速報値')}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <KPISkeleton />
          <ChartSkeleton height={200} />
          <ChartSkeleton height={400} />
        </div>
      ) : !kpis ? (
        <div className="rounded-2xl p-12 flex flex-col items-center justify-center min-h-[300px]" style={GLASS_CARD}>
          <BookOpen size={48} style={{ color: 'var(--color-text-muted)' }} className="mb-4" />
          <p style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>
            {t('데이터가 없습니다. 업로드 후 시작하세요.', 'データがありません。アップロードしてください。')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ===== KPI SECTION ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatusKPICard
              label={t('이달 매출', '今月売上')}
              value={kpis.this_month_sales}
              formatter={formatCurrency}
              status={kpis.mom_change >= 0 ? 'good' : kpis.mom_change >= -20 ? 'warn' : 'bad'}
              subText={`${t('전월', '前月')}: ${formatCurrency(kpis.last_month_sales)}`}
              delay={0}
              icon={<BarChart3 size={16} />}
            />
            <StatusKPICard
              label={t('전월 대비', '前月比')}
              value={Math.abs(kpis.mom_change)}
              formatter={(v) => `${kpis.mom_change >= 0 ? '+' : '-'}${v.toFixed(1)}%`}
              status={kpis.mom_change >= 0 ? 'good' : kpis.mom_change >= -20 ? 'warn' : 'bad'}
              changePct={kpis.mom_change}
              changeLabel="MoM"
              delay={0.08}
              icon={kpis.mom_change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            />
            <StatusKPICard
              label={t('전년 대비', '前年比')}
              value={yoyChange !== null ? Math.abs(yoyChange) : 0}
              formatter={(v) => yoyChange !== null ? `${yoyChange >= 0 ? '+' : '-'}${v.toFixed(1)}%` : '—'}
              status={yoyChange === null ? 'neutral' : yoyChange >= 0 ? 'good' : yoyChange >= -20 ? 'warn' : 'bad'}
              changePct={yoyChange}
              changeLabel="YoY"
              delay={0.16}
              icon={<Activity size={16} />}
            />
            <StatusKPICard
              label={t('활성 작품/PF', 'アクティブ')}
              value={kpis.active_titles}
              formatter={(v) => `${v}${t('작품', '作品')} / ${kpis.active_platforms}PF`}
              status="neutral"
              delay={0.24}
              icon={<BookOpen size={16} />}
            />
          </div>

          {/* ===== ALERT PANEL (2-column) ===== */}
          {(declining.length > 0 || surging.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Declining */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="rounded-2xl p-5"
                style={{ ...GLASS_CARD, borderLeft: '3px solid #ef4444' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} color="#ef4444" />
                  <h3 className="text-[14px] font-semibold" style={{ color: '#ef4444' }}>
                    {t('주의 작품', '注意作品')}
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    {declining.length}{t('건', '件')}
                  </span>
                </div>
                <div className="space-y-2">
                  {declining.slice(0, 5).map((alert, i) => (
                    <motion.div
                      key={alert.title_jp}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.12 }}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)' }}
                      whileHover={{ x: 4, background: 'rgba(239,68,68,0.08)' }}
                      onClick={() => router.push(`/titles?search=${encodeURIComponent(alert.title_jp)}`)}
                    >
                      <TrendingDown size={14} color="#ef4444" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {alert.title_kr || alert.title_jp}
                        </p>
                      </div>
                      <span className="text-[13px] font-bold shrink-0" style={{ color: '#ef4444' }}>
                        {alert.growth_pct.toFixed(0)}%
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                    </motion.div>
                  ))}
                </div>
                {declining.length > 5 && (
                  <button onClick={() => router.push('/titles')}
                    className="mt-3 text-[12px] font-medium w-full text-center py-1.5 rounded-lg transition-colors"
                    style={{ color: '#ef4444', background: 'rgba(239,68,68,0.06)' }}>
                    {t('전체 보기', 'すべて表示')} ({declining.length})
                  </button>
                )}
              </motion.div>

              {/* Surging */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="rounded-2xl p-5"
                style={{ ...GLASS_CARD, borderLeft: '3px solid #22c55e' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Rocket size={16} color="#22c55e" />
                  <h3 className="text-[14px] font-semibold" style={{ color: '#22c55e' }}>
                    {t('급성장 작품', '急成長作品')}
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                    {surging.length}{t('건', '件')}
                  </span>
                </div>
                <div className="space-y-2">
                  {surging.slice(0, 5).map((alert, i) => (
                    <motion.div
                      key={alert.title_jp}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.12 }}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.08)' }}
                      whileHover={{ x: 4, background: 'rgba(34,197,94,0.08)' }}
                      onClick={() => router.push(`/titles?search=${encodeURIComponent(alert.title_jp)}`)}
                    >
                      <TrendingUp size={14} color="#22c55e" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {alert.title_kr || alert.title_jp}
                        </p>
                      </div>
                      <span className="text-[13px] font-bold shrink-0" style={{ color: '#22c55e' }}>
                        +{alert.growth_pct.toFixed(0)}%
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                    </motion.div>
                  ))}
                </div>
                {surging.length > 5 && (
                  <button onClick={() => router.push('/titles')}
                    className="mt-3 text-[12px] font-medium w-full text-center py-1.5 rounded-lg transition-colors"
                    style={{ color: '#22c55e', background: 'rgba(34,197,94,0.06)' }}>
                    {t('전체 보기', 'すべて表示')} ({surging.length})
                  </button>
                )}
              </motion.div>
            </div>
          )}

          {/* ===== TAB NAVIGATION ===== */}
          <div className="rounded-2xl overflow-hidden" style={GLASS_CARD}>
            {/* Tab bar */}
            <div className="flex border-b" style={{ borderColor: 'var(--color-glass-border)' }}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex items-center gap-1.5 px-5 py-3.5 text-[13px] font-medium transition-colors"
                    style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                  >
                    {tab.icon}
                    {t(tab.labelKo, tab.labelJa)}
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px]"
                        style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {/* ---- STATUS TAB ---- */}
                {activeTab === 'status' && (
                  <motion.div
                    key="status"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Trend mode toggle */}
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                      <h3 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {trendLabels[trendMode]} {t('매출 추이', '売上推移')}
                      </h3>
                      <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-glass-border)' }}>
                        {(['daily', 'weekly', 'monthly'] as TrendMode[]).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setTrendMode(mode)}
                            className="px-3 py-1.5 text-[12px] font-medium transition-all"
                            style={{
                              background: trendMode === mode ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                              color: trendMode === mode ? '#fff' : 'var(--color-text-secondary)',
                            }}
                          >
                            {trendLabels[mode]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={340}>
                      <AreaChart data={trendChartData}>
                        <defs>
                          <linearGradient id="execAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                        <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} width={60} />
                        <ReTooltip content={<AreaChartTooltip fmtCurrency={formatCurrency} />} />
                        <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2.5} fill="url(#execAreaGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}

                {/* ---- TREND TAB (Top Titles) ---- */}
                {activeTab === 'trend' && (
                  <motion.div
                    key="trend"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                      Top {Math.min(topTitles.length, 15)} {t('작품', 'タイトル')}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--color-table-border)' }}>
                            <th className="text-left py-3 px-2 font-medium text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>#</th>
                            <th className="text-left py-3 px-2 font-medium text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{t('작품', 'タイトル')}</th>
                            <th className="text-left py-3 px-2 font-medium text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{t('플랫폼', 'PF')}</th>
                            <th className="text-right py-3 px-2 font-medium text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{t('총 매출', '累計売上')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topTitles.slice(0, 15).map((title, idx) => (
                            <motion.tr
                              key={title.title_jp}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.04 }}
                              style={{ borderBottom: '1px solid var(--color-table-border-subtle)' }}
                              className="cursor-pointer transition-colors hover:brightness-110"
                              onClick={() => router.push(`/titles?highlight=${encodeURIComponent(title.title_jp)}`)}
                            >
                              <td className="py-3 px-2 font-bold text-[13px]" style={{ color: idx < 3 ? '#6366f1' : 'var(--color-text-muted)' }}>
                                {idx + 1}
                              </td>
                              <td className="py-3 px-2" style={{ maxWidth: 250 }}>
                                <p className="font-medium text-[13px] truncate" style={{ color: 'var(--color-text-primary)' }}>{title.title_jp}</p>
                                {title.title_kr && <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{title.title_kr}</p>}
                              </td>
                              <td className="py-3 px-2">
                                <div className="flex gap-1 flex-wrap">
                                  {(title.channels ?? []).slice(0, 3).map((ch) => (
                                    <PlatformBadge key={ch} name={ch} showName={false} size="sm" />
                                  ))}
                                  {(title.channels ?? []).length > 3 && (
                                    <span className="text-[10px] px-1" style={{ color: 'var(--color-text-muted)' }}>+{title.channels.length - 3}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right font-bold text-[13px]" style={{ color: 'var(--color-text-primary)' }}>
                                {formatCurrency(title.total_sales)}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {/* ---- PLATFORM TAB ---- */}
                {activeTab === 'platform' && (
                  <motion.div
                    key="platform"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Donut */}
                      <div>
                        <h3 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                          {t('플랫폼 점유율', 'PF占有率')}
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={pieData} dataKey="value" nameKey="name"
                              cx="50%" cy="50%" innerRadius={60} outerRadius={105}
                              paddingAngle={2} label={renderDonutLabel} labelLine={false}
                              onClick={(_, idx) => router.push(`/platforms?channel=${encodeURIComponent(pieData[idx].name)}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} fillOpacity={0.85} />)}
                            </Pie>
                            <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('매출', '売上')]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Ranking bars */}
                      <div>
                        <h3 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                          {t('플랫폼 랭킹', 'PFランキング')}
                        </h3>
                        <div className="space-y-3">
                          {platformBarData.map((pf, i) => {
                            const maxSales = platformBarData[0]?.sales ?? 1;
                            const barWidth = maxSales > 0 ? (pf.sales / maxSales) * 100 : 0;
                            const brand = getPlatformBrand(pf.name);
                            return (
                              <motion.div
                                key={pf.name}
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06 }}
                                className="cursor-pointer group"
                                onClick={() => router.push(`/platforms?channel=${encodeURIComponent(pf.name)}`)}
                              >
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="text-[12px] font-bold w-5 text-center" style={{ color: i < 3 ? pf.color : 'var(--color-text-muted)' }}>
                                    {i + 1}
                                  </span>
                                  {brand.logo ? (
                                    <img src={brand.logo} alt={pf.name} className="w-6 h-6 rounded-md object-contain" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                                      style={{ background: brand.bgColor, color: brand.color, border: `1px solid ${brand.borderColor}` }}>
                                      {brand.icon}
                                    </div>
                                  )}
                                  <span className="text-[13px] font-medium flex-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                                    {brand.nameJP || pf.name}
                                  </span>
                                  <span className="text-[13px] font-bold shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                                    {formatCurrency(pf.sales)}
                                  </span>
                                </div>
                                <div className="ml-8 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-glass-border)' }}>
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: pf.color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${barWidth}%` }}
                                    transition={{ duration: 0.7, delay: 0.1 + i * 0.06 }}
                                  />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ---- GENRE TAB ---- */}
                {activeTab === 'genre' && (
                  <motion.div
                    key="genre"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Genre donut */}
                      <div>
                        <h3 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                          {t('장르별 점유율', 'ジャンル別占有率')}
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={genrePieData} dataKey="value" nameKey="name"
                              cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2}
                              onClick={(_, idx) => router.push(`/titles?genre=${encodeURIComponent(genrePieData[idx].genre_code)}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              {genrePieData.map((entry, idx) => <Cell key={idx} fill={entry.color} fillOpacity={0.85} />)}
                            </Pie>
                            <ReTooltip {...darkTooltipStyle} formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('매출', '売上')]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Genre list */}
                      <div>
                        <h3 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                          {t('장르별 매출', 'ジャンル別売上')}
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {genreSummary.map((row, i) => {
                            const pct = genreTotal > 0 ? ((row.total_sales / genreTotal) * 100).toFixed(1) : '0';
                            return (
                              <motion.div
                                key={row.genre_code}
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                                style={{ background: 'var(--color-surface)' }}
                                onClick={() => router.push(`/titles?genre=${encodeURIComponent(row.genre_code)}`)}
                              >
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: GENRE_COLORS[i % GENRE_COLORS.length] }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                                    {row.genre_kr || row.genre_code}
                                  </p>
                                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                                    {row.title_count}{t('작품', '作品')} / {pct}%
                                  </p>
                                </div>
                                <p className="text-[13px] font-bold shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                                  {formatCurrency(row.total_sales)}
                                </p>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ---- COMPANY TAB ---- */}
                {activeTab === 'company' && (
                  <motion.div
                    key="company"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="text-[15px] font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                      {t('제작사별 매출 TOP 10', '制作会社別売上 TOP 10')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {companySummary.slice(0, 10).map((row, i) => {
                        const maxSales = companySummary[0]?.total_sales ?? 1;
                        const barWidth = maxSales > 0 ? (row.total_sales / maxSales) * 100 : 0;
                        return (
                          <motion.div
                            key={row.company_name}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="rounded-xl p-4"
                            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-glass-border)' }}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[20px] font-bold" style={{ color: i < 3 ? '#6366f1' : 'var(--color-text-muted)' }}>
                                {i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                                  {row.company_name}
                                </p>
                                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                                  {row.title_count}{t('작품', '作品')}
                                </p>
                              </div>
                              <p className="text-[14px] font-bold shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                                {formatCurrency(row.total_sales)}
                              </p>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-glass-border)' }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: 'linear-gradient(90deg, #6366f1, #a78bfa)' }}
                                initial={{ width: 0 }}
                                animate={{ width: `${barWidth}%` }}
                                transition={{ duration: 0.6, delay: 0.1 + i * 0.05 }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ===== INSIGHT PANEL ===== */}
          <InsightPanel
            kpis={kpis}
            yoyChange={yoyChange}
            growthAlerts={growthAlerts}
            platformSummary={platformSummary}
            goalRate={goalRate}
          />
        </div>
      )}
    </motion.div>
  );
}
