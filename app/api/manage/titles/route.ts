export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => '\\' + ch);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const genre = searchParams.get('genre') || '';
  const company = searchParams.get('company') || '';
  const status = searchParams.get('status') || '';
  const format = searchParams.get('format') || '';
  const active = searchParams.get('active');
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortDir = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseServer
    .from('titles')
    .select(
      '*, genres(code, name_jp, name_kr), production_companies(name)',
      { count: 'exact' }
    );

  if (search) {
    query = query.or(`title_jp.ilike.%${escapeIlike(search)}%,title_kr.ilike.%${escapeIlike(search)}%`);
  }
  if (genre) query = query.eq('genre_id', genre);
  if (company) query = query.eq('production_company_id', company);
  if (status) query = query.eq('serial_status', status);
  if (format) query = query.eq('content_format', format);
  if (active === 'true') query = query.eq('is_active', true);
  if (active === 'false') query = query.eq('is_active', false);

  query = query.order(sortBy, { ascending: sortDir === 'asc' });
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data, count });
}

export async function POST(request: Request) {
  const body = await request.json();

  const { data, error } = await supabaseServer
    .from('titles')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseServer.from('audit_logs').insert({
    action: 'INSERT',
    table_name: 'titles',
    record_id: data.id,
    new_data: data,
  });

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { data: oldData } = await supabaseServer
    .from('titles')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabaseServer
    .from('titles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseServer.from('audit_logs').insert({
    action: 'UPDATE',
    table_name: 'titles',
    record_id: id,
    old_data: oldData,
    new_data: data,
  });

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const ids: string[] = body.ids || (body.id ? [body.id] : []);

  if (ids.length === 0) return NextResponse.json({ error: 'id or ids required' }, { status: 400 });

  const { data: oldRows } = await supabaseServer
    .from('titles')
    .select('*')
    .in('id', ids);

  const { error } = await supabaseServer
    .from('titles')
    .delete()
    .in('id', ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const row of oldRows || []) {
    await supabaseServer.from('audit_logs').insert({
      action: 'DELETE',
      table_name: 'titles',
      record_id: row.id,
      old_data: row,
    });
  }

  return NextResponse.json({ deleted: ids.length });
}
