-- Renta, ebookjapan, LINE Manga 속보치 파일 지원
-- data_source CHECK 제약에 신규 값 추가

ALTER TABLE daily_sales_v2 DROP CONSTRAINT IF EXISTS daily_sales_v2_data_source_check;
ALTER TABLE daily_sales_v2 ADD CONSTRAINT daily_sales_v2_data_source_check
  CHECK (data_source IN (
    'weekly_report', 'sokuhochi', 'manual',
    'sokuhochi_app', 'sokuhochi_sp', 'sokuhochi_app_kan', 'sokuhochi_sp_kan',
    'sokuhochi_kpi', 'sokuhochi_cmoa', 'sokuhochi_cmoa_excel',
    'ruikei_metadata',
    'sokuhochi_renta', 'sokuhochi_ebj', 'sokuhochi_line'
  ));
