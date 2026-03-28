import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');
  const genre = searchParams.get('genre');
  const launchType = searchParams.get('launchType');

  let query = supabaseServer.from('initial_sales').select('*');

  if (platform) query = query.eq('platform', platform);
  if (genre) query = query.eq('genre', genre);
  if (launchType) query = query.eq('launch_type', launchType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
