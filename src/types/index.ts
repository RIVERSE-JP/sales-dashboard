// ============================================================
// Core domain types for RVJP Sales Dashboard v2
// ============================================================

export interface DailySale {
  id: number;
  title_jp: string;
  title_kr: string | null;
  channel: string;
  sale_date: string;
  sales_amount: number;
  data_source: 'weekly_report' | 'sokuhochi' | 'manual';
  is_preliminary: boolean;
}

export interface InitialSale {
  id: number;
  title_kr: string;
  platform_code: string;
  genre_kr: string | null;
  pf_genre: string | null;
  launch_type: string;
  launch_date: string;
  launch_episodes: number;
  d1: number; d2: number; d3: number; d4: number;
  d5: number; d6: number; d7: number; d8: number;
  w1: number; w2: number; w3: number; w4: number;
  w5: number; w6: number; w7: number; w8: number;
  w9: number; w10: number; w11: number; w12: number;
}

// ============================================================
// RPC response types (Dashboard / Platform / Title)
// ============================================================

export interface KPIData {
  total_sales: number;
  this_month_sales: number;
  last_month_sales: number;
  mom_change: number;
  active_titles: number;
  active_platforms: number;
}

export interface MonthlyTrendRow {
  month: string;
  total_sales: number;
}

export interface PlatformSummaryRow {
  channel: string;
  total_sales: number;
  title_count: number;
  avg_daily: number;
}

export interface TopTitleRow {
  title_jp: string;
  title_kr: string | null;
  channels: string[];
  total_sales: number;
  day_count: number;
}

export interface GrowthAlertRow {
  title_jp: string;
  title_kr: string | null;
  this_month: number;
  last_month: number;
  growth_pct: number;
}

export interface PlatformDetailData {
  total_sales: number;
  title_count: number;
  daily_avg: number;
  monthly_trend: Array<{ month: string; sales: number }>;
  top_titles: Array<{ title_jp: string; title_kr: string | null; total_sales: number }>;
}

export interface TitleSummaryRow {
  title_jp: string;
  title_kr: string | null;
  channels: string[];
  first_date: string;
  total_sales: number;
  day_count: number;
}

export interface TitleDetailData {
  total_sales: number;
  title_kr: string | null;
  channels: string[];
  monthly_trend: Array<{ month: string; sales: number }>;
  platform_breakdown: Array<{ channel: string; sales: number }>;
  daily_recent: Array<{ date: string; sales: number }>;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
}

export interface UploadLog {
  id: string;
  upload_type: string;
  source_file: string | null;
  row_count: number;
  status: string;
  created_at: string;
}
