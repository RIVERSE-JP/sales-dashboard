-- 여러 data_source에서 같은 (title_jp, channel, sale_date) 매출이 중복 저장되는 문제 해결
-- weekly_report + sokuhochi_cmoa_excel 등이 겹칠 때 매출 2배 집계 방지
--
-- 전략: 중복 제거 VIEW를 만들어 모든 읽기 쿼리가 이 뷰를 참조
-- INSERT는 여전히 daily_sales_v2에 직접 (data_source별 구분 유지)

CREATE OR REPLACE VIEW daily_sales_deduped AS
SELECT title_jp, max(title_kr) as title_kr, channel_title_jp, channel, sale_date,
       max(sales_amount) AS sales_amount,
       max(sales_amount_gross) AS sales_amount_gross,
       bool_or(is_preliminary) AS is_preliminary
FROM daily_sales_v2
GROUP BY title_jp, channel_title_jp, channel, sale_date;

-- MV도 중복 제거 기반으로 재생성
DROP MATERIALIZED VIEW IF EXISTS mv_title_sales;
CREATE MATERIALIZED VIEW mv_title_sales AS
SELECT
  title_jp,
  max(title_kr) AS title_kr,
  array_agg(DISTINCT channel) AS channels,
  sum(deduped_sales)::bigint AS total_sales,
  count(DISTINCT sale_date) AS day_count,
  min(sale_date) AS first_date,
  max(sale_date) AS last_date
FROM (
  SELECT title_jp, title_kr, channel, sale_date,
         max(sales_amount) AS deduped_sales
  FROM daily_sales_v2
  GROUP BY title_jp, title_kr, channel, sale_date
) deduped
GROUP BY title_jp;

CREATE UNIQUE INDEX ON mv_title_sales (title_jp);
