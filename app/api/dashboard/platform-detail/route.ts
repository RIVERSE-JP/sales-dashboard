import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/platform-detail?channel=X&start=YYYY-MM-DD&end=YYYY-MM-DD
 * 특정 플랫폼 상세 정보 조회 (기간 필터 지원)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  if (!channel) {
    return NextResponse.json({ error: 'channel parameter is required' }, { status: 400 });
  }

  const params: Record<string, unknown> = { p_channel: channel };
  if (start) params.p_start_date = start;
  if (end) params.p_end_date = end;

  const { data, error } = await supabaseServer.rpc('get_platform_detail', params);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
