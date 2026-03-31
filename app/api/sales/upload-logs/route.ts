import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sales/upload-logs
 * 최근 업로드 이력 조회 (최신순 20건)
 * @returns UploadLog[] — 업로드 로그 배열
 * @dynamic force-dynamic (캐시 없음)
 */
export async function GET() {
  const { data, error } = await supabaseServer
    .from('upload_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * POST /api/sales/upload-logs
 * 업로드 이력 기록
 * @body { upload_type, source_file, row_count, status } — 업로드 정보
 * @returns 생성된 업로드 로그 레코드
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { upload_type, source_file, row_count, status } = body;

  const { data, error } = await supabaseServer
    .from('upload_logs')
    .insert({ upload_type, source_file, row_count, status })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * DELETE /api/sales/upload-logs
 * 모든 업로드 이력 삭제
 * @returns { ok: true }
 */
export async function DELETE() {
  const { error } = await supabaseServer
    .from('upload_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
