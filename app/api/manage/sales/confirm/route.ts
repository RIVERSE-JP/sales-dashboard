export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const body = await request.json();
  const { ids } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('daily_sales_v2')
    .update({ is_preliminary: false })
    .in('id', ids)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseServer.from('audit_logs').insert({
    action: 'UPDATE',
    table_name: 'daily_sales_v2',
    record_id: `confirm_${ids.length}`,
    new_data: { confirmed_ids: ids, count: ids.length },
  });

  return NextResponse.json({ confirmed: data?.length || 0 });
}
