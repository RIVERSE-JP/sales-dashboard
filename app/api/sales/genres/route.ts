import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const revalidate = 3600;

/**
 * GET /api/sales/genres
 * 장르 마스터 목록 조회 (매출 페이지용)
 * @returns Genre[] — 전체 장르 목록
 * @cache revalidate 3600초 (1시간)
 */
export async function GET() {
  const { data, error } = await supabaseServer
    .from('genres')
    .select('*');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
