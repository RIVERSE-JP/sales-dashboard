-- ============================================================
-- Add DELETE policies for upload_logs and daily_sales_v2
-- ============================================================

-- upload_logs: anon 사용자가 삭제 가능
CREATE POLICY "anon_delete" ON upload_logs FOR DELETE TO anon USING (true);

-- daily_sales_v2: anon 사용자가 삭제 가능 (데이터 정리용)
CREATE POLICY "anon_delete" ON daily_sales_v2 FOR DELETE TO anon USING (true);
