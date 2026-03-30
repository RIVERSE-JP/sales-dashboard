import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  const { data, error } = await supabaseServer.rpc('get_weekly_sales_trend', {
    p_start_date: startDate ?? null,
    p_end_date: endDate ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
