export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const revalidate = 300;

export async function GET() {
  // Try get_title_summaries first; fall back to get_top_titles(1000)
  const { data, error } = await supabaseServer.rpc('get_title_summaries');

  if (error) {
    // RPC doesn't exist — fall back
    const { data: fallback, error: fallbackError } = await supabaseServer.rpc('get_top_titles', {
      p_limit: 1000,
      p_month: null,
    });
    if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    return NextResponse.json(fallback);
  }

  return NextResponse.json(data);
}
