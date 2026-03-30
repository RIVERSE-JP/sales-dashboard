import { supabaseServer } from '@/lib/supabase-server';
import DashboardClient from '@/components/dashboard/DashboardClient';
import type { DashboardInitialData } from '@/components/dashboard/DashboardClient';

export const revalidate = 300; // ISR: 5분

export default async function DashboardPage() {
  let initialData: DashboardInitialData | null = null;

  try {
    // 핵심 데이터만 SSR (KPI + 추이만, 나머지는 클라이언트 SWR)에서 가져옴 (빠른 것만, 느린 건 클라이언트 SWR에서)
    const [kpisRes, trendRes] = await Promise.allSettled([
      supabaseServer.rpc('get_dashboard_kpis'),
      supabaseServer.rpc('get_monthly_sales_trend'),
    ]);

    initialData = {
      kpis: kpisRes.status === 'fulfilled' && !kpisRes.value.error ? kpisRes.value.data : null,
      trend: trendRes.status === 'fulfilled' && !trendRes.value.error ? trendRes.value.data : null,
      platforms: null,   // 클라이언트 SWR에서 로드 (0.7초)
      topTitles: null,   // 클라이언트 SWR에서 로드 (1초)
      growthAlerts: null, // 클라이언트 SWR에서 로드
    };
  } catch {
    // Server prefetch failed — client will load via SWR
  }

  return <DashboardClient initialData={initialData} />;
}
