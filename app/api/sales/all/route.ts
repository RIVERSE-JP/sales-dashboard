import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const allRows: Record<string, unknown>[] = [];
  const batchSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseServer
      .from('daily_sales_v2')
      .select('*')
      .range(offset, offset + batchSize - 1)
      .order('sale_date', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < batchSize) break;
    offset += batchSize;
  }

  return NextResponse.json(allRows);
}
