import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => '\\' + ch);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
  const platform = searchParams.get('platform');
  const titleSearch = searchParams.get('titleSearch');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const sortBy = searchParams.get('sortBy') || 'sale_date';
  const sortDir = searchParams.get('sortDir') === 'asc';

  let query = supabaseServer
    .from('daily_sales_v2')
    .select('*', { count: 'exact' });

  if (platform) query = query.eq('channel', platform);
  if (titleSearch) query = query.ilike('title_jp', `%${escapeIlike(titleSearch)}%`);
  if (startDate) query = query.gte('sale_date', startDate);
  if (endDate) query = query.lte('sale_date', endDate);

  query = query.order(sortBy, { ascending: sortDir });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data, count });
}
