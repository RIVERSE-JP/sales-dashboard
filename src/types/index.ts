// ============================================================
// Core domain types for RVJP Sales Dashboard v2
// ============================================================

export interface Platform {
  id: number;
  code: string;
  name_jp: string;
  name_kr: string | null;
  name_en: string | null;
  color: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Genre {
  id: number;
  code: string;
  name_jp: string;
  name_kr: string | null;
}

export interface Title {
  id: string;
  title_jp: string;
  title_kr: string | null;
  channel_title_jp: string | null;
  series_name: string | null;
  content_format: 'WEBTOON' | 'PAGETOON' | 'NOVEL';
  content_type: 'WT' | 'EP' | 'EB' | 'UNKNOWN' | null;
  management_type: string | null;
  illustrator: string | null;
  original_author: string | null;
  genre_id: number | null;
  serial_status: '\u9023\u8F09\u4E2D' | '\u5B8C\u7D50' | '\u4F11\u8F09\u4E2D' | '\u672A\u9023\u8F09' | null;
  latest_episode_count: number | null;
  service_launch_date: string | null;
  is_active: boolean;
  sheet_category: string | null;
}

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

export type TimeGranularity = 'daily' | 'weekly' | 'monthly';
export type CurrencyCode = 'JPY' | 'KRW';

export interface SalesAggregation {
  period: string;
  total_sales: number;
  platform_breakdown: Record<string, number>;
}

export interface UploadLog {
  id: string;
  upload_type: string;
  source_file: string | null;
  row_count: number;
  status: string;
  created_at: string;
}
