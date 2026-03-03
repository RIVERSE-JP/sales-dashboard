import type { DailySale, TitleSummary } from '../types';

export function calcMoMChange(monthlySales: { month: string; totalSales: number }[]): number {
  if (monthlySales.length < 2) return 0;
  const sorted = [...monthlySales].sort((a, b) => a.month.localeCompare(b.month));
  const current = sorted[sorted.length - 1].totalSales;
  const previous = sorted[sorted.length - 2].totalSales;
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function calcGrowthRate(titles: TitleSummary[], _days: number = 30): { title: TitleSummary; growth: number }[] {
  return titles.map(title => {
    const trend = title.monthlyTrend;
    if (trend.length < 2) return { title, growth: 0 };
    const recent = trend[trend.length - 1].sales;
    const previous = trend[trend.length - 2].sales;
    const growth = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
    return { title, growth };
  }).sort((a, b) => b.growth - a.growth);
}

export function calcWeekdayPattern(dailySales: DailySale[]): { day: string; dayIndex: number; avgSales: number }[] {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const totals = new Array(7).fill(0);
  const counts = new Array(7).fill(0);

  dailySales.forEach(sale => {
    const d = new Date(sale.date);
    const day = d.getDay();
    totals[day] += sale.sales;
    counts[day]++;
  });

  return dayNames.map((name, i) => ({
    day: name,
    dayIndex: i,
    avgSales: counts[i] > 0 ? Math.round(totals[i] / counts[i]) : 0,
  }));
}

export function filterByDateRange(data: DailySale[], start: string, end: string): DailySale[] {
  return data.filter(d => d.date >= start && d.date <= end);
}

export function groupByMonth(data: DailySale[]): Map<string, number> {
  const map = new Map<string, number>();
  data.forEach(d => {
    const month = d.date.substring(0, 7);
    map.set(month, (map.get(month) || 0) + d.sales);
  });
  return map;
}

export function groupByWeek(data: DailySale[]): Map<string, number> {
  const map = new Map<string, number>();
  data.forEach(d => {
    const date = new Date(d.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().substring(0, 10);
    map.set(key, (map.get(key) || 0) + d.sales);
  });
  return map;
}

// ---------------------------------------------------------------------------
// Platform Dynamics & Risk calculations
// ---------------------------------------------------------------------------

/** Herfindahl-Hirschman Index for platform concentration (0-10000) */
export function calcHHI(platformSales: { platform: string; totalSales: number }[]): number {
  const total = platformSales.reduce((s, p) => s + p.totalSales, 0);
  if (total === 0) return 0;
  return platformSales.reduce((sum, p) => {
    const share = (p.totalSales / total) * 100;
    return sum + share * share;
  }, 0);
}

/** Platform MoM changes - returns sorted by absolute change */
export function calcPlatformMoMChanges(
  platformSummaries: { platform: string; monthlyTrend: { month: string; sales: number }[] }[]
): { platform: string; currentSales: number; previousSales: number; change: number; changePercent: number }[] {
  return platformSummaries
    .map(p => {
      const sorted = [...p.monthlyTrend].sort((a, b) => a.month.localeCompare(b.month));
      if (sorted.length < 2) return { platform: p.platform, currentSales: 0, previousSales: 0, change: 0, changePercent: 0 };
      const current = sorted[sorted.length - 1].sales;
      const previous = sorted[sorted.length - 2].sales;
      const change = current - previous;
      const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      return { platform: p.platform, currentSales: current, previousSales: previous, change, changePercent };
    })
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

// ---------------------------------------------------------------------------
// Sales Structure Analysis calculations
// ---------------------------------------------------------------------------

/** Title concentration: Top N titles' share of total sales */
export function calcTitleConcentration(
  titles: { titleKR: string; titleJP: string; totalSales: number }[],
  topN: number = 10
): { topTitles: { titleKR: string; titleJP: string; totalSales: number; share: number; cumShare: number }[]; restShare: number; total: number } {
  const sorted = [...titles].sort((a, b) => b.totalSales - a.totalSales);
  const total = sorted.reduce((s, t) => s + t.totalSales, 0);
  let cumShare = 0;
  const topTitles = sorted.slice(0, topN).map(t => {
    const share = total > 0 ? (t.totalSales / total) * 100 : 0;
    cumShare += share;
    return { ...t, share, cumShare };
  });
  return { topTitles, restShare: 100 - cumShare, total };
}

/** Platform diversification: how many platforms each title is on */
export function calcPlatformDiversification(
  titles: { titleKR: string; titleJP: string; totalSales: number; platforms: { name: string; sales: number }[] }[]
): { titleKR: string; titleJP: string; totalSales: number; platformCount: number }[] {
  return titles
    .map(t => ({
      titleKR: t.titleKR,
      titleJP: t.titleJP,
      totalSales: t.totalSales,
      platformCount: t.platforms.length,
    }))
    .sort((a, b) => b.totalSales - a.totalSales);
}

/** Revenue stability using Coefficient of Variation */
export function calcRevenueStability(
  titles: { titleKR: string; titleJP: string; totalSales: number; monthlyTrend: { month: string; sales: number }[] }[]
): { titleKR: string; titleJP: string; totalSales: number; cv: number; stability: 'stable' | 'moderate' | 'volatile' }[] {
  return titles
    .filter(t => t.monthlyTrend.length >= 3)
    .map(t => {
      const values = t.monthlyTrend.map(m => m.sales);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      const stddev = Math.sqrt(variance);
      const cv = mean > 0 ? (stddev / mean) * 100 : 0;
      const stability: 'stable' | 'moderate' | 'volatile' = cv < 30 ? 'stable' : cv < 60 ? 'moderate' : 'volatile';
      return { titleKR: t.titleKR, titleJP: t.titleJP, totalSales: t.totalSales, cv, stability };
    })
    .sort((a, b) => b.totalSales - a.totalSales);
}
