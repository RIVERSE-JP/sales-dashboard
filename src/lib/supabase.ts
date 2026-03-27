import { createClient } from '@supabase/supabase-js';
import type { Platform, Genre, DailySale, InitialSale, SalesAggregation, TimeGranularity } from '@/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// Platform & Genre lookups (cached)
// ============================================================

let _platforms: Platform[] | null = null;
let _genres: Genre[] | null = null;

export async function fetchPlatforms(): Promise<Platform[]> {
  if (_platforms) return _platforms;
  const { data } = await supabase.from('platforms').select('*').order('sort_order');
  _platforms = (data as Platform[] | null) ?? [];
  return _platforms;
}

export async function fetchGenres(): Promise<Genre[]> {
  if (_genres) return _genres;
  const { data } = await supabase.from('genres').select('*').order('name_jp');
  _genres = (data as Genre[] | null) ?? [];
  return _genres;
}

// ============================================================
// Daily Sales queries
// ============================================================

export async function fetchDailySalesAggregated(
  granularity: TimeGranularity,
  options?: {
    platform?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<SalesAggregation[]> {
  // Use RPC for complex aggregation
  const { data, error } = await supabase.rpc('aggregate_sales', {
    p_granularity: granularity,
    p_platform: options?.platform || null,
    p_start_date: options?.startDate || null,
    p_end_date: options?.endDate || null,
  });

  if (error) {
    console.error('fetchDailySalesAggregated error:', error);
    return [];
  }
  return (data as SalesAggregation[] | null) ?? [];
}

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
  if (options?.titleSearch) query = query.or(`title_jp.ilike.%${options.titleSearch}%,title_kr.ilike.%${options.titleSearch}%`);
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
// Dashboard summary queries
// ============================================================

export async function fetchDashboardSummary() {
  const [salesRes, platformRes, titleRes] = await Promise.all([
    supabase.from('daily_sales_v2')
      .select('sale_date, sales_amount, channel')
      .order('sale_date', { ascending: true }),
    supabase.from('platforms').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('daily_sales_v2')
      .select('title_jp, title_kr, channel, sales_amount')
  ]);

  return {
    sales: salesRes.data ?? [],
    platforms: platformRes.data ?? [],
    titles: titleRes.data ?? [],
  };
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
      totalInserted += (data as { inserted?: number }).inserted ?? 0;
      totalUpdated += (data as { updated?: number }).updated ?? 0;
    }
  }

  return { inserted: totalInserted, updated: totalUpdated };
}
