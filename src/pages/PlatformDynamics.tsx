import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useAppState } from '@/hooks/useAppState';
import { t } from '@/i18n';
import { formatSales } from '@/utils/formatters';
import { calcHHI, calcPlatformMoMChanges } from '@/utils/calculations';
import { getPlatformColor } from '@/utils/platformConfig';
import { PlatformIcon } from '@/components/PlatformIcon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartCard } from '@/components/ui/chart-card';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { tooltipStyle, staggerContainer, staggerItem } from '@/lib/constants';

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72" />
      {/* HHI gauge skeleton */}
      <Card variant="glass"><CardContent className="p-6 space-y-4">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </CardContent></Card>
      {/* Top 3 dependency cards */}
      <DashboardGrid cols={3}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} variant="glass"><CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-36" /><Skeleton className="h-3 w-full rounded" />
          </CardContent></Card>
        ))}
      </DashboardGrid>
      {/* MoM table skeleton */}
      <Card variant="glass"><CardContent className="p-6">
        <Skeleton className="h-5 w-48 mb-4" /><Skeleton className="h-64 w-full rounded-xl" />
      </CardContent></Card>
      {/* Chart skeleton */}
      <Card variant="glass"><CardContent className="p-6">
        <Skeleton className="h-5 w-56 mb-4" /><Skeleton className="h-80 w-full rounded-xl" />
      </CardContent></Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HHI Gauge Component                                                 */
/* ------------------------------------------------------------------ */

function HHIGauge({ value, language }: { value: number; language: 'ko' | 'ja' }) {
  // Clamp value between 0 and 10000
  const clamped = Math.min(10000, Math.max(0, value));
  // Map 0-10000 to 0-100%
  const percent = (clamped / 10000) * 100;

  // Determine zone
  const zone: 'low' | 'moderate' | 'high' =
    clamped < 1500 ? 'low' : clamped < 2500 ? 'moderate' : 'high';

  const zoneColor = zone === 'low' ? '#22c55e' : zone === 'moderate' ? '#eab308' : '#ef4444';
  const zoneBg = zone === 'low' ? '#dcfce7' : zone === 'moderate' ? '#fef9c3' : '#fee2e2';
  const zoneLabel = t(language, `dynamics.${zone}`);

  return (
    <div className="space-y-4">
      {/* Value & Badge */}
      <div className="flex items-center gap-3">
        <span className="text-4xl font-bold tracking-tight" style={{ color: zoneColor }}>
          {Math.round(clamped).toLocaleString()}
        </span>
        <span className="text-lg text-text-muted">/ 10,000</span>
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: zoneBg, color: zoneColor }}
        >
          {zoneLabel}
        </span>
      </div>

      {/* Gauge bar */}
      <div className="relative w-full h-5 rounded-full overflow-hidden bg-muted">
        {/* Zone background segments */}
        <div className="absolute inset-0 flex">
          <div className="h-full" style={{ width: '15%', backgroundColor: '#bbf7d0' }} />
          <div className="h-full" style={{ width: '10%', backgroundColor: '#fef08a' }} />
          <div className="h-full" style={{ width: '75%', backgroundColor: '#fecaca' }} />
        </div>
        {/* Needle / Fill */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ backgroundColor: zoneColor }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Zone labels */}
      <div className="flex justify-between text-xs text-text-muted px-0.5">
        <span>0</span>
        <span className="text-green-600">1,500</span>
        <span className="text-yellow-600">2,500</span>
        <span>10,000</span>
      </div>

      {/* Zone legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-text-secondary">
            {t(language, 'dynamics.low')} (&lt;1,500)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-text-secondary">
            {t(language, 'dynamics.moderate')} (1,500-2,500)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-text-secondary">
            {t(language, 'dynamics.high')} (&gt;2,500)
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PlatformDynamics page                                               */
/* ------------------------------------------------------------------ */

export function PlatformDynamics() {
  const { language, currency, exchangeRate } = useAppState();
  const data = useDataLoader();

  const platforms = data.platformSummary;

  // ---- HHI calculation ----
  const hhi = useMemo(() => {
    return calcHHI(platforms.map(p => ({ platform: p.platform, totalSales: p.totalSales })));
  }, [platforms]);

  // ---- Top 3 platforms by revenue share ----
  const top3 = useMemo(() => {
    const total = platforms.reduce((s, p) => s + p.totalSales, 0);
    const sorted = [...platforms].sort((a, b) => b.totalSales - a.totalSales);
    return sorted.slice(0, 3).map(p => ({
      platform: p.platform,
      totalSales: p.totalSales,
      share: total > 0 ? (p.totalSales / total) * 100 : 0,
    }));
  }, [platforms]);

  // ---- Platform MoM changes ----
  const momChanges = useMemo(() => {
    return calcPlatformMoMChanges(platforms);
  }, [platforms]);

  // ---- Monthly platform share trend (%) ----
  const monthlyShareData = useMemo(() => {
    if (data.monthlySummary.length === 0) return [];
    const sorted = [...data.monthlySummary].sort((a, b) => a.month.localeCompare(b.month));

    return sorted.map(ms => {
      const row: Record<string, string | number> = { month: ms.month };
      const total = ms.totalSales;
      // Compute each platform's share %
      for (const pName of Object.keys(ms.platforms)) {
        row[pName] = total > 0 ? Number(((ms.platforms[pName] / total) * 100).toFixed(1)) : 0;
      }
      return row;
    });
  }, [data.monthlySummary]);

  // ---- Unique platform names for chart areas ----
  const allPlatformNames = useMemo(() => {
    const nameSet = new Set<string>();
    data.monthlySummary.forEach(ms => {
      Object.keys(ms.platforms).forEach(n => nameSet.add(n));
    });
    return Array.from(nameSet);
  }, [data.monthlySummary]);

  // ---- Loading state ----
  if (data.loading) {
    return (
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-primary">
          {t(language, 'dynamics.title')}
        </h1>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
    >
      {/* Page Title */}
      <motion.h1
        variants={staggerItem}
        className="text-2xl md:text-3xl font-bold mb-6 text-primary tracking-tight"
      >
        {t(language, 'dynamics.title')}
      </motion.h1>

      {/* Section 1: HHI Gauge */}
      <motion.div variants={staggerItem} className="mb-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>{t(language, 'dynamics.hhi')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t(language, 'dynamics.hhiDesc')}
            </p>
          </CardHeader>
          <CardContent>
            <HHIGauge value={hhi} language={language} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 2: Top 3 Platform Dependency */}
      <motion.div variants={staggerItem} className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t(language, 'dynamics.topDependency')}
        </h2>
        <DashboardGrid cols={3}>
          {top3.map((p, idx) => {
            const color = getPlatformColor(p.platform);
            return (
              <Card key={p.platform} variant="glass">
                <CardContent className="p-6">
                  {/* Rank + Platform */}
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {idx + 1}
                    </span>
                    <PlatformIcon name={p.platform} size={28} showLabel />
                  </div>

                  {/* Sales */}
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {formatSales(p.totalSales, currency, exchangeRate, language)}
                  </div>

                  {/* Share with progress bar */}
                  <div className="flex items-center justify-between text-sm text-text-secondary mb-2">
                    <span>{t(language, 'dynamics.revenueShare')}</span>
                    <span className="font-semibold" style={{ color }}>{p.share.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(p.share, 100)}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: idx * 0.1 }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </DashboardGrid>
      </motion.div>

      {/* Section 3: Platform MoM Changes Table */}
      <motion.div variants={staggerItem} className="mb-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>{t(language, 'dynamics.momChanges')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted hover:bg-muted">
                  <TableHead className="font-semibold">
                    {t(language, 'table.platform')}
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    {t(language, 'dynamics.currentMonth')}
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    {t(language, 'dynamics.previousMonth')}
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    {t(language, 'dynamics.changePercent')}
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    {t(language, 'dynamics.direction')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {momChanges.map((row, idx) => {
                  const isUp = row.changePercent > 0;
                  const isDown = row.changePercent < 0;
                  const arrow = isUp ? '\u2191' : isDown ? '\u2193' : '\u2192';
                  const badgeVariant = isUp ? 'success' as const : isDown ? 'destructive' as const : 'secondary' as const;

                  return (
                    <TableRow
                      key={row.platform}
                      className={idx % 2 === 1 ? 'bg-background' : 'bg-card'}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PlatformIcon name={row.platform} size={22} />
                          <span className="font-semibold text-[15px] text-foreground">{row.platform}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold text-foreground">
                        {formatSales(row.currentSales, currency, exchangeRate, language)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-text-secondary">
                        {formatSales(row.previousSales, currency, exchangeRate, language)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={badgeVariant}>
                          {isUp ? '+' : ''}{row.changePercent.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-lg">
                        <span style={{ color: isUp ? '#22c55e' : isDown ? '#ef4444' : '#94a3b8' }}>
                          {arrow}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {momChanges.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-8 text-center text-[15px] text-text-muted">
                      {language === 'ko' ? '데이터가 없습니다.' : 'データがありません。'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 4: Monthly Platform Share Trend (Stacked Area %) */}
      <motion.div variants={staggerItem}>
        <ChartCard
          title={t(language, 'dynamics.monthlyShareTrend')}
          subtitle={t(language, 'dynamics.monthlyShareTrendDesc')}
          variant="glass"
        >
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={monthlyShareData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="month"
                stroke="#CBD5E1"
                tick={{ fill: '#64748B', fontSize: 12 }}
                tickFormatter={(val: string) => val.substring(2).replace('-', '/')}
              />
              <YAxis
                stroke="#CBD5E1"
                tick={{ fill: '#64748B', fontSize: 12 }}
                tickFormatter={(val: number) => `${val}%`}
                domain={[0, 100]}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={((value: number) => [
                  `${Number(value).toFixed(1)}%`,
                  '',
                ]) as never}
              />
              {allPlatformNames.map((pName) => (
                <Area
                  key={pName}
                  type="monotone"
                  dataKey={pName}
                  stackId="share"
                  stroke={getPlatformColor(pName)}
                  fill={getPlatformColor(pName)}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          {/* Platform legend */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2 px-2">
            {allPlatformNames.map((pName) => (
              <div key={pName} className="flex items-center gap-1.5">
                <PlatformIcon name={pName} size={16} />
                <span className="text-xs font-medium text-text-secondary">{pName}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </motion.div>
    </motion.div>
  );
}
