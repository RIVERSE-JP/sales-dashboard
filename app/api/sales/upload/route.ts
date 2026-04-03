import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { normalizeChannel } from '@/utils/platformConfig';
import { buildTitleKrMaps, matchTitleKr } from '@/utils/titleMatcher';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sales/upload
 * 매출 데이터 업로드 (upsert_daily_sales RPC 사용, 500건씩 배치 처리)
 * 채널명을 서버 사이드에서 강제 정규화하여 중복 방지
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { rows, source, isPreliminary } = body;

  if (!rows || !Array.isArray(rows)) {
    return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
  }

  // title_master에서 title_kr 매핑 로드
  const { data: masterData } = await supabaseServer.from('titles').select('title_jp, title_kr');
  const maps = buildTitleKrMaps(masterData ?? []);

  // 채널명 정규화 + title_kr 자동 매칭
  const normalizedRows = rows.map((row: Record<string, unknown>) => {
    const titleJp = String(row.title_jp || '');
    const existingKr = row.title_kr ? String(row.title_kr) : '';
    const matchedKr = existingKr || matchTitleKr(titleJp, maps);
    return {
      ...row,
      channel: normalizeChannel(String(row.channel || '')),
      title_kr: matchedKr,
    };
  });

  let totalInserted = 0;
  let totalUpdated = 0;
  const batchSize = 500;

  for (let i = 0; i < normalizedRows.length; i += batchSize) {
    const batch = normalizedRows.slice(i, i + batchSize);
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

  // 업로드 후 Materialized View 갱신
  try {
    await supabaseServer.rpc('refresh_materialized_views');
  } catch {
    // MV 갱신 실패해도 업로드 결과는 반환
  }

  return NextResponse.json({ inserted: totalInserted, updated: totalUpdated });
}
