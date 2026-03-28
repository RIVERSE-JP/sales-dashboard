import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const titleJp = searchParams.get('title_jp');

  if (!titleJp) {
    return NextResponse.json({ error: 'title_jp parameter is required' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('daily_sales_v2')
    .select('sale_date, sales_amount')
    .eq('title_jp', titleJp)
    .order('sale_date');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by sale_date and sum sales_amount
  const grouped = new Map<string, number>();
  for (const row of data ?? []) {
    const date = row.sale_date;
    grouped.set(date, (grouped.get(date) || 0) + (row.sales_amount || 0));
  }

  const result = Array.from(grouped.entries()).map(([sale_date, sales_amount]) => ({
    sale_date,
    sales_amount,
  }));

  return NextResponse.json(result);
}
