-- 세전 원본 금액 컬럼 추가
-- sales_amount = 세후 금액 (분석/표시용)
-- sales_amount_gross = 세전 원본 금액 (로우데이터 보존용, NULL이면 세전=세후)
ALTER TABLE daily_sales_v2 ADD COLUMN IF NOT EXISTS sales_amount_gross BIGINT;

-- upsert RPC 업데이트: sales_amount_gross 포함
CREATE OR REPLACE FUNCTION upsert_daily_sales(
  p_rows JSONB,
  p_source TEXT DEFAULT 'weekly_report',
  p_is_preliminary BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  v_inserted INT := 0;
  v_updated INT := 0;
BEGIN
  WITH upserted AS (
    INSERT INTO daily_sales_v2 (title_jp, title_kr, channel_title_jp, channel, sale_date, sales_amount, sales_amount_gross, data_source, is_preliminary)
    SELECT
      x->>'title_jp',
      x->>'title_kr',
      x->>'channel_title_jp',
      x->>'channel',
      (x->>'sale_date')::DATE,
      (x->>'sales_amount')::BIGINT,
      CASE WHEN x->>'sales_amount_gross' IS NOT NULL THEN (x->>'sales_amount_gross')::BIGINT ELSE NULL END,
      p_source,
      p_is_preliminary
    FROM jsonb_array_elements(p_rows) AS x
    ON CONFLICT (title_jp, channel, sale_date, data_source)
    DO UPDATE SET
      sales_amount = EXCLUDED.sales_amount,
      sales_amount_gross = COALESCE(EXCLUDED.sales_amount_gross, daily_sales_v2.sales_amount_gross),
      title_kr = COALESCE(EXCLUDED.title_kr, daily_sales_v2.title_kr),
      uploaded_at = now()
    RETURNING (xmax = 0) AS is_insert
  )
  SELECT
    COUNT(*) FILTER (WHERE is_insert),
    COUNT(*) FILTER (WHERE NOT is_insert)
  INTO v_inserted, v_updated
  FROM upserted;

  RETURN jsonb_build_object('inserted', v_inserted, 'updated', v_updated);
END;
$$ LANGUAGE plpgsql;
