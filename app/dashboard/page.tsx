import { supabaseServer } from '@/lib/supabase-server';
import DashboardClient from '@/components/dashboard/DashboardClient';
import type { DashboardInitialData } from '@/components/dashboard/DashboardClient';

export const revalidate = 300; // ISR: 5분

export default async function DashboardPage() {
  let initialData: DashboardInitialData | null = null;

  try {
    // growth-alerts uses direct query (same logic as API route)
    const now = new Date();
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`;

    const [kpisRes, trendRes, platformsRes, topTitlesRes, alertsRes] = await Promise.allSettled([
      supabaseServer.rpc('get_dashboard_kpis'),
      supabaseServer.rpc('get_monthly_sales_trend'),
      supabaseServer.rpc('get_platform_sales_summary'),
      supabaseServer.rpc('get_top_titles', { p_limit: 20, p_month: null }),
      supabaseServer.from('daily_sales_v2').select('title_jp, title_kr, sale_date, sales_amount'),
    ]);

    // Process growth alerts from raw data (same logic as /api/dashboard/growth-alerts)
    let growthAlerts = null;
    if (alertsRes.status === 'fulfilled' && alertsRes.value.data) {
      const titleMap = new Map<string, { title_kr: string | null; thisMonth: number; lastMonth: number }>();
      for (const row of alertsRes.value.data) {
        if (!titleMap.has(row.title_jp)) {
          titleMap.set(row.title_jp, { title_kr: row.title_kr, thisMonth: 0, lastMonth: 0 });
        }
        const entry = titleMap.get(row.title_jp)!;
        if (row.sale_date >= thisMonthStart) {
          entry.thisMonth += row.sales_amount;
        } else if (row.sale_date >= lastMonthStart && row.sale_date < thisMonthStart) {
          entry.lastMonth += row.sales_amount;
        }
        if (row.title_kr) entry.title_kr = row.title_kr;
      }
      growthAlerts = Array.from(titleMap.entries())
        .filter(([, v]) => v.lastMonth > 0)
        .map(([title_jp, v]) => ({
          title_jp,
          title_kr: v.title_kr,
          this_month: v.thisMonth,
          last_month: v.lastMonth,
          growth_pct: Math.round(((v.thisMonth - v.lastMonth) / v.lastMonth) * 1000) / 10,
        }))
        .sort((a, b) => a.growth_pct - b.growth_pct)
        .slice(0, 30);
    }

    initialData = {
      kpis: kpisRes.status === 'fulfilled' && !kpisRes.value.error ? kpisRes.value.data : null,
      trend: trendRes.status === 'fulfilled' && !trendRes.value.error ? trendRes.value.data : null,
      platforms: platformsRes.status === 'fulfilled' && !platformsRes.value.error ? platformsRes.value.data : null,
      topTitles: topTitlesRes.status === 'fulfilled' && !topTitlesRes.value.error ? topTitlesRes.value.data : null,
      growthAlerts,
    };
  } catch {
    // Server prefetch failed — client will load via SWR
  }

  return <DashboardClient initialData={initialData} />;
}
