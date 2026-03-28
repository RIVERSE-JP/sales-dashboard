'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import {
  LayoutDashboard, TrendingUp, TrendingDown, BookOpen, Calendar,
  Clock,
} from 'lucide-react';
import {
  fetchDashboardKPIs, fetchMonthlyTrend, fetchPlatformSummary,
  fetchTopTitles, fetchGrowthAlerts,
  fetchPeriodKpis, fetchGenreSummary, fetchCompanySummary,
  fetchFormatSummary, fetchDailyTrend, fetchWeeklyTrend,
} from '@/lib/supabase';
import { getPlatformColor, PLATFORM_BRANDS } from '@/utils/platformConfig';
import { PlatformBadge } from '@/components/PlatformBadge';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import type { KPIData, MonthlyTrendRow, PlatformSummaryRow, TopTitleRow, GrowthAlertRow } from '@/types';

import DateRangePicker from '@/components/dashboard/DateRangePicker';
import GenreChart from '@/components/dashboard/GenreChart';
import CompanyRanking from '@/components/dashboard/CompanyRanking';
import FormatChart from '@/components/dashboard/FormatChart';
import GrowthAlertsPanel from '@/components/dashboard/GrowthAlerts';
import SalesGoal from '@/components/dashboard/SalesGoal';
import {
  GLASS_CARD, GLASS_CARD_HOVER, containerVariants, cardVariants,
  darkTooltipStyle, formatShort,
} from '@/components/dashboard/shared';

// ============================================================
// AnimatedNumber component
// ============================================================

function AnimatedNumber({ value, formatter }: {
  value: number;
  formatter: (v: number) => string;
}) {
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 50, damping: 20, duration: 1500 });
  const display = useTransform(springVal, (v: number) => formatter(v));

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  return <motion.span>{display}</motion.span>;
}

function AnimatedCount({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 60, damping: 20, duration: 1200 });
  const display = useTransform(springVal, (v: number) => Math.round(v).toString());

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  return <motion.span>{display}</motion.span>;
}

// ============================================================
// Loading skeleton components
// ============================================================

function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl p-6" style={{ ...GLASS_CARD, minHeight: '140px' }}>
          <div className="h-3 w-20 rounded skeleton-shimmer mb-4" />
          <div className="h-8 w-32 rounded skeleton-shimmer mb-2" />
          <div className="h-3 w-16 rounded skeleton-shimmer" />
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

function TableSkeleton() {
  return (
    <div className="rounded-2xl p-6" style={GLASS_CARD}>
      <div className="h-4 w-48 rounded skeleton-shimmer mb-6" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <div className="h-4 w-8 rounded skeleton-shimmer" />
          <div className="h-4 flex-1 rounded skeleton-shimmer" />
          <div className="h-4 w-20 rounded skeleton-shimmer" />
          <div className="h-4 w-24 rounded skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Donut chart custom label
// ============================================================

interface DonutLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
}

function renderDonutLabel(props: DonutLabelProps) {
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
    <text
      x={x} y={y}
      fill="var(--color-text-secondary)"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={500}
    >
      {displayName} ({(percent * 100).toFixed(1)}%)
    </text>
  );
}

// ============================================================
// Custom Recharts Tooltip for Area chart
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
      <p style={{ color: 'var(--color-tooltip-label)', fontSize: 12, marginBottom: 8, fontWeight: 600, letterSpacing: '0.01em' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #a78bfa)', boxShadow: '0 0 6px rgba(99, 102, 241, 0.5)', flexShrink: 0 }} />
        <p style={{ color: 'var(--color-tooltip-value)', fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
          {fmtCurrency(payload[0].value)}
        </p>
      </div>
    </div>
  );
}

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
// Trend mode type
// ============================================================

type TrendMode = 'daily' | 'weekly' | 'monthly';

// ============================================================
// Main Dashboard Component
// ============================================================

export default function DashboardPage() {
  const { formatCurrency, t } = useApp();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A1: Date range
  const defaultRange = useMemo(() => getThisMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  // A9: Trend mode
  const [trendMode, setTrendMode] = useState<TrendMode>('monthly');

  // A10: Sales goal (localStorage)
  const [salesGoal, setSalesGoal] = useState(0);
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_sales_goal');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage on mount is intentional
    if (saved) setSalesGoal(parseInt(saved, 10));
  }, []);
  const handleGoalChange = (v: number) => {
    setSalesGoal(v);
    localStorage.setItem('dashboard_sales_goal', String(v));
  };

  // Core data
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendRow[]>([]);
  const [platformSummary, setPlatformSummary] = useState<PlatformSummaryRow[]>([]);
  const [topTitles, setTopTitles] = useState<TopTitleRow[]>([]);
  const [growthAlerts, setGrowthAlerts] = useState<GrowthAlertRow[]>([]);

  // A2: YoY data
  const [yoyKpis, setYoyKpis] = useState<{ total_sales: number } | null>(null);

  // A3: Genre
  const [genreSummary, setGenreSummary] = useState<Array<{ genre_code: string; genre_kr: string; total_sales: number; title_count: number }>>([]);

  // A4: Company
  const [companySummary, setCompanySummary] = useState<Array<{ company_name: string; total_sales: number; title_count: number }>>([]);

  // A5: Format
  const [formatSummary, setFormatSummary] = useState<Array<{ content_format: string; total_sales: number; title_count: number }>>([]);

  // A9: Daily/Weekly trend data
  const [dailyTrend, setDailyTrend] = useState<Array<{ day: string; total_sales: number }>>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<Array<{ week: string; total_sales: number }>>([]);

  // A8: Data freshness
  const [lastDataDate, setLastDataDate] = useState<string>('');
  const [hasPreliminary, setHasPreliminary] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sd = startDate || undefined;
      const ed = endDate || undefined;

      // Core data + new analysis data in parallel
      const [
        kpiResult, trendResult, platformResult, titleResult, alertResult,
        genreResult, companyResult, formatResult,
        dailyResult, weeklyResult,
      ] = await Promise.allSettled([
        fetchDashboardKPIs(),
        fetchMonthlyTrend(),
        fetchPlatformSummary(),
        fetchTopTitles(20),
        fetchGrowthAlerts(),
        fetchGenreSummary(sd, ed).catch(() => []),
        fetchCompanySummary(sd, ed).catch(() => []),
        fetchFormatSummary(sd, ed).catch(() => []),
        fetchDailyTrend(sd, ed).catch(() => []),
        fetchWeeklyTrend(sd, ed).catch(() => []),
      ]);

      if (kpiResult.status === 'fulfilled') setKpis(kpiResult.value);
      if (trendResult.status === 'fulfilled') {
        const trend = trendResult.value ?? [];
        setMonthlyTrend(trend);
        // A8: derive last data date from monthly trend
        if (trend.length > 0) {
          setLastDataDate(trend[trend.length - 1].month);
        }
      }
      if (platformResult.status === 'fulfilled') setPlatformSummary(platformResult.value ?? []);
      if (titleResult.status === 'fulfilled') setTopTitles(titleResult.value ?? []);
      if (alertResult.status === 'fulfilled') setGrowthAlerts(alertResult.value ?? []);
      if (genreResult.status === 'fulfilled') setGenreSummary(genreResult.value ?? []);
      if (companyResult.status === 'fulfilled') setCompanySummary(companyResult.value ?? []);
      if (formatResult.status === 'fulfilled') setFormatSummary(formatResult.value ?? []);
      if (dailyResult.status === 'fulfilled') setDailyTrend(dailyResult.value ?? []);
      if (weeklyResult.status === 'fulfilled') setWeeklyTrend(weeklyResult.value ?? []);

      // A2: YoY comparison
      if (startDate && endDate) {
        const yoy = getYoYRange(startDate, endDate);
        fetchPeriodKpis(yoy.start, yoy.end)
          .then((r) => setYoyKpis(r))
          .catch(() => setYoyKpis(null));
      }

      // A8: Check preliminary data
      try {
        const res = await fetch('/api/sales/paginated?page=1&pageSize=1&sortBy=sale_date&sortDir=desc');
        if (res.ok) {
          const data = await res.json();
          if (data.rows?.[0]) {
            setLastDataDate(data.rows[0].sale_date);
            setHasPreliminary(data.rows[0].is_preliminary === true);
          }
        }
      } catch { /* non-critical */ }

      setLoading(false);
    } catch (err: unknown) {
      console.error('Dashboard data load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount
    void loadData();
  }, [loadData]);

  // ---- Chart data preparation ----

  const trendChartData = useMemo(() => {
    if (trendMode === 'daily') {
      return dailyTrend.map((r) => ({
        label: r.day.length >= 10 ? r.day.slice(5) : r.day,
        sales: r.total_sales,
      }));
    }
    if (trendMode === 'weekly') {
      return weeklyTrend.map((r) => ({
        label: r.week,
        sales: r.total_sales,
      }));
    }
    return monthlyTrend.map((r) => ({
      label: r.month.length >= 7 ? r.month.slice(2) : r.month,
      sales: r.total_sales,
    }));
  }, [trendMode, dailyTrend, weeklyTrend, monthlyTrend]);

  const pieData = platformSummary.map((r) => ({
    name: r.channel,
    value: r.total_sales,
    color: getPlatformColor(r.channel),
  }));

  const platformBarData = platformSummary.slice(0, 8).map((r) => ({
    name: r.channel,
    sales: r.total_sales,
    color: getPlatformColor(r.channel),
  }));

  // A2: YoY calculation
  const yoyChange = useMemo(() => {
    if (!kpis || !yoyKpis || yoyKpis.total_sales === 0) return null;
    return ((kpis.this_month_sales - yoyKpis.total_sales) / yoyKpis.total_sales) * 100;
  }, [kpis, yoyKpis]);

  const trendLabels: Record<TrendMode, string> = {
    daily: t('일별', '日別'),
    weekly: t('주별', '週別'),
    monthly: t('월별', '月別'),
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p style={{ color: '#ef4444', fontSize: 14 }}>Error: {error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}
        >
          {t('재시도', 'リトライ')}
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* ---- Header with Data Freshness (A8) ---- */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow">
          <LayoutDashboard size={22} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('대시보드', 'ダッシュボード')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('매출 개요 및 주요 지표', '売上概要と主要指標')}
          </p>
        </div>
        {/* A8: Data freshness */}
        {lastDataDate && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-text-secondary)',
            }}>
              <Clock size={12} />
              {t('최종 데이터:', '最終データ:')} {lastDataDate}
            </div>
            {hasPreliminary && (
              <span className="px-2 py-1 rounded-lg text-[11px] font-medium" style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}>
                {t('속보치 포함', '速報値含む')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ---- A1: Date Range Picker ---- */}
      <div className="mb-6">
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChangeStart={setStartDate}
          onChangeEnd={setEndDate}
        />
      </div>

      {loading ? (
        <div className="space-y-6">
          <KPISkeleton />
          <ChartSkeleton height={400} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton height={350} />
            <ChartSkeleton height={350} />
          </div>
          <TableSkeleton />
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

          {/* ---- KPI Summary Cards (A2: YoY added) ---- */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* Total Sales */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.25 } }}
              className="rounded-2xl p-6 cursor-default group kpi-accent-blue relative overflow-hidden"
              style={GLASS_CARD}
              onMouseEnter={(e) => { Object.assign(e.currentTarget.style, GLASS_CARD_HOVER); }}
              onMouseLeave={(e) => { Object.assign(e.currentTarget.style, { background: GLASS_CARD.background, border: GLASS_CARD.border }); }}
            >
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {t('총 누적매출', '累計売上')}
              </p>
              <p className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                <AnimatedNumber value={kpis.total_sales} formatter={formatCurrency} />
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {t('전체 기간', '全期間')}
              </p>
            </motion.div>

            {/* This Month Sales + MoM + YoY */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.25 } }}
              className="rounded-2xl p-6 cursor-default group kpi-accent-purple relative overflow-hidden"
              style={GLASS_CARD}
              onMouseEnter={(e) => { Object.assign(e.currentTarget.style, GLASS_CARD_HOVER); }}
              onMouseLeave={(e) => { Object.assign(e.currentTarget.style, { background: GLASS_CARD.background, border: GLASS_CARD.border }); }}
            >
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {t('이번달 매출', '今月の売上')}
              </p>
              <p className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                <AnimatedNumber value={kpis.this_month_sales} formatter={formatCurrency} />
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  {kpis.mom_change >= 0 ? (
                    <TrendingUp size={12} color="#22c55e" />
                  ) : (
                    <TrendingDown size={12} color="#ef4444" />
                  )}
                  <span className="text-[11px] font-semibold" style={{ color: kpis.mom_change >= 0 ? '#22c55e' : '#ef4444' }}>
                    {kpis.mom_change > 0 ? '+' : ''}{kpis.mom_change.toFixed(1)}% MoM
                  </span>
                </div>
                {/* A2: YoY */}
                {yoyChange !== null && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>|</span>
                    <span className="text-[11px] font-semibold" style={{ color: yoyChange >= 0 ? '#22c55e' : '#ef4444' }}>
                      {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}% YoY
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* MoM Growth Rate */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.25 } }}
              className="rounded-2xl p-6 cursor-default group kpi-accent-green relative overflow-hidden"
              style={GLASS_CARD}
              onMouseEnter={(e) => { Object.assign(e.currentTarget.style, GLASS_CARD_HOVER); }}
              onMouseLeave={(e) => { Object.assign(e.currentTarget.style, { background: GLASS_CARD.background, border: GLASS_CARD.border }); }}
            >
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {t('전월대비 증감률', '前月比増減率')}
              </p>
              <p className="text-2xl font-bold mb-1" style={{ color: kpis.mom_change >= 0 ? '#22c55e' : '#ef4444' }}>
                {kpis.mom_change > 0 ? '+' : ''}{kpis.mom_change.toFixed(1)}%
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {t('전월', '前月')}: {formatCurrency(kpis.last_month_sales)}
              </p>
            </motion.div>

            {/* Active Titles */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.25 } }}
              className="rounded-2xl p-6 cursor-default group kpi-accent-amber relative overflow-hidden"
              style={GLASS_CARD}
              onMouseEnter={(e) => { Object.assign(e.currentTarget.style, GLASS_CARD_HOVER); }}
              onMouseLeave={(e) => { Object.assign(e.currentTarget.style, { background: GLASS_CARD.background, border: GLASS_CARD.border }); }}
            >
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                {t('활성 작품 수', '活性タイトル数')}
              </p>
              <p className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                <AnimatedCount value={kpis.active_titles} />
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {kpis.active_platforms} {t('개 플랫폼', 'プラットフォーム')}
              </p>
            </motion.div>
          </motion.div>

          {/* ---- A10: Sales Goal ---- */}
          <SalesGoal
            currentSales={kpis.this_month_sales}
            goal={salesGoal}
            onGoalChange={handleGoalChange}
          />

          {/* ---- Sales Trend (A9: daily/weekly/monthly toggle) ---- */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="show"
            className="rounded-2xl p-6"
            style={GLASS_CARD}
          >
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                <Calendar size={16} className="inline mr-2" style={{ verticalAlign: '-2px' }} />
                {trendLabels[trendMode]} {t('매출 추이', '売上推移')}
              </h2>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-glass-border)' }}>
                {(['daily', 'weekly', 'monthly'] as TrendMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTrendMode(mode)}
                    className="px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      background: trendMode === mode ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
                      color: trendMode === mode ? '#fff' : 'var(--color-text-secondary)',
                    }}
                  >
                    {trendLabels[mode]}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={trendChartData}>
                <defs>
                  <linearGradient id="dashAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatShort}
                  width={60}
                />
                <ReTooltip content={<AreaChartTooltip fmtCurrency={formatCurrency} />} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  fill="url(#dashAreaGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* ---- Platform Share + Ranking (A7: drilldown) ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="show"
              className="rounded-2xl p-6"
              style={GLASS_CARD}
            >
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {t('플랫폼 점유율', 'プラットフォーム占有率')}
              </h2>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={110}
                    paddingAngle={2}
                    label={renderDonutLabel}
                    labelLine={false}
                    onClick={(_, idx) => router.push(`/platforms?channel=${encodeURIComponent(pieData[idx].name)}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Pie>
                  <ReTooltip
                    {...darkTooltipStyle}
                    formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('매출', '売上')]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="show"
              className="rounded-2xl p-6"
              style={GLASS_CARD}
            >
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {t('플랫폼 랭킹', 'プラットフォームランキング')}
              </h2>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={platformBarData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatShort}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                    tickFormatter={(v: string) => PLATFORM_BRANDS[v]?.nameJP || v}
                  />
                  <ReTooltip
                    {...darkTooltipStyle}
                    formatter={(v: unknown) => [formatCurrency(Number(v ?? 0)), t('매출', '売上')]}
                  />
                  <Bar
                    dataKey="sales"
                    radius={[0, 6, 6, 0]}
                    barSize={22}
                    onClick={(data) => router.push(`/platforms?channel=${encodeURIComponent(String(data.name ?? ''))}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {platformBarData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* ---- A3: Genre Chart + A4: Company Ranking ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GenreChart data={genreSummary} />
            <CompanyRanking data={companySummary} />
          </div>

          {/* ---- A5: Format Chart ---- */}
          <FormatChart data={formatSummary} />

          {/* ---- A6: Growth Alerts ---- */}
          <GrowthAlertsPanel data={growthAlerts} />

          {/* ---- Top Titles Table (A7: drilldown) ---- */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="show"
            className="rounded-2xl p-6"
            style={GLASS_CARD}
          >
            <h2 className="text-base font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
              Top {Math.min(topTitles.length, 10)} {t('작품', 'タイトル')}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px] table-striped">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-table-border)' }}>
                    <th className="text-left py-3 px-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>#</th>
                    <th className="text-left py-3 px-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('작품', 'タイトル')}
                    </th>
                    <th className="text-left py-3 px-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('플랫폼', 'PF')}
                    </th>
                    <th className="text-right py-3 px-2 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {t('총 매출', '累計売上')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topTitles.slice(0, 10).map((title, idx) => (
                    <tr
                      key={title.title_jp}
                      style={{ borderBottom: '1px solid var(--color-table-border-subtle)' }}
                      className="cursor-pointer transition-colors hover:brightness-110"
                      onClick={() => router.push(`/titles?search=${encodeURIComponent(title.title_jp)}`)}
                    >
                      <td className="py-3 px-2 font-bold" style={{ color: idx < 3 ? '#a5b4fc' : 'var(--color-text-muted)' }}>
                        {idx + 1}
                      </td>
                      <td className="py-3 px-2" style={{ maxWidth: '250px' }}>
                        <p className="font-medium truncate" title={title.title_jp} style={{ color: 'var(--color-text-primary)' }}>
                          {title.title_jp}
                        </p>
                        {title.title_kr && (
                          <p className="text-xs truncate" title={title.title_kr} style={{ color: 'var(--color-text-muted)' }}>
                            {title.title_kr}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1 flex-wrap">
                          {(title.channels ?? []).slice(0, 3).map((ch) => (
                            <PlatformBadge key={ch} name={ch} showName={false} size="sm" />
                          ))}
                          {(title.channels ?? []).length > 3 && (
                            <span className="text-[10px] px-1" style={{ color: 'var(--color-text-muted)' }}>
                              +{title.channels.length - 3}
                            </span>
                          )}
                        </div>
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
        </div>
      )}
    </motion.div>
  );
}
