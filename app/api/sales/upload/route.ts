import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * 채널명 정규화 맵 (서버 사이드)
 * DB에 저장되는 공식 channel 값으로 통일
 */
const CHANNEL_NORMALIZE: Record<string, string> = {
  'piccoma': 'Piccoma',
  'Piccoma': 'Piccoma',
  'PICCOMA': 'Piccoma',
  'ピッコマ': 'Piccoma',
  'mechacomic': 'Mechacomic',
  'Mechacomic': 'Mechacomic',
  'MECHACOMIC': 'Mechacomic',
  'めちゃコミック': 'Mechacomic',
  'めちゃコミ': 'Mechacomic',
  'cmoa': 'cmoa',
  'CMOA': 'cmoa',
  'Cmoa': 'cmoa',
  'コミックシーモア': 'cmoa',
  'renta': 'Renta',
  'Renta': 'Renta',
  'Renta!': 'Renta',
  'dmm': 'DMM',
  'DMM': 'DMM',
  'DMMブックス': 'DMM',
  'u-next': 'U-NEXT',
  'U-NEXT': 'U-NEXT',
  'LINEマンガ': 'LINEマンガ',
  'line_manga': 'LINEマンガ',
  'ebookjapan': 'ebookjapan',
  'DMM（FANZA）': 'DMM（FANZA）',
  'dmm_fanza': 'DMM（FANZA）',
  'まんが王国': 'まんが王国',
  'manga_oukoku': 'まんが王国',
};

function normalizeChannel(ch: string): string {
  return CHANNEL_NORMALIZE[ch] ?? ch;
}

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

  // 채널명 강제 정규화
  const normalizedRows = rows.map((row: Record<string, unknown>) => ({
    ...row,
    channel: normalizeChannel(String(row.channel || '')),
  }));

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
