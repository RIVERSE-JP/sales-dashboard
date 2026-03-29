export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseServer
    .from('title_platform_availability')
    .select('*, platforms(code, name_jp, name_kr)')
    .eq('title_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { platform_id, launch_date } = body;

  if (!platform_id) return NextResponse.json({ error: 'platform_id is required' }, { status: 400 });

  const { data, error } = await supabaseServer
    .from('title_platform_availability')
    .insert({ title_id: id, platform_id, launch_date: launch_date || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseServer.from('audit_logs').insert({
    action: 'INSERT',
    table_name: 'title_platform_availability',
    record_id: `${id}_${platform_id}`,
    new_data: data,
  });

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { platform_id } = body;

  if (!platform_id) return NextResponse.json({ error: 'platform_id is required' }, { status: 400 });

  const { data: oldData } = await supabaseServer
    .from('title_platform_availability')
    .select('*')
    .eq('title_id', id)
    .eq('platform_id', platform_id)
    .single();

  const { error } = await supabaseServer
    .from('title_platform_availability')
    .delete()
    .eq('title_id', id)
    .eq('platform_id', platform_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseServer.from('audit_logs').insert({
    action: 'DELETE',
    table_name: 'title_platform_availability',
    record_id: `${id}_${platform_id}`,
    old_data: oldData,
  });

  return NextResponse.json({ deleted: 1 });
}
