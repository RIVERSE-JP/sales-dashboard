import { createClient } from '@supabase/supabase-js';
import type {
  DailySale, InitialSale,
  KPIData, MonthlyTrendRow, PlatformSummaryRow, TopTitleRow, GrowthAlertRow,
  PlatformDetailData, TitleSummaryRow, TitleDetailData,
} from '@/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_KEY || 'placeholder');

// ============================================================
// Generic fetch helper
// ============================================================

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ============================================================
// Daily Sales queries
// ============================================================

export async function fetchDailySalesPage(
  page: number,
  pageSize: number,
  options?: {
    platform?: string;
    titleSearch?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
  }
): Promise<{ rows: DailySale[]; count: number }> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (options?.platform) params.set('platform', options.platform);
  if (options?.titleSearch) params.set('titleSearch', options.titleSearch);
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortDir) params.set('sortDir', options.sortDir);

  return apiFetch<{ rows: DailySale[]; count: number }>(`/api/sales/paginated?${params}`);
}

export async function fetchAllDailySales(): Promise<DailySale[]> {
  return apiFetch<DailySale[]>('/api/sales/all');
}

// ============================================================
// Dashboard RPC functions → API Routes
// ============================================================

export async function fetchDashboardKPIs(): Promise<KPIData | null> {
  try {
    return await apiFetch<KPIData>('/api/dashboard/kpis');
  } catch (e) {
    console.error('fetchDashboardKPIs error:', e);
    return null;
  }
}

export async function fetchMonthlyTrend(): Promise<MonthlyTrendRow[]> {
  try {
    return await apiFetch<MonthlyTrendRow[]>('/api/dashboard/monthly-trend');
  } catch (e) {
    console.error('fetchMonthlyTrend error:', e);
    return [];
  }
}

export async function fetchPlatformSummary(): Promise<PlatformSummaryRow[]> {
  try {
    return await apiFetch<PlatformSummaryRow[]>('/api/dashboard/platform-summary');
  } catch (e) {
    console.error('fetchPlatformSummary error:', e);
    return [];
  }
}

export async function fetchTopTitles(limit = 20, month?: string): Promise<TopTitleRow[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (month) params.set('month', month);
  try {
    return await apiFetch<TopTitleRow[]>(`/api/dashboard/top-titles?${params}`);
  } catch (e) {
    console.error('fetchTopTitles error:', e);
    return [];
  }
}

export async function fetchPlatformDetail(channel: string): Promise<PlatformDetailData | null> {
  const params = new URLSearchParams({ channel });
  try {
    return await apiFetch<PlatformDetailData>(`/api/dashboard/platform-detail?${params}`);
  } catch (e) {
    console.error('fetchPlatformDetail error:', e);
    return null;
  }
}

export async function fetchTitleDetail(titleJP: string): Promise<TitleDetailData | null> {
  const params = new URLSearchParams({ title_jp: titleJP });
  try {
    return await apiFetch<TitleDetailData>(`/api/dashboard/title-detail?${params}`);
  } catch (e) {
    console.error('fetchTitleDetail error:', e);
    return null;
  }
}

export async function fetchGrowthAlerts(): Promise<GrowthAlertRow[]> {
  try {
    return await apiFetch<GrowthAlertRow[]>('/api/dashboard/growth-alerts');
  } catch (e) {
    console.warn('fetchGrowthAlerts failed (non-critical):', e);
    return [];
  }
}

// ============================================================
// Prefetch ALL page data on app startup (background)
// ============================================================

let _prefetchStarted = false;

export function clearAllCache() {
  _prefetchStarted = false;
  // Optionally call revalidate API if needed
}

export function prefetchAllData() {
  if (_prefetchStarted) return;
  _prefetchStarted = true;

  // Fire all fetches in parallel — don't await, let them warm server cache in background
  Promise.allSettled([
    fetchDashboardKPIs(),
    fetchMonthlyTrend(),
    fetchPlatformSummary(),
    fetchTopTitles(20),
    fetchTitleSummaries(),
    fetchTitleMaster(),
  ]);
}

export async function fetchTitleSummaries(): Promise<TitleSummaryRow[]> {
  try {
    return await apiFetch<TitleSummaryRow[]>('/api/sales/title-summaries');
  } catch (e) {
    console.error('fetchTitleSummaries error:', e);
    return [];
  }
}

// ============================================================
// Title master data (genre, company, etc from titles table)
// ============================================================

export async function fetchTitleMaster() {
  try {
    return await apiFetch<Array<{ title_jp: string; title_kr: string | null; genre: string | null; company: string | null; format: string }>>('/api/sales/title-master');
  } catch (e) {
    console.error('fetchTitleMaster error:', e);
    return [];
  }
}

// ============================================================
// Initial Sales queries
// ============================================================

export async function fetchInitialSales(options?: {
  platform?: string;
  genre?: string;
  launchType?: string;
}): Promise<InitialSale[]> {
  const params = new URLSearchParams();
  if (options?.platform) params.set('platform', options.platform);
  if (options?.genre) params.set('genre', options.genre);
  if (options?.launchType) params.set('launchType', options.launchType);
  const qs = params.toString();
  try {
    return await apiFetch<InitialSale[]>(`/api/sales/initial-sales${qs ? `?${qs}` : ''}`);
  } catch (e) {
    console.error('fetchInitialSales error:', e);
    return [];
  }
}

// ============================================================
// Upload functions
// ============================================================

export async function upsertDailySales(
  rows: Array<{
    title_jp: string;
    title_kr?: string;
    channel_title_jp?: string;
    channel: string;
    sale_date: string;
    sales_amount: number;
  }>,
  source: 'weekly_report' | 'sokuhochi' | 'manual' = 'weekly_report',
  isPreliminary = false,
) {
  return apiFetch<{ inserted: number; updated: number }>('/api/sales/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, source, isPreliminary }),
  });
}

// ============================================================
// Title daily sales (used by InitialSales page)
// ============================================================

export async function fetchTitleDailySales(titleJP: string) {
  const params = new URLSearchParams({ title_jp: titleJP });
  return apiFetch<Array<{ sale_date: string; daily_total: number }>>(`/api/sales/title-daily-sales?${params}`);
}

// ============================================================
// Genres
// ============================================================

export async function fetchGenres(): Promise<Array<{ id: number; name: string }>> {
  try {
    return await apiFetch<Array<{ id: number; name: string }>>('/api/sales/genres');
  } catch (e) {
    console.error('fetchGenres error:', e);
    return [];
  }
}

// ============================================================
// Analysis API functions
// ============================================================

function buildDateParams(startDate?: string, endDate?: string): string {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchGenreSummary(startDate?: string, endDate?: string) {
  return apiFetch<Array<{ genre_code: string; genre_kr: string; total_sales: number; title_count: number; avg_daily: number }>>(
    `/api/analysis/genre-summary${buildDateParams(startDate, endDate)}`
  );
}

export async function fetchCompanySummary(startDate?: string, endDate?: string) {
  return apiFetch<Array<{ company_name: string; total_sales: number; title_count: number; avg_daily: number }>>(
    `/api/analysis/company-summary${buildDateParams(startDate, endDate)}`
  );
}

export async function fetchFormatSummary(startDate?: string, endDate?: string) {
  return apiFetch<Array<{ content_format: string; total_sales: number; title_count: number }>>(
    `/api/analysis/format-summary${buildDateParams(startDate, endDate)}`
  );
}

export async function fetchDailyTrend(startDate?: string, endDate?: string) {
  return apiFetch<Array<{ day: string; total_sales: number }>>(
    `/api/analysis/daily-trend${buildDateParams(startDate, endDate)}`
  );
}

export async function fetchWeeklyTrend(startDate?: string, endDate?: string) {
  return apiFetch<Array<{ week: string; total_sales: number }>>(
    `/api/analysis/weekly-trend${buildDateParams(startDate, endDate)}`
  );
}

export async function fetchPlatformGenreMatrix(startDate?: string, endDate?: string) {
  return apiFetch<Array<{ channel: string; genre_kr: string; total_sales: number }>>(
    `/api/analysis/platform-genre-matrix${buildDateParams(startDate, endDate)}`
  );
}

export async function fetchPeriodKpis(startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate });
  return apiFetch<{ total_sales: number; active_titles: number; active_platforms: number }>(
    `/api/analysis/period-kpis?${params}`
  );
}

export async function fetchTitleRankings(currentStart: string, currentEnd: string, prevStart: string, prevEnd: string, limit?: number) {
  const params = new URLSearchParams({ currentStart, currentEnd, prevStart, prevEnd });
  if (limit) params.set('limit', String(limit));
  return apiFetch<Array<{ title_jp: string; title_kr: string; channels: string[]; current_sales: number; prev_sales: number; rank_change: number }>>(
    `/api/analysis/title-rankings?${params}`
  );
}

export async function fetchPlatformHealth(channel: string, months?: number) {
  const params = new URLSearchParams({ channel });
  if (months) params.set('months', String(months));
  return apiFetch<{ monthly_health: Array<{ month: string; total_sales: number; active_titles: number; daily_avg: number }> }>(
    `/api/analysis/platform-health?${params}`
  );
}
