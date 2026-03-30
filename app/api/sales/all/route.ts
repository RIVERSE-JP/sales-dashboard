import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10000'), 50000);

  const allRows: Record<string, unknown>[] = [];
  const batchSize = 1000;
  let offset = 0;

  while (allRows.length < limit) {
    const remaining = limit - allRows.length;
    const currentBatch = Math.min(batchSize, remaining);

    const { data, error } = await supabaseServer
      .from('daily_sales_v2')
      .select('*')
      .range(offset, offset + currentBatch - 1)
      .order('sale_date', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < currentBatch) break;
    offset += currentBatch;
  }

  return NextResponse.json(allRows);
}
