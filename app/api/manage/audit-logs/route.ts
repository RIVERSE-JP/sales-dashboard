export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const action = searchParams.get('action') || '';
  const tableName = searchParams.get('table') || '';

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseServer
    .from('audit_logs')
    .select('*', { count: 'exact' });

  if (action) query = query.eq('action', action);
  if (tableName) query = query.eq('table_name', tableName);

  query = query.order('created_at', { ascending: false });
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data, count });
}
