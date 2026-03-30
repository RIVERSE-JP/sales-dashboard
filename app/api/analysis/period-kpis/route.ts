import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
  }

  const { data, error } = await supabaseServer.rpc('get_kpis_for_period', {
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
