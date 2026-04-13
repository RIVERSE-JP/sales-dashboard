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
  const { rows, source, isPreliminary, isLastBatch = true, skipPostProcess = false, isFirstBatch = true } = body;

  if (!rows || !Array.isArray(rows)) {
    return NextResponse.json({ error: 'rows array is required' }, { status: 400 });
  }

  // title_master 로드 (title_kr 매칭 + 신규 작품 등록용)
  const { data: masterData } = await supabaseServer.from('titles').select('title_jp, title_kr, genre_id, production_company_id, content_format');
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

  // 누적형 데이터 소스(cmoa Excel 등): 첫 번째 배치에서만 기존 데이터 삭제
  const cumulativeSources = ['sokuhochi_cmoa_excel', 'sokuhochi_cmoa'];
  if (cumulativeSources.includes(source) && isFirstBatch) {
    // 업로드 데이터의 날짜 범위 파악
    const dates = normalizedRows
      .map((r: Record<string, unknown>) => String(r.sale_date || ''))
      .filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
    if (dates.length > 0) {
      const minDate = dates[0];
      const maxDate = dates[dates.length - 1];
      const channel = normalizedRows[0]?.channel ? String(normalizedRows[0].channel) : '';
      if (channel) {
        await supabaseServer
          .from('daily_sales_v2')
          .delete()
          .eq('channel', channel)
          .eq('data_source', source)
          .gte('sale_date', minDate)
          .lte('sale_date', maxDate);
      }
    }
  }

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

  // 후처리(신규 작품 등록 + MV 갱신)는 마지막 배치 또는 단일 배치에서만 수행
  if (isLastBatch && !skipPostProcess) {
    // 신규 작품 자동 등록
    try {
      const uploadedTitles = [...new Set(normalizedRows.map((r: Record<string, unknown>) => String(r.title_jp)))];
      const existingSet = new Set((masterData ?? []).map((m: { title_jp: string }) => m.title_jp));
      const newTitles = uploadedTitles.filter(t => !existingSet.has(t));

      if (newTitles.length > 0) {
        const { extractBaseTitle } = await import('@/lib/supabase');
        const { toCore } = await import('@/utils/titleMatcher');
        const originByBase = new Map<string, { genre_id: number | null; production_company_id: number | null; content_format: string }>();
        const originByCore = new Map<string, { genre_id: number | null; production_company_id: number | null; content_format: string }>();
        (masterData ?? []).forEach((m: Record<string, unknown>) => {
          const info = { genre_id: (m.genre_id as number | null) ?? null, production_company_id: (m.production_company_id as number | null) ?? null, content_format: String(m.content_format || 'WEBTOON') };
          const b = extractBaseTitle(String(m.title_jp));
          if (!originByBase.has(b)) originByBase.set(b, info);
          const c = toCore(String(m.title_jp));
          if (c && !originByCore.has(c)) originByCore.set(c, info);
        });

        for (const titleJp of newTitles) {
          const origin = originByBase.get(extractBaseTitle(titleJp)) || originByCore.get(toCore(titleJp));
          const titleKr = matchTitleKr(titleJp, maps);
          await supabaseServer.from('titles').insert({
            title_jp: titleJp,
            title_kr: titleKr || null,
            genre_id: origin?.genre_id || null,
            production_company_id: origin?.production_company_id || null,
            content_format: origin?.content_format || 'WEBTOON',
            is_active: true,
          }).then(() => {});
        }
      }
    } catch { /* 무시 */ }

    // Materialized View 갱신
    try {
      await supabaseServer.rpc('refresh_materialized_views');
    } catch { /* 무시 */ }
  }

  return NextResponse.json({ inserted: totalInserted, updated: totalUpdated });
}
