-- ============================================================
-- RPC Functions for Dashboard v2
-- Solves: Supabase 1000-row client limit, slow client-side aggregation
-- ============================================================

-- 1. Dashboard Summary KPIs
CREATE OR REPLACE FUNCTION get_dashboard_kpis()
RETURNS JSONB AS $$
DECLARE
  v_total BIGINT;
  v_this_month BIGINT;
  v_last_month BIGINT;
  v_active_titles INT;
  v_active_platforms INT;
  v_mom_change NUMERIC;
BEGIN
  SELECT COALESCE(SUM(sales_amount), 0) INTO v_total FROM daily_sales_v2;

  SELECT COALESCE(SUM(sales_amount), 0) INTO v_this_month
  FROM daily_sales_v2
  WHERE sale_date >= date_trunc('month', CURRENT_DATE);

  SELECT COALESCE(SUM(sales_amount), 0) INTO v_last_month
  FROM daily_sales_v2
  WHERE sale_date >= date_trunc('month', CURRENT_DATE - interval '1 month')
    AND sale_date < date_trunc('month', CURRENT_DATE);

  IF v_last_month > 0 THEN
    v_mom_change := ((v_this_month::NUMERIC - v_last_month) / v_last_month * 100);
  ELSE
    v_mom_change := 0;
  END IF;

  SELECT COUNT(DISTINCT title_jp) INTO v_active_titles FROM daily_sales_v2;
  SELECT COUNT(DISTINCT channel) INTO v_active_platforms FROM daily_sales_v2;

  RETURN jsonb_build_object(
    'total_sales', v_total,
    'this_month_sales', v_this_month,
    'last_month_sales', v_last_month,
    'mom_change', ROUND(v_mom_change, 1),
    'active_titles', v_active_titles,
    'active_platforms', v_active_platforms
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Monthly Sales Trend (all months)
CREATE OR REPLACE FUNCTION get_monthly_sales_trend()
RETURNS TABLE (
  month TEXT,
  total_sales BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_char(date_trunc('month', sale_date), 'YYYY-MM') AS month,
    SUM(sales_amount)::BIGINT AS total_sales
  FROM daily_sales_v2
  GROUP BY date_trunc('month', sale_date)
  ORDER BY date_trunc('month', sale_date);
END;
$$ LANGUAGE plpgsql;

-- 3. Platform Sales Summary
CREATE OR REPLACE FUNCTION get_platform_sales_summary()
RETURNS TABLE (
  channel TEXT,
  total_sales BIGINT,
  title_count BIGINT,
  avg_daily BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.channel,
    SUM(d.sales_amount)::BIGINT AS total_sales,
    COUNT(DISTINCT d.title_jp) AS title_count,
    (SUM(d.sales_amount) / GREATEST(COUNT(DISTINCT d.sale_date), 1))::BIGINT AS avg_daily
  FROM daily_sales_v2 d
  GROUP BY d.channel
  ORDER BY total_sales DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Top Titles by Sales (with optional month filter)
CREATE OR REPLACE FUNCTION get_top_titles(
  p_limit INT DEFAULT 20,
  p_month TEXT DEFAULT NULL
)
RETURNS TABLE (
  title_jp TEXT,
  title_kr TEXT,
  channels TEXT[],
  total_sales BIGINT,
  day_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.title_jp,
    MAX(d.title_kr) AS title_kr,
    ARRAY_AGG(DISTINCT d.channel) AS channels,
    SUM(d.sales_amount)::BIGINT AS total_sales,
    COUNT(DISTINCT d.sale_date) AS day_count
  FROM daily_sales_v2 d
  WHERE (p_month IS NULL OR to_char(d.sale_date, 'YYYY-MM') = p_month)
  GROUP BY d.title_jp
  ORDER BY total_sales DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 5. Platform Detail (for Platform Analysis page)
CREATE OR REPLACE FUNCTION get_platform_detail(p_channel TEXT)
RETURNS JSONB AS $$
DECLARE
  v_total BIGINT;
  v_title_count INT;
  v_daily_avg BIGINT;
  v_monthly JSONB;
  v_top_titles JSONB;
BEGIN
  SELECT COALESCE(SUM(sales_amount), 0), COUNT(DISTINCT title_jp)
  INTO v_total, v_title_count
  FROM daily_sales_v2 WHERE channel = p_channel;

  SELECT COALESCE(SUM(sales_amount) / GREATEST(COUNT(DISTINCT sale_date), 1), 0)
  INTO v_daily_avg
  FROM daily_sales_v2 WHERE channel = p_channel;

  SELECT jsonb_agg(row_to_json(t)) INTO v_monthly
  FROM (
    SELECT to_char(date_trunc('month', sale_date), 'YYYY-MM') AS month,
           SUM(sales_amount)::BIGINT AS sales
    FROM daily_sales_v2
    WHERE channel = p_channel
    GROUP BY date_trunc('month', sale_date)
    ORDER BY date_trunc('month', sale_date)
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_top_titles
  FROM (
    SELECT title_jp, MAX(title_kr) AS title_kr, SUM(sales_amount)::BIGINT AS total_sales
    FROM daily_sales_v2
    WHERE channel = p_channel
    GROUP BY title_jp
    ORDER BY total_sales DESC
    LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'total_sales', v_total,
    'title_count', v_title_count,
    'daily_avg', v_daily_avg,
    'monthly_trend', COALESCE(v_monthly, '[]'::jsonb),
    'top_titles', COALESCE(v_top_titles, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Title Detail (for Title Analysis page)
CREATE OR REPLACE FUNCTION get_title_detail(p_title_jp TEXT)
RETURNS JSONB AS $$
DECLARE
  v_total BIGINT;
  v_monthly JSONB;
  v_by_platform JSONB;
  v_daily_recent JSONB;
BEGIN
  SELECT COALESCE(SUM(sales_amount), 0) INTO v_total
  FROM daily_sales_v2 WHERE title_jp = p_title_jp;

  SELECT jsonb_agg(row_to_json(t)) INTO v_monthly
  FROM (
    SELECT to_char(date_trunc('month', sale_date), 'YYYY-MM') AS month,
           SUM(sales_amount)::BIGINT AS sales
    FROM daily_sales_v2
    WHERE title_jp = p_title_jp
    GROUP BY date_trunc('month', sale_date)
    ORDER BY date_trunc('month', sale_date)
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_by_platform
  FROM (
    SELECT channel, SUM(sales_amount)::BIGINT AS sales
    FROM daily_sales_v2
    WHERE title_jp = p_title_jp
    GROUP BY channel
    ORDER BY sales DESC
  ) t;

  SELECT jsonb_agg(row_to_json(t)) INTO v_daily_recent
  FROM (
    SELECT sale_date::TEXT AS date, SUM(sales_amount)::BIGINT AS sales
    FROM daily_sales_v2
    WHERE title_jp = p_title_jp AND sale_date >= CURRENT_DATE - 90
    GROUP BY sale_date
    ORDER BY sale_date
  ) t;

  RETURN jsonb_build_object(
    'total_sales', v_total,
    'title_kr', (SELECT MAX(title_kr) FROM daily_sales_v2 WHERE title_jp = p_title_jp),
    'channels', (SELECT ARRAY_AGG(DISTINCT channel) FROM daily_sales_v2 WHERE title_jp = p_title_jp),
    'monthly_trend', COALESCE(v_monthly, '[]'::jsonb),
    'platform_breakdown', COALESCE(v_by_platform, '[]'::jsonb),
    'daily_recent', COALESCE(v_daily_recent, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Growth/Decline Alerts
CREATE OR REPLACE FUNCTION get_growth_alerts()
RETURNS TABLE (
  title_jp TEXT,
  title_kr TEXT,
  this_month BIGINT,
  last_month BIGINT,
  growth_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly AS (
    SELECT
      d.title_jp,
      MAX(d.title_kr) AS title_kr,
      SUM(CASE WHEN d.sale_date >= date_trunc('month', CURRENT_DATE) THEN d.sales_amount ELSE 0 END) AS this_month,
      SUM(CASE WHEN d.sale_date >= date_trunc('month', CURRENT_DATE - interval '1 month')
                AND d.sale_date < date_trunc('month', CURRENT_DATE) THEN d.sales_amount ELSE 0 END) AS last_month
    FROM daily_sales_v2 d
    GROUP BY d.title_jp
    HAVING SUM(CASE WHEN d.sale_date >= date_trunc('month', CURRENT_DATE - interval '1 month')
                     AND d.sale_date < date_trunc('month', CURRENT_DATE) THEN d.sales_amount ELSE 0 END) > 0
  )
  SELECT
    monthly.title_jp,
    monthly.title_kr,
    monthly.this_month,
    monthly.last_month,
    ROUND(((monthly.this_month::NUMERIC - monthly.last_month) / monthly.last_month * 100), 1) AS growth_pct
  FROM monthly
  ORDER BY growth_pct ASC
  LIMIT 30;
END;
$$ LANGUAGE plpgsql;
