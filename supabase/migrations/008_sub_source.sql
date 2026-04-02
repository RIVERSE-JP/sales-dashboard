-- data_source를 파일 종류별로 세분화하여 속보치 파일간 충돌 방지
-- 기존: sokuhochi (모든 속보치 파일이 같은 키 → 덮어쓰기)
-- 변경: sokuhochi_app, sokuhochi_sp 등 세분화 → 서로 다른 파일은 공존

-- 1. CHECK 제약 삭제 후 재생성 (허용 값 확장)
ALTER TABLE daily_sales_v2 DROP CONSTRAINT IF EXISTS daily_sales_v2_data_source_check;
ALTER TABLE daily_sales_v2 ADD CONSTRAINT daily_sales_v2_data_source_check
  CHECK (data_source IN (
    'weekly_report', 'sokuhochi', 'manual',
    'sokuhochi_app', 'sokuhochi_sp', 'sokuhochi_app_kan', 'sokuhochi_sp_kan',
    'sokuhochi_kpi', 'sokuhochi_cmoa', 'sokuhochi_cmoa_excel'
  ));

-- 2. upsert RPC 업데이트 (기존과 동일, CHECK 확장만으로 동작)
-- unique 키: (title_jp, channel, sale_date, data_source)
-- 같은 파일 종류 → 같은 data_source → 덮어쓰기 (중복 방지)
-- 다른 파일 종류 → 다른 data_source → 공존 (합산)
