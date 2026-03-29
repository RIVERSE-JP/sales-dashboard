export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function PUT(request: Request) {
  const body = await request.json();
  const { ids, updates } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
  }
  if (!updates || Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'updates object is required' }, { status: 400 });
  }

  const { data: oldRows } = await supabaseServer
    .from('titles')
    .select('*')
    .in('id', ids);

  const { data, error } = await supabaseServer
    .from('titles')
    .update(updates)
    .in('id', ids)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const row of oldRows || []) {
    const newRow = data?.find((d: Record<string, unknown>) => d.id === row.id);
    await supabaseServer.from('audit_logs').insert({
      action: 'UPDATE',
      table_name: 'titles',
      record_id: row.id,
      old_data: row,
      new_data: newRow,
    });
  }

  return NextResponse.json({ updated: data?.length || 0 });
}
