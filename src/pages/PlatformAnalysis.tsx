import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDataLoader } from '@/hooks/useDataLoader';
import { useAppState } from '@/hooks/useAppState';
import { t } from '@/i18n';
import { formatSales, formatSalesShort } from '@/utils/formatters';
import { KPICard } from '@/components/charts/KPICard';
import { Card, CardContent } from '@/components/ui/card';
import { ChartCard } from '@/components/ui/chart-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { PlatformIcon } from '@/components/PlatformIcon';
import { tooltipStyle, staggerContainer, staggerItem } from '@/lib/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';
import { getPlatformBrand, getPlatformColor } from '@/utils/platformConfig';

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="flex flex-wrap gap-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-28 rounded-full" />)}
      </div>
      <DashboardGrid cols={3}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} variant="glass"><CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-36" /><Skeleton className="h-4 w-20" />
          </CardContent></Card>
        ))}
      </DashboardGrid>
      <Card variant="glass"><CardContent className="p-6">
        <Skeleton className="h-5 w-40 mb-4" /><Skeleton className="h-80 w-full rounded-xl" />
      </CardContent></Card>
      <Card variant="glass"><CardContent className="p-6">
        <Skeleton className="h-5 w-40 mb-4" /><Skeleton className="h-64 w-full rounded-xl" />
      </CardContent></Card>
      <Card variant="glass"><CardContent className="p-6">
        <Skeleton className="h-5 w-48 mb-4" /><Skeleton className="h-96 w-full rounded-xl" />
      </CardContent></Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PlatformAnalysis page                                               */
/* ------------------------------------------------------------------ */

export function PlatformAnalysis() {
  const { language, currency, exchangeRate } = useAppState();
  const data = useDataLoader();

  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  // Auto-select first platform when data loads
  const platforms = data.platformSummary;
  const activePlatform = selectedPlatform ?? (platforms.length > 0 ? platforms[0].platform : null);

  // Selected platform data
  const selectedPlatformData = useMemo(() => {
    if (!activePlatform) return null;
    return platforms.find((p) => p.platform === activePlatform) ?? null;
  }, [platforms, activePlatform]);

  // Grand total for share calculation
  const grandTotal = useMemo(() => {
    return platforms.reduce((sum, p) => sum + p.totalSales, 0);
  }, [platforms]);

  // Monthly sales for selected platform (bar chart data)
  const selectedMonthlyData = useMemo(() => {
    if (!selectedPlatformData) return [];
    return [...selectedPlatformData.monthlyTrend].sort((a, b) =>
      a.month.localeCompare(b.month)
    );
  }, [selectedPlatformData]);

  // Top 10 titles for selected platform
  const selectedTopTitles = useMemo(() => {
    if (!selectedPlatformData) return [];
    return selectedPlatformData.topTitles.slice(0, 10);
  }, [selectedPlatformData]);

  // Platform comparison: stacked area data (all platforms' monthly trends merged)
  const comparisonData = useMemo(() => {
    if (platforms.length === 0) return [];

    // Collect all months
    const monthSet = new Set<string>();
    platforms.forEach((p) => {
      p.monthlyTrend.forEach((mt) => monthSet.add(mt.month));
    });

    const months = Array.from(monthSet).sort();
    return months.map((month) => {
      const row: Record<string, string | number> = { month };
      platforms.forEach((p) => {
        const entry = p.monthlyTrend.find((mt) => mt.month === month);
        row[p.platform] = entry ? entry.sales : 0;
      });
      return row;
    });
  }, [platforms]);

  if (data.loading) {
    return (
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-primary">
          {t(language, 'nav.platforms')}
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
        {t(language, 'nav.platforms')}
      </motion.h1>

      {/* Platform Tabs - Pill Buttons */}
      <motion.div variants={staggerItem} className="flex flex-wrap gap-2 mb-6">
        {platforms.map((p) => {
          const isActive = p.platform === activePlatform;
          return (
            <motion.button
              key={p.platform}
              onClick={() => setSelectedPlatform(p.platform)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer"
              style={{
                backgroundColor: isActive ? getPlatformBrand(p.platform).color : '#F1F5F9',
                color: isActive ? '#ffffff' : '#475569',
                border: isActive ? 'none' : `1px solid ${getPlatformBrand(p.platform).borderColor}`,
                boxShadow: isActive ? `0 2px 8px ${getPlatformBrand(p.platform).color}40` : 'none',
              }}
            >
              {!isActive && <PlatformIcon name={p.platform} size={20} />}
              {p.platform}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Selected Platform View */}
      {selectedPlatformData && (
        <motion.div
          key={selectedPlatformData.platform}
          initial="hidden"
          animate="show"
          variants={staggerContainer}
          className="space-y-6"
        >
          {/* KPI Cards */}
          <motion.div variants={staggerItem}>
            <DashboardGrid cols={3}>
              <KPICard
                title={t(language, 'kpi.totalSales')}
                value={formatSales(selectedPlatformData.totalSales, currency, exchangeRate, language)}
                subtitle={selectedPlatformData.platform}
              />
              <KPICard
                title={language === 'ko' ? '작품 수' : '作品数'}
                value={String(selectedPlatformData.titleCount)}
                subtitle={language === 'ko' ? '등록된 작품' : '登録作品'}
              />
              <KPICard
                title={language === 'ko' ? '매출 비중' : '売上シェア'}
                value={grandTotal > 0
                  ? `${((selectedPlatformData.totalSales / grandTotal) * 100).toFixed(1)}%`
                  : '0%'
                }
                subtitle={language === 'ko' ? '전체 대비' : '全体比'}
              />
            </DashboardGrid>
          </motion.div>

          {/* Monthly Sales Bar Chart */}
          <motion.div variants={staggerItem}>
            <ChartCard
              title={`${t(language, 'chart.monthlySales')} - ${selectedPlatformData.platform}`}
              variant="glass"
            >
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={selectedMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    stroke="#CBD5E1"
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    tickFormatter={(val: any) => val.substring(2).replace('-', '/')}
                  />
                  <YAxis
                    stroke="#CBD5E1"
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    tickFormatter={(val: any) => formatSalesShort(val)}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(value: any) => [
                      formatSales(value, currency, exchangeRate, language),
                      t(language, 'table.sales'),
                    ]}
                  />
                  <Bar
                    dataKey="sales"
                    fill={getPlatformColor(activePlatform || '')}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>

          {/* Top 10 Titles Table */}
          <motion.div variants={staggerItem}>
            <Card variant="glass">
              <CardContent className="p-6">
                <h3 className="text-base font-semibold mb-4 text-primary">
                  {t(language, 'chart.topTitles')} - {selectedPlatformData.platform}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted hover:bg-muted">
                      <TableHead className="font-semibold">
                        {t(language, 'table.rank')}
                      </TableHead>
                      <TableHead className="font-semibold">
                        {t(language, 'table.title')}
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        {t(language, 'table.sales')}
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        {language === 'ko' ? '비중' : 'シェア'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTopTitles.map((title, idx) => (
                      <TableRow
                        key={`${title.titleKR}-${idx}`}
                        className={idx % 2 === 1 ? 'bg-background' : 'bg-card'}
                      >
                        <TableCell className="font-mono text-sm text-text-muted">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-[15px] text-foreground">
                          {language === 'ko' ? title.titleKR : title.titleJP}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold text-foreground">
                          {formatSales(title.sales, currency, exchangeRate, language)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-text-secondary">
                          {selectedPlatformData.totalSales > 0
                            ? `${((title.sales / selectedPlatformData.totalSales) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                    {selectedTopTitles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="p-8 text-center text-[15px] text-text-muted">
                          {language === 'ko' ? '데이터가 없습니다.' : 'データがありません。'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Platform Comparison Section */}
      <motion.div variants={staggerItem} className="mt-6">
        <ChartCard
          title={t(language, 'chart.platformShareTrend')}
          variant="glass"
        >
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="month"
                stroke="#CBD5E1"
                tick={{ fill: '#64748B', fontSize: 12 }}
                tickFormatter={(val: any) => val.substring(2).replace('-', '/')}
              />
              <YAxis
                stroke="#CBD5E1"
                tick={{ fill: '#64748B', fontSize: 12 }}
                tickFormatter={(val: any) => formatSalesShort(val)}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: any, name: any) => [
                  formatSales(value, currency, exchangeRate, language),
                  name,
                ]}
              />
              <Legend content={() => null} />
              {platforms.map((p) => (
                <Area
                  key={p.platform}
                  type="monotone"
                  dataKey={p.platform}
                  stackId="1"
                  stroke={getPlatformColor(p.platform)}
                  fill={getPlatformColor(p.platform)}
                  fillOpacity={0.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2 px-2">
            {platforms.map((p) => (
              <div key={p.platform} className="flex items-center gap-1.5">
                <PlatformIcon name={p.platform} size={16} />
                <span className="text-xs font-medium text-text-secondary">{p.platform}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </motion.div>
    </motion.div>
  );
}
