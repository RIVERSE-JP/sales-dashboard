export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const revalidate = 3600;

export async function GET() {
  const { data, error } = await supabaseServer
    .from('platforms')
    .select('*')
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
