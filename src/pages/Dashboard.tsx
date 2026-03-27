import { useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import {
  LayoutDashboard, TrendingUp, TrendingDown, BookOpen, AlertTriangle,
} from 'lucide-react';
import {
  fetchDashboardKPIs, fetchMonthlyTrend, fetchPlatformSummary,
  fetchTopTitles, fetchGrowthAlerts,
} from '@/lib/supabase';
import { getPlatformColor, PLATFORM_BRANDS } from '@/utils/platformConfig';
import { PlatformBadge } from '@/components/PlatformBadge';
import { useApp } from '@/context/AppContext';

// ============================================================
// Types for RPC responses
// ============================================================

interface KPIData {
  total_sales: number;
  this_month_sales: number;
  last_month_sales: number;
  mom_change: number;
  active_titles: number;
  active_platforms: number;
}

interface MonthlyTrendRow {
  month: string;
  total_sales: number;
}

interface PlatformSummaryRow {
  channel: string;
  total_sales: number;
  title_count: number;
  avg_daily: number;
}

interface TopTitleRow {
  title_jp: string;
  title_kr: string | null;
  channels: string[];
  total_sales: number;
  day_count: number;
}

interface GrowthAlertRow {
  title_jp: string;
  title_kr: string | null;
  this_month: number;
  last_month: number;
  growth_pct: number;
}

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
// Shared styles & animation variants
// ============================================================

const GLASS_CARD = {
  background: 'var(--color-glass)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--color-glass-border)',
  borderRadius: '16px',
} as const;

const GLASS_CARD_HOVER = {
  background: 'var(--color-glass-hover)',
  border: '1px solid var(--color-glass-hover-border)',
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

// ============================================================
// Dark theme Recharts tooltip
// ============================================================

const darkTooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--color-tooltip-bg)',
    border: '1px solid var(--color-tooltip-border)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    padding: '12px 16px',
  },
  labelStyle: {
    color: 'var(--color-tooltip-label)',
    fontWeight: 600,
    fontSize: '12px',
    marginBottom: '4px',
  },
  itemStyle: {
    color: 'var(--color-tooltip-value)',
    fontWeight: 700,
    fontSize: '13px',
  },
};

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
          <div key={i} className="flex-1 rounded-t skeleton-shimmer" style={{ height: `${30 + Math.random() * 60}%` }} />
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderDonutLabel(props: any) {
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
      padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(8px)',
    }}>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 11, marginBottom: 6, fontWeight: 500 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #a78bfa)', boxShadow: '0 0 6px rgba(99, 102, 241, 0.5)' }} />
        <p style={{ color: 'var(--color-text-primary)', fontSize: 15, fontWeight: 700, margin: 0 }}>
          {fmtCurrency(payload[0].value)}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Main Dashboard Component
// ============================================================

export function Dashboard() {
  const { formatCurrency, t } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // RPC data
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendRow[]>([]);
  const [platformSummary, setPlatformSummary] = useState<PlatformSummaryRow[]>([]);
  const [topTitles, setTopTitles] = useState<TopTitleRow[]>([]);
  const [growthAlerts, setGrowthAlerts] = useState<GrowthAlertRow[]>([]);

  const formatShort = (value: number): string => {
    if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}`;
    if (value >= 10_000) return `${(value / 10_000).toFixed(0)}`;
    return value.toLocaleString();
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Sequential calls to avoid Supabase free-tier concurrent connection limits
      const kpiData = await fetchDashboardKPIs();
      setKpis(kpiData as KPIData);
      setLoading(false); // Show KPIs immediately

      const trendData = await fetchMonthlyTrend();
      setMonthlyTrend((trendData as MonthlyTrendRow[]) ?? []);

      const platformData = await fetchPlatformSummary();
      setPlatformSummary((platformData as PlatformSummaryRow[]) ?? []);

      const titleData = await fetchTopTitles(20);
      setTopTitles((titleData as TopTitleRow[]) ?? []);

      // Growth alerts - non-critical, load last
      const alertData = await fetchGrowthAlerts();
      setGrowthAlerts(((alertData as Array<Record<string, unknown>>) ?? []).map((r) => ({
        title_jp: String(r.out_title_jp ?? r.title_jp ?? ''),
        title_kr: r.out_title_kr != null ? String(r.out_title_kr) : r.title_kr != null ? String(r.title_kr) : null,
        this_month: Number(r.out_this_month ?? r.this_month ?? 0),
        last_month: Number(r.out_last_month ?? r.last_month ?? 0),
        growth_pct: Number(r.out_growth_pct ?? r.growth_pct ?? 0),
      })));
    } catch (err: unknown) {
      console.error('Dashboard data load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Prepare chart data
  const trendChartData = monthlyTrend.map((r) => ({
    label: r.month.length >= 7 ? r.month.slice(2) : r.month, // e.g. "24-01"
    sales: r.total_sales,
  }));

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

  // Declining titles (growth_pct < -30)
  const decliningTitles = growthAlerts.filter((a) => a.growth_pct < -30);

  // ============================================================
  // Render
  // ============================================================

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ---- Header ---- */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow">
          <LayoutDashboard size={22} color="white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {t('대시보드', 'ダッシュボード')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {t('매출 개요 및 주요 지표', '売上概要と主要指標')}
          </p>
        </div>
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

          {/* ============================================================ */}
          {/* SECTION 1: KPI Summary Cards                                  */}
          {/* ============================================================ */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* Total Cumulative Sales */}
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

            {/* This Month Sales */}
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
              <div className="flex items-center gap-1">
                {kpis.mom_change >= 0 ? (
                  <TrendingUp size={14} color="#22c55e" />
                ) : (
                  <TrendingDown size={14} color="#ef4444" />
                )}
                <span className="text-xs font-semibold" style={{ color: kpis.mom_change >= 0 ? '#22c55e' : '#ef4444' }}>
                  {kpis.mom_change > 0 ? '+' : ''}{kpis.mom_change.toFixed(1)}% {t('전월대비', '前月比')}
                </span>
              </div>
            </motion.div>

            {/* MoM Change Rate */}
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

          {/* ============================================================ */}
          {/* SECTION 2: Monthly Sales Trend (AreaChart)                     */}
          {/* ============================================================ */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="show"
            className="rounded-2xl p-6"
            style={GLASS_CARD}
          >
            <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
              {t('월별 매출 추이', '月別売上推移')}
            </h2>
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

          {/* ============================================================ */}
          {/* SECTION 3: Platform Share (Pie) + Platform Ranking (Bar)       */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform Pie Chart */}
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

            {/* Platform Ranking Bar Chart */}
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
                  <Bar dataKey="sales" radius={[0, 6, 6, 0]} barSize={22}>
                    {platformBarData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 4: Issue Briefing (Growth Alerts)                      */}
          {/* ============================================================ */}
          {decliningTitles.length > 0 && (
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="show"
              className="rounded-2xl p-6"
              style={GLASS_CARD}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} color="#f59e0b" />
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {t('주요 이슈 브리핑', '主要イシューブリーフィング')}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  {decliningTitles.length}{t('건', '件')}
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                {t('전월 대비 30% 이상 감소한 작품', '前月比30%以上減少した作品')}
              </p>
              <div className="space-y-2">
                {decliningTitles.slice(0, 10).map((alert) => (
                  <div
                    key={alert.title_jp}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}
                  >
                    <TrendingDown size={16} color="#ef4444" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {alert.title_jp}
                      </p>
                      {alert.title_kr && (
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{alert.title_kr}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: '#ef4444' }}>
                        {alert.growth_pct.toFixed(1)}%
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {formatCurrency(alert.last_month)} → {formatCurrency(alert.this_month)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* SECTION 5: Top Titles Table                                    */}
          {/* ============================================================ */}
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
                    <tr key={title.title_jp} style={{ borderBottom: '1px solid var(--color-table-border-subtle)' }}>
                      <td className="py-3 px-2 font-bold" style={{ color: idx < 3 ? '#a5b4fc' : 'var(--color-text-muted)' }}>
                        {idx + 1}
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-medium truncate max-w-[250px]" style={{ color: 'var(--color-text-primary)' }}>
                          {title.title_jp}
                        </p>
                        {title.title_kr && (
                          <p className="text-xs truncate max-w-[250px]" style={{ color: 'var(--color-text-muted)' }}>
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
