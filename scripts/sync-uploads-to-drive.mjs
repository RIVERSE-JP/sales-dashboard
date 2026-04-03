// Supabase Storage → Google Drive 동기화 스크립트
// 업로드된 원본 파일을 Google Drive 싱크 폴더로 복사합니다.
// 사용법: node scripts/sync-uploads-to-drive.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://irpyoubomgqcpftesldz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlycHlvdWJvbWdxY3BmdGVzbGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDkxNjIsImV4cCI6MjA4ODA4NTE2Mn0.7wUmMOiVFqDcNQogoTWXNTqUs7mViu1DcFj6YJ4LXTA';

const DRIVE_DIR = '/Volumes/SSD_MacMini/CLINK_YANGIL_GoogleDrive/리버스 제팬/매출 분석 시스템/업로드 원본 보관';
const BUCKET = 'upload-debug';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sync() {
  console.log(`[${new Date().toISOString()}] 동기화 시작...`);

  const { data: files, error } = await sb.storage.from(BUCKET).list('uploads', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error) {
    console.error('Storage 조회 실패:', error.message);
    return;
  }

  if (!files || files.length === 0) {
    console.log('새 파일 없음');
    return;
  }

  if (!fs.existsSync(DRIVE_DIR)) {
    fs.mkdirSync(DRIVE_DIR, { recursive: true });
  }
  const existing = new Set(fs.readdirSync(DRIVE_DIR));

  let downloaded = 0;
  for (const file of files) {
    if (file.name === '.emptyFolderPlaceholder' || file.name === 'test') continue;
    if (existing.has(file.name)) continue;

    const { data, error: dlError } = await sb.storage.from(BUCKET).download(`uploads/${file.name}`);
    if (dlError || !data) {
      console.error(`다운로드 실패: ${file.name}`, dlError?.message);
      continue;
    }

    const filePath = path.join(DRIVE_DIR, file.name);
    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    downloaded++;
    console.log(`저장: ${file.name} (${(buffer.length / 1024).toFixed(1)}KB)`);
  }

  console.log(`완료: ${downloaded}개 새 파일 저장, Storage 전체 ${files.length}개`);
}

sync().catch(console.error);
