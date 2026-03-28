-- ============================================================
-- Analysis RPC Functions
-- ============================================================

-- 1. get_genre_sales_summary — 장르별 매출
CREATE OR REPLACE FUNCTION get_genre_sales_summary(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (genre_code TEXT, genre_kr TEXT, total_sales BIGINT, title_count BIGINT, avg_daily BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT g.code, g.name_kr, SUM(d.sales_amount)::BIGINT, COUNT(DISTINCT d.title_jp),
    (SUM(d.sales_amount) / GREATEST(COUNT(DISTINCT d.sale_date),1))::BIGINT
  FROM daily_sales_v2 d
  JOIN titles t ON d.title_jp = t.title_jp
  JOIN genres g ON t.genre_id = g.id
  WHERE (p_start_date IS NULL OR d.sale_date >= p_start_date)
    AND (p_end_date IS NULL OR d.sale_date <= p_end_date)
  GROUP BY g.code, g.name_kr
  ORDER BY SUM(d.sales_amount) DESC;
END;
$$ LANGUAGE plpgsql;

-- 2. get_company_sales_summary — 제작사별 매출
CREATE OR REPLACE FUNCTION get_company_sales_summary(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (company_name TEXT, total_sales BIGINT, title_count BIGINT, avg_daily BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT pc.name, SUM(d.sales_amount)::BIGINT, COUNT(DISTINCT d.title_jp),
    (SUM(d.sales_amount) / GREATEST(COUNT(DISTINCT d.sale_date),1))::BIGINT
  FROM daily_sales_v2 d
  JOIN titles t ON d.title_jp = t.title_jp
  JOIN production_companies pc ON t.production_company_id = pc.id
  WHERE (p_start_date IS NULL OR d.sale_date >= p_start_date)
    AND (p_end_date IS NULL OR d.sale_date <= p_end_date)
  GROUP BY pc.name
  ORDER BY SUM(d.sales_amount) DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. get_format_sales_summary — 콘텐츠 포맷별 매출
CREATE OR REPLACE FUNCTION get_format_sales_summary(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (content_format TEXT, total_sales BIGINT, title_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.content_format, SUM(d.sales_amount)::BIGINT, COUNT(DISTINCT d.title_jp)
  FROM daily_sales_v2 d
  JOIN titles t ON d.title_jp = t.title_jp
  WHERE (p_start_date IS NULL OR d.sale_date >= p_start_date)
    AND (p_end_date IS NULL OR d.sale_date <= p_end_date)
  GROUP BY t.content_format
  ORDER BY SUM(d.sales_amount) DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. get_daily_sales_trend — 일별 매출 추이
CREATE OR REPLACE FUNCTION get_daily_sales_trend(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (day TEXT, total_sales BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT d.sale_date::TEXT, SUM(d.sales_amount)::BIGINT
  FROM daily_sales_v2 d
  WHERE (p_start_date IS NULL OR d.sale_date >= p_start_date)
    AND (p_end_date IS NULL OR d.sale_date <= p_end_date)
  GROUP BY d.sale_date
  ORDER BY d.sale_date;
END;
$$ LANGUAGE plpgsql;

-- 5. get_weekly_sales_trend — 주별 매출 추이
CREATE OR REPLACE FUNCTION get_weekly_sales_trend(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (week TEXT, total_sales BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT to_char(date_trunc('week', d.sale_date), 'YYYY-MM-DD'), SUM(d.sales_amount)::BIGINT
  FROM daily_sales_v2 d
  WHERE (p_start_date IS NULL OR d.sale_date >= p_start_date)
    AND (p_end_date IS NULL OR d.sale_date <= p_end_date)
  GROUP BY date_trunc('week', d.sale_date)
  ORDER BY date_trunc('week', d.sale_date);
END;
$$ LANGUAGE plpgsql;

-- 6. get_platform_genre_matrix — 플랫폼×장르 크로스
CREATE OR REPLACE FUNCTION get_platform_genre_matrix(p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS TABLE (channel TEXT, genre_kr TEXT, total_sales BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT d.channel, COALESCE(g.name_kr, '미분류'), SUM(d.sales_amount)::BIGINT
  FROM daily_sales_v2 d
  LEFT JOIN titles t ON d.title_jp = t.title_jp
  LEFT JOIN genres g ON t.genre_id = g.id
  WHERE (p_start_date IS NULL OR d.sale_date >= p_start_date)
    AND (p_end_date IS NULL OR d.sale_date <= p_end_date)
  GROUP BY d.channel, g.name_kr
  ORDER BY SUM(d.sales_amount) DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. get_kpis_for_period — 특정 기간 KPI
CREATE OR REPLACE FUNCTION get_kpis_for_period(p_start_date DATE, p_end_date DATE)
RETURNS JSONB AS $$
DECLARE
  v_total BIGINT;
  v_active_titles INT;
  v_active_platforms INT;
BEGIN
  SELECT COALESCE(SUM(sales_amount),0), COUNT(DISTINCT title_jp), COUNT(DISTINCT channel)
  INTO v_total, v_active_titles, v_active_platforms
  FROM daily_sales_v2
  WHERE sale_date >= p_start_date AND sale_date <= p_end_date;

  RETURN jsonb_build_object(
    'total_sales', v_total,
    'active_titles', v_active_titles,
    'active_platforms', v_active_platforms
  );
END;
$$ LANGUAGE plpgsql;

-- 8. get_title_rankings — 작품 순위 변동
CREATE OR REPLACE FUNCTION get_title_rankings(p_current_start DATE, p_current_end DATE, p_prev_start DATE, p_prev_end DATE, p_limit INT DEFAULT 50)
RETURNS TABLE (title_jp TEXT, title_kr TEXT, channels TEXT[], current_sales BIGINT, prev_sales BIGINT, rank_change INT) AS $$
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT d.title_jp, MAX(d.title_kr) as title_kr, ARRAY_AGG(DISTINCT d.channel) as channels, SUM(d.sales_amount)::BIGINT as sales,
      ROW_NUMBER() OVER (ORDER BY SUM(d.sales_amount) DESC)::INT as rk
    FROM daily_sales_v2 d WHERE d.sale_date >= p_current_start AND d.sale_date <= p_current_end
    GROUP BY d.title_jp
  ),
  prev_period AS (
    SELECT d.title_jp, SUM(d.sales_amount)::BIGINT as sales,
      ROW_NUMBER() OVER (ORDER BY SUM(d.sales_amount) DESC)::INT as rk
    FROM daily_sales_v2 d WHERE d.sale_date >= p_prev_start AND d.sale_date <= p_prev_end
    GROUP BY d.title_jp
  )
  SELECT c.title_jp, c.title_kr, c.channels, c.sales, COALESCE(p.sales, 0)::BIGINT,
    (COALESCE(p.rk, p_limit+1) - c.rk)::INT
  FROM current_period c
  LEFT JOIN prev_period p ON c.title_jp = p.title_jp
  ORDER BY c.sales DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 9. get_platform_health — 플랫폼 건강도
CREATE OR REPLACE FUNCTION get_platform_health(p_channel TEXT, p_months INT DEFAULT 6)
RETURNS JSONB AS $$
DECLARE
  v_monthly JSONB;
  v_active_titles_trend JSONB;
BEGIN
  SELECT jsonb_agg(row_to_json(t)) INTO v_monthly FROM (
    SELECT to_char(date_trunc('month', sale_date), 'YYYY-MM') as month,
      SUM(sales_amount)::BIGINT as total_sales,
      COUNT(DISTINCT title_jp)::INT as active_titles,
      (SUM(sales_amount) / GREATEST(COUNT(DISTINCT sale_date),1))::BIGINT as daily_avg
    FROM daily_sales_v2
    WHERE channel = p_channel AND sale_date >= CURRENT_DATE - (p_months || ' months')::INTERVAL
    GROUP BY date_trunc('month', sale_date)
    ORDER BY date_trunc('month', sale_date)
  ) t;

  RETURN jsonb_build_object('monthly_health', COALESCE(v_monthly, '[]'::jsonb));
END;
$$ LANGUAGE plpgsql;
