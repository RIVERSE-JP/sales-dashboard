import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const revalidate = 300;

/**
 * GET /api/sales/title-master
 * 활성 작품 마스터 목록 조회 (제작사명 포함, is_active=true)
 * @returns TitleMasterRow[] — 활성 작품 목록
 * @cache revalidate 300초 (5분)
 */
export async function GET() {
  const { data, error } = await supabaseServer
    .from('titles')
    .select('*, production_companies(name)')
    .eq('is_active', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
