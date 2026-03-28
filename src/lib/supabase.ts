import { createClient } from '@supabase/supabase-js';
import type {
  DailySale, InitialSale,
  KPIData, MonthlyTrendRow, PlatformSummaryRow, TopTitleRow, GrowthAlertRow,
  PlatformDetailData, TitleSummaryRow, TitleDetailData, UpsertResult,
} from '@/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// Simple TTL cache for RPC results
// ============================================================

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
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
  let query = supabase
    .from('daily_sales_v2')
    .select('*', { count: 'exact' });

  if (options?.platform) query = query.eq('channel', options.platform);
  if (options?.titleSearch) {
    // Sanitize search input: escape PostgREST special characters to prevent filter injection
    const sanitized = options.titleSearch.replace(/[%_\\]/g, (ch) => `\\${ch}`);
    query = query.or(`title_jp.ilike.%${sanitized}%,title_kr.ilike.%${sanitized}%`);
  }
  if (options?.startDate) query = query.gte('sale_date', options.startDate);
  if (options?.endDate) query = query.lte('sale_date', options.endDate);

  const sortCol = options?.sortBy || 'sale_date';
  const sortDir = options?.sortDir || 'desc';
  query = query.order(sortCol, { ascending: sortDir === 'asc' });
  query = query.range(page * pageSize, (page + 1) * pageSize - 1);

  const { data, count, error } = await query;
  if (error) console.error('fetchDailySalesPage error:', error);
  return { rows: (data as DailySale[] | null) ?? [], count: count ?? 0 };
}

export async function fetchAllDailySales(): Promise<DailySale[]> {
  const allRows: DailySale[] = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    const { data } = await supabase
      .from('daily_sales_v2')
      .select('*')
      .order('sale_date', { ascending: true })
      .range(from, from + batchSize - 1);

    if (!data || data.length === 0) break;
    allRows.push(...(data as DailySale[]));
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return allRows;
}

// ============================================================
// Server-side RPC functions (no 1000-row limit)
// ============================================================

export async function fetchDashboardKPIs(): Promise<KPIData | null> {
  const cached = getCached<KPIData>('dashboard_kpis');
  if (cached) return cached;
  const { data, error } = await supabase.rpc('get_dashboard_kpis');
  if (error) { console.error('RPC error:', error.message); return (data as KPIData | null) ?? null; }
  setCache('dashboard_kpis', data);
  return data as KPIData | null;
}

export async function fetchMonthlyTrend(): Promise<MonthlyTrendRow[]> {
  const cached = getCached<MonthlyTrendRow[]>('monthly_trend');
  if (cached) return cached;
  const { data, error } = await supabase.rpc('get_monthly_sales_trend');
  if (error) { console.error('RPC error:', error.message); return (data as MonthlyTrendRow[] | null) ?? []; }
  const result = (data as MonthlyTrendRow[] | null) ?? [];
  setCache('monthly_trend', result);
  return result;
}

export async function fetchPlatformSummary(): Promise<PlatformSummaryRow[]> {
  const cached = getCached<PlatformSummaryRow[]>('platform_summary');
  if (cached) return cached;
  const { data, error } = await supabase.rpc('get_platform_sales_summary');
  if (error) { console.error('RPC error:', error.message); return (data as PlatformSummaryRow[] | null) ?? []; }
  const result = (data as PlatformSummaryRow[] | null) ?? [];
  setCache('platform_summary', result);
  return result;
}

export async function fetchTopTitles(limit = 20, month?: string): Promise<TopTitleRow[]> {
  const key = `top_titles_${limit}_${month ?? 'all'}`;
  const cached = getCached<TopTitleRow[]>(key);
  if (cached) return cached;
  const { data, error } = await supabase.rpc('get_top_titles', {
    p_limit: limit,
    p_month: month || null,
  });
  if (error) { console.error('RPC error:', error.message); return (data as TopTitleRow[] | null) ?? []; }
  const result = (data as TopTitleRow[] | null) ?? [];
  setCache(key, result);
  return result;
}

export async function fetchPlatformDetail(channel: string): Promise<PlatformDetailData | null> {
  const key = `platform_detail_${channel}`;
  const cached = getCached<PlatformDetailData>(key);
  if (cached) return cached;
  const { data, error } = await supabase.rpc('get_platform_detail', {
    p_channel: channel,
  });
  if (error) { console.error('RPC error:', error.message); return (data as PlatformDetailData | null) ?? null; }
  setCache(key, data);
  return data as PlatformDetailData | null;
}

export async function fetchTitleDetail(titleJP: string): Promise<TitleDetailData | null> {
  const key = `title_detail_${titleJP}`;
  const cached = getCached<TitleDetailData>(key);
  if (cached) return cached;
  const { data, error } = await supabase.rpc('get_title_detail', {
    p_title_jp: titleJP,
  });
  if (error) { console.error('RPC error:', error.message); return (data as TitleDetailData | null) ?? null; }
  setCache(key, data);
  return data as TitleDetailData | null;
}

export async function fetchGrowthAlerts(): Promise<GrowthAlertRow[]> {
  const cached = getCached<GrowthAlertRow[]>('growth_alerts');
  if (cached) return cached;
  const { data, error } = await supabase.rpc('get_growth_alerts');
  if (error) {
    console.warn('get_growth_alerts failed (non-critical):', error.message);
    return [];
  }
  const result = (data as GrowthAlertRow[] | null) ?? [];
  setCache('growth_alerts', result);
  return result;
}

// ============================================================
// Prefetch ALL page data on app startup (background)
// This ensures every page loads instantly from cache
// ============================================================

let _prefetchStarted = false;

export function clearAllCache() {
  cache.clear();
  _prefetchStarted = false;
}

export function prefetchAllData() {
  if (_prefetchStarted) return;
  _prefetchStarted = true;

  // Fire all RPCs in parallel — don't await, let them fill cache in background
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
  const cached = getCached<TitleSummaryRow[]>('title_summaries');
  if (cached) return cached;
  const { data, error } = await supabase.rpc('get_title_summaries');
  if (error) { console.error('RPC error:', error.message); return (data as TitleSummaryRow[] | null) ?? []; }
  const result = (data as TitleSummaryRow[] | null) ?? [];
  setCache('title_summaries', result);
  return result;
}

// ============================================================
// Title master data (genre, company, etc from titles table)
// ============================================================

export async function fetchTitleMaster() {
  const cached = getCached<Array<{ title_jp: string; title_kr: string | null; genre: string | null; company: string | null; format: string }>>('title_master');
  if (cached) return cached;
  const { data, error } = await supabase
    .from('titles')
    .select('title_jp, title_kr, management_type, content_format, production_companies(name)');
  if (error) { console.error('fetchTitleMaster error:', error.message); return []; }
  const result = (data ?? []).map((r: Record<string, unknown>) => ({
    title_jp: r.title_jp as string,
    title_kr: r.title_kr as string | null,
    genre: r.management_type as string | null,
    company: (r.production_companies as { name: string } | null)?.name ?? null,
    format: r.content_format as string,
  }));
  setCache('title_master', result);
  return result;
}

// ============================================================
// Initial Sales queries
// ============================================================

export async function fetchInitialSales(options?: {
  platform?: string;
  genre?: string;
  launchType?: string;
}): Promise<InitialSale[]> {
  let query = supabase.from('initial_sales').select('*');

  if (options?.platform) query = query.eq('platform_code', options.platform);
  if (options?.genre) query = query.eq('genre_kr', options.genre);
  if (options?.launchType) query = query.eq('launch_type', options.launchType);

  query = query.order('launch_date', { ascending: false });

  const { data, error } = await query;
  if (error) console.error('fetchInitialSales error:', error);
  return (data as InitialSale[] | null) ?? [];
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
  // Batch in groups of 500
  const batchSize = 500;
  let totalInserted = 0;
  let totalUpdated = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { data, error } = await supabase.rpc('upsert_daily_sales', {
      p_rows: batch,
      p_source: source,
      p_is_preliminary: isPreliminary,
    });

    if (error) {
      console.error(`Batch ${i / batchSize + 1} error:`, error);
      continue;
    }
    if (data) {
      const result = data as UpsertResult;
      totalInserted += result.inserted ?? 0;
      totalUpdated += result.updated ?? 0;
    }
  }

  return { inserted: totalInserted, updated: totalUpdated };
}
