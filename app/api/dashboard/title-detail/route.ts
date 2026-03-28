export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const titleJp = searchParams.get('title_jp');

  if (!titleJp) {
    return NextResponse.json({ error: 'title_jp parameter is required' }, { status: 400 });
  }

  const { data, error } = await supabaseServer.rpc('get_title_detail', {
    p_title_jp: titleJp,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
