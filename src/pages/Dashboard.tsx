import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import {
  LayoutDashboard, TrendingUp, TrendingDown, BookOpen, Monitor,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Platform, TimeGranularity } from '@/types';
import { getPlatformColor, PLATFORM_BRANDS } from '@/utils/platformConfig';
import {
  startOfWeek, format, parseISO, subDays,
} from 'date-fns';

// ============================================================
// Types
// ============================================================

interface SalesRow {
  sale_date: string;
  sales_amount: number;
  channel: string;
  title_jp: string;
  title_kr: string | null;
}

/* TitleSalesRow intentionally removed — data is fetched from SalesRow */

interface KPIs {
  totalSales: number;
  thisMonthSales: number;
  lastMonthSales: number;
  momChange: number;
  activeTitles: number;
  activePlatforms: number;
}

interface TimeSeriesPoint {
  period: string;
  label: string;
  sales: number;
}

interface PlatformShare {
  name: string;
  value: number;
  color: string;
}

interface TitleRank {
  rank: number;
  titleJP: string;
  titleKR: string | null;
  platforms: string[];
  totalSales: number;
  dailyAvg: number;
}

// ============================================================
// Number formatting helpers
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

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// ============================================================
// AnimatedNumber component
// ============================================================

function AnimatedNumber({ value, prefix = '¥', useManUnit = false }: {
  value: number;
  prefix?: string;
  useManUnit?: boolean;
}) {
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 50, damping: 20, duration: 1500 });
  const display = useTransform(springVal, (v: number) => {
    if (useManUnit) {
      if (v >= 100_000_000) return `${prefix}${(v / 100_000_000).toFixed(2)}億`;
      if (v >= 10_000) return `${prefix}${(v / 10_000).toFixed(1)}万`;
    }
    return `${prefix}${Math.round(v).toLocaleString()}`;
  });

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
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '16px',
} as const;

const GLASS_CARD_HOVER = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.10)',
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

const chartVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

// ============================================================
// Dark theme Recharts tooltip
// ============================================================

const darkTooltipStyle = {
  contentStyle: {
    backgroundColor: 'rgba(15, 15, 25, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    padding: '12px 16px',
  },
  labelStyle: {
    color: '#a0a0b8',
    fontWeight: 600,
    fontSize: '12px',
    marginBottom: '4px',
  },
  itemStyle: {
    color: '#e0e0f0',
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
        <div
          key={i}
          className="rounded-2xl p-6"
          style={{ ...GLASS_CARD, minHeight: '140px' }}
        >
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
    <div
      className="rounded-2xl p-6"
      style={{ ...GLASS_CARD, minHeight: height }}
    >
      <div className="h-4 w-40 rounded skeleton-shimmer mb-6" />
      <div className="flex items-end gap-1" style={{ height: height - 100 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t skeleton-shimmer"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
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
// Data aggregation helpers
// ============================================================

function aggregateByGranularity(
  salesRows: SalesRow[],
  granularity: TimeGranularity,
): TimeSeriesPoint[] {
  const map = new Map<string, number>();

  for (const row of salesRows) {
    let key: string;
    const d = parseISO(row.sale_date);

    switch (granularity) {
      case 'daily':
        key = row.sale_date;
        break;
      case 'weekly': {
        const weekStart = startOfWeek(d, { weekStartsOn: 1 });
        key = format(weekStart, 'yyyy-MM-dd');
        break;
      }
      case 'monthly':
        key = format(d, 'yyyy-MM');
        break;
    }

    map.set(key, (map.get(key) ?? 0) + row.sales_amount);
  }

  const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));

  return sorted.map(([period, sales]) => {
    let label: string;
    switch (granularity) {
      case 'daily':
        label = format(parseISO(period), 'M/d');
        break;
      case 'weekly':
        label = format(parseISO(period), 'M/d') + '~';
        break;
      case 'monthly':
        label = period.slice(0, 7);
        break;
    }
    return { period, label, sales };
  });
}

function computePlatformShares(salesRows: SalesRow[]): PlatformShare[] {
  const map = new Map<string, number>();
  for (const row of salesRows) {
    map.set(row.channel, (map.get(row.channel) ?? 0) + row.sales_amount);
  }

  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({
      name,
      value,
      color: getPlatformColor(name),
    }));
}

function computeTopTitles(salesRows: SalesRow[], limit = 10): TitleRank[] {
  const titleMap = new Map<string, {
    titleJP: string;
    titleKR: string | null;
    platforms: Set<string>;
    totalSales: number;
    daysActive: Set<string>;
  }>();

  for (const row of salesRows) {
    const key = row.title_jp;
    const existing = titleMap.get(key);
    if (existing) {
      existing.totalSales += row.sales_amount;
      existing.platforms.add(row.channel);
      existing.daysActive.add(row.sale_date);
      if (row.title_kr && !existing.titleKR) existing.titleKR = row.title_kr;
    } else {
      titleMap.set(key, {
        titleJP: row.title_jp,
        titleKR: row.title_kr,
        platforms: new Set([row.channel]),
        totalSales: row.sales_amount,
        daysActive: new Set([row.sale_date]),
      });
    }
  }

  return Array.from(titleMap.values())
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, limit)
    .map((t, i) => ({
      rank: i + 1,
      titleJP: t.titleJP,
      titleKR: t.titleKR,
      platforms: Array.from(t.platforms),
      totalSales: t.totalSales,
      dailyAvg: t.daysActive.size > 0 ? t.totalSales / t.daysActive.size : 0,
    }));
}

function computeKPIs(salesRows: SalesRow[], platforms: Platform[]): KPIs {
  const totalSales = salesRows.reduce((sum, r) => sum + r.sales_amount, 0);

  const now = new Date();
  const thisMonth = format(now, 'yyyy-MM');
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = format(lastMonthDate, 'yyyy-MM');

  let thisMonthSales = 0;
  let lastMonthSales = 0;
  const uniqueTitles = new Set<string>();
  const uniquePlatforms = new Set<string>();

  for (const row of salesRows) {
    const m = row.sale_date.slice(0, 7);
    if (m === thisMonth) thisMonthSales += row.sales_amount;
    if (m === lastMonth) lastMonthSales += row.sales_amount;
    uniqueTitles.add(row.title_jp);
    uniquePlatforms.add(row.channel);
  }

  const momChange = lastMonthSales > 0
    ? ((thisMonthSales - lastMonthSales) / lastMonthSales) * 100
    : 0;

  return {
    totalSales,
    thisMonthSales,
    lastMonthSales,
    momChange,
    activeTitles: uniqueTitles.size,
    activePlatforms: platforms.length > 0 ? platforms.length : uniquePlatforms.size,
  };
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
      x={x}
      y={y}
      fill="#a0a0b8"
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

function AreaChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: 'rgba(10, 10, 20, 0.96)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(99, 102, 241, 0.1)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <p style={{ color: '#8888a0', fontSize: 11, marginBottom: 6, fontWeight: 500 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #a78bfa)',
          boxShadow: '0 0 6px rgba(99, 102, 241, 0.5)',
        }} />
        <p style={{ color: '#f0f0f5', fontSize: 15, fontWeight: 700, margin: 0 }}>
          {formatYen(payload[0].value)}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// PlatformBadge component
// ============================================================

function PlatformBadge({ name }: { name: string }) {
  const color = getPlatformColor(name);
  const displayName = PLATFORM_BRANDS[name]?.nameJP || name;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-1 mb-1"
      style={{
        color,
        background: `${color}15`,
        border: `1px solid ${color}30`,
      }}
    >
      {displayName.length > 6 ? (PLATFORM_BRANDS[name]?.icon || displayName.slice(0, 3)) : displayName}
    </span>
  );
}

// ============================================================
// Granularity Toggle
// ============================================================

const GRANULARITY_OPTIONS: { key: TimeGranularity; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

function GranularityToggle({
  value,
  onChange,
}: {
  value: TimeGranularity;
  onChange: (g: TimeGranularity) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl p-1"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {GRANULARITY_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
          style={{
            color: value === opt.key ? '#fff' : '#55556a',
            background: value === opt.key
              ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
              : 'transparent',
            boxShadow: value === opt.key
              ? '0 2px 8px rgba(99, 102, 241, 0.3)'
              : 'none',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Main Dashboard Component
// ============================================================

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [salesRows, setSalesRows] = useState<SalesRow[]>([]);
  const [cumulativeTotal, setCumulativeTotal] = useState(0);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [granularity, setGranularity] = useState<TimeGranularity>('monthly');
  const [error, setError] = useState<string | null>(null);

  // Fetch data: recent 90 days for charts/KPIs, paginated totals for cumulative
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ninetyDaysAgo = format(subDays(new Date(), 90), 'yyyy-MM-dd');

      // Parallel: recent 90-day data (for charts/KPIs) + platform list
      const [recentRes, platformRes] = await Promise.all([
        supabase
          .from('daily_sales_v2')
          .select('sale_date, sales_amount, channel, title_jp, title_kr')
          .gte('sale_date', ninetyDaysAgo)
          .order('sale_date', { ascending: true })
          .limit(15000),
        supabase
          .from('platforms')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
      ]);

      if (recentRes.error) throw recentRes.error;
      if (platformRes.error) throw platformRes.error;

      let recentSales = (recentRes.data ?? []) as SalesRow[];

      // If we hit the limit, paginate for remaining recent data
      if (recentSales.length >= 15000) {
        let from = 15000;
        while (true) {
          const { data: batch } = await supabase
            .from('daily_sales_v2')
            .select('sale_date, sales_amount, channel, title_jp, title_kr')
            .gte('sale_date', ninetyDaysAgo)
            .order('sale_date', { ascending: true })
            .range(from, from + 5000 - 1);
          if (!batch || batch.length === 0) break;
          recentSales = recentSales.concat(batch as SalesRow[]);
          if (batch.length < 5000) break;
          from += 5000;
        }
      }

      setSalesRows(recentSales);
      setPlatforms((platformRes.data ?? []) as Platform[]);

      // Cumulative total: paginate but only fetch sales_amount column (tiny payload)
      // Do this after setting salesRows so the UI renders immediately with recent data
      setLoading(false);

      let cumTotal = 0;
      let from = 0;
      const batchSize = 5000;
      while (true) {
        const { data: batch } = await supabase
          .from('daily_sales_v2')
          .select('sales_amount')
          .range(from, from + batchSize - 1);
        if (!batch || batch.length === 0) break;
        for (const row of batch) cumTotal += row.sales_amount;
        if (batch.length < batchSize) break;
        from += batchSize;
      }
      setCumulativeTotal(cumTotal);
      return; // skip the finally setLoading(false) since we already did it
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

  // Memoized computed data
  const kpis = useMemo(() => {
    const base = computeKPIs(salesRows, platforms);
    // Use cumulative total from all-data query when available; fall back to recent-only sum
    return { ...base, totalSales: cumulativeTotal > 0 ? cumulativeTotal : base.totalSales };
  }, [salesRows, platforms, cumulativeTotal]);
  const timeSeries = useMemo(() => aggregateByGranularity(salesRows, granularity), [salesRows, granularity]);
  const platformShares = useMemo(() => computePlatformShares(salesRows), [salesRows]);
  const topTitles = useMemo(() => computeTopTitles(salesRows, 10), [salesRows]);
  // Platform total computed inline where needed

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
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: '#fff',
          }}
        >
          Retry
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
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center page-icon-glow"
        >
          <LayoutDashboard size={22} color="white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#f0f0f5' }}>
            Dashboard
          </h1>
          <p className="text-sm" style={{ color: '#55556a' }}>
            Sales overview and key metrics
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
      ) : salesRows.length === 0 ? (
        <div
          className="rounded-2xl p-12 flex flex-col items-center justify-center min-h-[300px]"
          style={GLASS_CARD}
        >
          <BookOpen size={48} style={{ color: '#55556a' }} className="mb-4" />
          <p style={{ color: '#55556a', fontSize: 15 }}>
            No sales data available yet. Upload data to get started.
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
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, GLASS_CARD_HOVER);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = GLASS_CARD.background;
                e.currentTarget.style.border = GLASS_CARD.border;
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none shimmer-bg" />
              <p className="text-xs font-medium tracking-wide mb-3" style={{ color: '#55556a' }}>
                TOTAL CUMULATIVE SALES
              </p>
              <p
                className="text-4xl font-extrabold mb-1"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                <AnimatedNumber value={kpis.totalSales} useManUnit />
              </p>
              <p className="text-xs" style={{ color: '#44445a' }}>
                All-time total
              </p>
            </motion.div>

            {/* This Month Sales */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.25 } }}
              className="rounded-2xl p-6 cursor-default group kpi-accent-green relative overflow-hidden"
              style={GLASS_CARD}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, GLASS_CARD_HOVER);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = GLASS_CARD.background;
                e.currentTarget.style.border = GLASS_CARD.border;
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none shimmer-bg" />
              <p className="text-xs font-medium tracking-wide mb-3" style={{ color: '#55556a' }}>
                THIS MONTH
              </p>
              <p className="text-4xl font-extrabold mb-2" style={{ color: '#f0f0f5' }}>
                <AnimatedNumber value={kpis.thisMonthSales} useManUnit />
              </p>
              <span className={kpis.momChange >= 0 ? 'pill-positive' : 'pill-negative'}>
                {kpis.momChange >= 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {formatPercent(kpis.momChange)} MoM
              </span>
            </motion.div>

            {/* Active Titles */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.25 } }}
              className="rounded-2xl p-6 cursor-default group kpi-accent-purple relative overflow-hidden"
              style={GLASS_CARD}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, GLASS_CARD_HOVER);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = GLASS_CARD.background;
                e.currentTarget.style.border = GLASS_CARD.border;
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none shimmer-bg" />
              <p className="text-xs font-medium tracking-wide mb-3" style={{ color: '#55556a' }}>
                ACTIVE TITLES
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-extrabold" style={{ color: '#f0f0f5' }}>
                  <AnimatedCount value={kpis.activeTitles} />
                </p>
                <BookOpen size={18} style={{ color: '#8b5cf6' }} />
              </div>
              <p className="text-xs mt-1" style={{ color: '#44445a' }}>
                Unique titles with sales
              </p>
            </motion.div>

            {/* Active Platforms */}
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.25 } }}
              className="rounded-2xl p-6 cursor-default group kpi-accent-amber relative overflow-hidden"
              style={GLASS_CARD}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, GLASS_CARD_HOVER);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = GLASS_CARD.background;
                e.currentTarget.style.border = GLASS_CARD.border;
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none shimmer-bg" />
              <p className="text-xs font-medium tracking-wide mb-3" style={{ color: '#55556a' }}>
                ACTIVE PLATFORMS
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-extrabold" style={{ color: '#f0f0f5' }}>
                  <AnimatedCount value={kpis.activePlatforms} />
                </p>
                <Monitor size={18} style={{ color: '#f59e0b' }} />
              </div>
              <p className="text-xs mt-1" style={{ color: '#44445a' }}>
                Distribution channels
              </p>
            </motion.div>
          </motion.div>

          {/* ============================================================ */}
          {/* SECTION 2: Sales Trend Chart                                  */}
          {/* ============================================================ */}
          <motion.div
            variants={chartVariants}
            initial="hidden"
            animate="visible"
            className="rounded-2xl p-6"
            style={GLASS_CARD}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg font-semibold pb-1" style={{ color: '#d0d0e0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                Sales Trend
              </h2>
              <GranularityToggle value={granularity} onChange={setGranularity} />
            </div>

            <ResponsiveContainer width="100%" height={360}>
              <AreaChart
                data={timeSeries}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                    <stop offset="30%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="70%" stopColor="#8b5cf6" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                  {/* Subtle grid pattern */}
                  <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#gridPattern)" />
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#55556a', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#55556a', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatYenShort}
                  width={56}
                />
                <ReTooltip content={<AreaChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="url(#strokeGradient)"
                  strokeWidth={2.5}
                  fill="url(#areaGradient)"
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* ============================================================ */}
          {/* SECTION 3: Platform Breakdown (2 columns)                     */}
          {/* ============================================================ */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            variants={chartVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Donut Chart */}
            <div className="rounded-2xl p-6" style={GLASS_CARD}>
              <h2 className="text-lg font-semibold mb-4 pb-1" style={{ color: '#d0d0e0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                Platform Share
              </h2>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={platformShares}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={1000}
                    animationBegin={200}
                    label={renderDonutLabel}
                    labelLine={false}
                  >
                    {platformShares.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  {/* Center text showing total */}
                  <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" fill="#55556a" fontSize={11} fontWeight={500}>
                    Total
                  </text>
                  <text x="50%" y="55%" textAnchor="middle" dominantBaseline="central" fill="#f0f0f5" fontSize={16} fontWeight={700}>
                    {formatYen(platformShares.reduce((s, p) => s + p.value, 0))}
                  </text>
                  <ReTooltip
                    {...darkTooltipStyle}
                    formatter={(value: unknown) => [formatYen(Number(value ?? 0)), 'Sales']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Horizontal Bar Chart */}
            <div className="rounded-2xl p-6" style={GLASS_CARD}>
              <h2 className="text-lg font-semibold mb-4 pb-1" style={{ color: '#d0d0e0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                Platform Ranking
              </h2>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={platformShares.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.04)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: '#55556a', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={formatYenShort}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fill: '#a0a0b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(name: string) =>
                      PLATFORM_BRANDS[name]?.nameJP || name
                    }
                  />
                  <ReTooltip
                    {...darkTooltipStyle}
                    formatter={(value: unknown) => [formatYen(Number(value ?? 0)), 'Sales']}
                    labelFormatter={(name: unknown) =>
                      PLATFORM_BRANDS[String(name)]?.nameJP || String(name)
                    }
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 6, 6, 0]}
                    animationDuration={1000}
                    animationBegin={300}
                  >
                    {platformShares.slice(0, 8).map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* ============================================================ */}
          {/* SECTION 4: Top Titles Table                                   */}
          {/* ============================================================ */}
          <motion.div
            variants={chartVariants}
            initial="hidden"
            animate="visible"
            className="rounded-2xl p-6 overflow-x-auto"
            style={GLASS_CARD}
          >
            <h2 className="text-lg font-semibold mb-4 pb-2" style={{ color: '#d0d0e0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              Top 10 Titles
            </h2>
            <table className="w-full text-sm" style={{ color: '#c0c0d0' }}>
              <thead>
                <tr
                  className="text-left text-xs font-semibold tracking-wider"
                  style={{
                    color: '#55556a',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <th className="py-3 pr-3 w-10">#</th>
                  <th className="py-3 pr-3">Title</th>
                  <th className="py-3 pr-3">Platforms</th>
                  <th className="py-3 pr-3 text-right">Total Sales</th>
                  <th className="py-3 text-right">Daily Avg</th>
                </tr>
              </thead>
              <tbody>
                {topTitles.map((title, idx) => (
                  <motion.tr
                    key={title.titleJP}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * idx, duration: 0.3 }}
                    className="transition-colors duration-150"
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)';
                    }}
                  >
                    <td className="py-3 pr-3">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold"
                        style={{
                          background:
                            idx < 3
                              ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                              : 'rgba(255,255,255,0.06)',
                          color: idx < 3 ? '#fff' : '#777',
                        }}
                      >
                        {title.rank}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <div>
                        <p
                          className="font-semibold text-sm leading-tight"
                          style={{ color: '#e0e0f0' }}
                        >
                          {title.titleJP}
                        </p>
                        {title.titleKR && (
                          <p className="text-xs mt-0.5" style={{ color: '#55556a' }}>
                            {title.titleKR}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap">
                        {title.platforms.map((p) => (
                          <PlatformBadge key={p} name={p} />
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-right font-semibold whitespace-nowrap">
                      {formatYen(title.totalSales)}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap" style={{ color: '#888' }}>
                      {formatYen(Math.round(title.dailyAvg))}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
