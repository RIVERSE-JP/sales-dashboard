import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 * 헬스체크 + Supabase 연결 유지 (콜드 스타트 방지)
 * Vercel Cron 또는 외부 모니터링에서 5분마다 호출
 */
export async function GET() {
  try {
    const start = Date.now();
    const { error } = await supabaseServer.from('platforms').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      return NextResponse.json({ status: 'error', error: error.message, latency }, { status: 500 });
    }

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 });
  }
}
