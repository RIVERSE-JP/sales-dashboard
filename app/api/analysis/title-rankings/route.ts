export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const currentStart = searchParams.get('currentStart');
  const currentEnd = searchParams.get('currentEnd');
  const prevStart = searchParams.get('prevStart');
  const prevEnd = searchParams.get('prevEnd');
  const limit = searchParams.get('limit');

  if (!currentStart || !currentEnd || !prevStart || !prevEnd) {
    return NextResponse.json({ error: 'currentStart, currentEnd, prevStart, prevEnd are required' }, { status: 400 });
  }

  const { data, error } = await supabaseServer.rpc('get_title_rankings', {
    p_current_start: currentStart,
    p_current_end: currentEnd,
    p_prev_start: prevStart,
    p_prev_end: prevEnd,
    p_limit: limit ? parseInt(limit, 10) : 50,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
