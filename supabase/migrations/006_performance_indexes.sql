-- ============================================================
-- Performance optimization indexes
-- Run in Supabase SQL Editor
-- ============================================================

-- KPI 쿼리 최적화: sale_date 범위 + sales_amount SUM
CREATE INDEX IF NOT EXISTS idx_dsv2_date_amount
  ON daily_sales_v2 (sale_date, sales_amount);

-- 플랫폼 요약 최적화: channel별 집계
CREATE INDEX IF NOT EXISTS idx_dsv2_channel_amount
  ON daily_sales_v2 (channel, sales_amount);

-- Top 작품 최적화: title_jp별 집계
CREATE INDEX IF NOT EXISTS idx_dsv2_title_amount
  ON daily_sales_v2 (title_jp, sales_amount);

-- 월별 추이 최적화: 날짜 범위 스캔
CREATE INDEX IF NOT EXISTS idx_dsv2_date_desc
  ON daily_sales_v2 (sale_date DESC);

-- Covering index for KPI (avoids heap lookups)
CREATE INDEX IF NOT EXISTS idx_dsv2_kpi_covering
  ON daily_sales_v2 (sale_date, channel, title_jp, sales_amount);
