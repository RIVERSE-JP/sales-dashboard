export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { data: oldData } = await supabaseServer
    .from('daily_sales_v2')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await supabaseServer
    .from('daily_sales_v2')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseServer.from('audit_logs').insert({
    action: 'UPDATE',
    table_name: 'daily_sales_v2',
    record_id: String(id),
    old_data: oldData,
    new_data: data,
  });

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const ids: number[] = body.ids || (body.id ? [body.id] : []);

  if (ids.length === 0) return NextResponse.json({ error: 'id or ids required' }, { status: 400 });

  const { data: oldRows } = await supabaseServer
    .from('daily_sales_v2')
    .select('*')
    .in('id', ids);

  const { error } = await supabaseServer
    .from('daily_sales_v2')
    .delete()
    .in('id', ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const row of oldRows || []) {
    await supabaseServer.from('audit_logs').insert({
      action: 'DELETE',
      table_name: 'daily_sales_v2',
      record_id: String(row.id),
      old_data: row,
    });
  }

  return NextResponse.json({ deleted: ids.length });
}
