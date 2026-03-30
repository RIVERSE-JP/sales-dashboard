import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sales/upload
 * 매출 데이터 업로드 (upsert_daily_sales RPC 사용, 500건씩 배치 처리)
 * @body { rows: object[], source?: string, isPreliminary?: boolean } — 매출 행 배열
 * @returns UpsertResult — { inserted, updated }
 * @dynamic force-dynamic (캐시 없음)
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { rows, source, isPreliminary } = body;

  if (!rows || !Array.isArray(rows)) {
    return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
  }

  let totalInserted = 0;
  let totalUpdated = 0;
  const batchSize = 500;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { data, error } = await supabaseServer.rpc('upsert_daily_sales', {
      p_rows: batch,
      p_source: source || 'manual',
      p_is_preliminary: isPreliminary ?? false,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message, processedSoFar: { inserted: totalInserted, updated: totalUpdated } },
        { status: 500 },
      );
    }

    if (data) {
      totalInserted += data.inserted || 0;
      totalUpdated += data.updated || 0;
    }
  }

  return NextResponse.json({ inserted: totalInserted, updated: totalUpdated });
}
