import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const revalidate = 300;

/**
 * GET /api/dashboard/platform-detail
 * 특정 플랫폼 상세 정보 조회 (총매출, 작품 수, 일평균, 월별 추이, 상위 작품)
 * @param channel — 플랫폼 채널명 (필수)
 * @returns PlatformDetailData — { total_sales, title_count, daily_avg, monthly_trend, top_titles }
 * @cache revalidate 300초 (5분)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel');

  if (!channel) {
    return NextResponse.json({ error: 'channel parameter is required' }, { status: 400 });
  }

  const { data, error } = await supabaseServer.rpc('get_platform_detail', {
    p_channel: channel,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
