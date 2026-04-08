-- 누계 매출 메타데이터(2020~) 업로드 지원
-- CHECK 제약에 'ruikei_metadata' 값을 추가하여 INSERT 실패를 방지

ALTER TABLE daily_sales_v2 DROP CONSTRAINT IF EXISTS daily_sales_v2_data_source_check;
ALTER TABLE daily_sales_v2 ADD CONSTRAINT daily_sales_v2_data_source_check
  CHECK (data_source IN (
    'weekly_report', 'sokuhochi', 'manual',
    'sokuhochi_app', 'sokuhochi_sp', 'sokuhochi_app_kan', 'sokuhochi_sp_kan',
    'sokuhochi_kpi', 'sokuhochi_cmoa', 'sokuhochi_cmoa_excel',
    'ruikei_metadata'
  ));
