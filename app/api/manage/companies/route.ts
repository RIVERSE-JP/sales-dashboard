export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const { data, error } = await supabaseServer
    .from('production_companies')
    .select('*, title_master(count)')
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id,
    name: c.name,
    title_count: Array.isArray(c.title_master) ? ((c.title_master as Record<string, number>[])[0]?.count ?? 0) : 0,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === 'merge') {
    const { sourceId, targetId } = body;
    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'sourceId and targetId are required' }, { status: 400 });
    }

    const { error: updateError } = await supabaseServer
      .from('title_master')
      .update({ production_company_id: targetId })
      .eq('production_company_id', sourceId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    const { error: deleteError } = await supabaseServer
      .from('production_companies')
      .delete()
      .eq('id', sourceId);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  }

  const { data, error } = await supabaseServer
    .from('production_companies')
    .insert({ name: body.name })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { data, error } = await supabaseServer
    .from('production_companies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabaseServer
    .from('production_companies')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
