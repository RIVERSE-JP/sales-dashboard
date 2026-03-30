import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { extractBaseTitle, extractProductType } from '@/lib/supabase';

export const revalidate = 300;

/**
 * GET /api/sales/title-summaries
 * 작품별 매출 요약 조회 (get_title_summaries RPC, 실패 시 get_top_titles 폴백)
 * @returns TitleSummaryRow[] — { title_jp, title_kr, channels, first_date, total_sales, day_count, base_title, product_type }
 * @cache revalidate 300초 (5분)
 */
export async function GET() {
  // Try get_title_summaries first; fall back to get_top_titles(1000)
  const { data, error } = await supabaseServer.rpc('get_title_summaries');

  if (error) {
    // RPC doesn't exist — fall back
    const { data: fallback, error: fallbackError } = await supabaseServer.rpc('get_top_titles', {
      p_limit: 1000,
      p_month: null,
    });
    if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    return NextResponse.json(enrichWithBaseTitle(fallback));
  }

  return NextResponse.json(enrichWithBaseTitle(data));
}

/** 응답에 base_title, product_type 필드 추가 */
function enrichWithBaseTitle(rows: Array<Record<string, unknown>> | null) {
  if (!rows) return [];
  return rows.map(row => ({
    ...row,
    base_title: extractBaseTitle(String(row.title_jp ?? '')),
    product_type: extractProductType(String(row.title_jp ?? '')),
  }));
}
