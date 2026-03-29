-- 005_crud_and_audit.sql
-- CRUD 관리 기능을 위한 감사 로그 테이블 및 RLS 정책 추가

-- ============================================================
-- 1. audit_logs 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  user_info TEXT DEFAULT 'anonymous',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read" ON audit_logs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert" ON audit_logs FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- 2. DELETE 정책 추가
-- ============================================================
CREATE POLICY "anon_delete" ON titles FOR DELETE TO anon USING (true);
CREATE POLICY "anon_delete" ON platforms FOR DELETE TO anon USING (true);
CREATE POLICY "anon_delete" ON genres FOR DELETE TO anon USING (true);
CREATE POLICY "anon_delete" ON production_companies FOR DELETE TO anon USING (true);
CREATE POLICY "anon_delete" ON initial_sales FOR DELETE TO anon USING (true);
CREATE POLICY "anon_delete" ON title_platform_availability FOR DELETE TO anon USING (true);

-- ============================================================
-- 3. INSERT/UPDATE 정책 추가 (누락된 것들)
-- ============================================================
CREATE POLICY "anon_insert" ON genres FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON genres FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_update" ON platforms FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_insert" ON platforms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update" ON production_companies FOR UPDATE TO anon USING (true);
