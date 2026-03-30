import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const p_limit = parseInt(searchParams.get('limit') || '20', 10);
  const p_month = searchParams.get('month') || undefined;

  const { data, error } = await supabaseServer.rpc('get_top_titles', {
    p_limit,
    p_month: p_month ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
