import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel');
  const months = parseInt(searchParams.get('months') ?? '6', 10);

  if (!channel) {
    return NextResponse.json({ error: 'channel parameter is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseServer
      .from('daily_sales')
      .select('sale_date, sales_amount, title_jp')
      .eq('channel', channel)
      .order('sale_date', { ascending: true });

    if (error) throw error;

    // Group by month
    const monthMap = new Map<string, { sales: number; dates: Set<string>; titles: Set<string> }>();
    for (const row of data ?? []) {
      const month = (row.sale_date as string).substring(0, 7);
      if (!monthMap.has(month)) {
        monthMap.set(month, { sales: 0, dates: new Set(), titles: new Set() });
      }
      const entry = monthMap.get(month)!;
      entry.sales += row.sales_amount as number;
      entry.dates.add(row.sale_date as string);
      entry.titles.add(row.title_jp as string);
    }

    const allMonths = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    const recentMonths = allMonths.slice(-months);

    const monthly_health = recentMonths.map(([month, entry]) => ({
      month,
      total_sales: entry.sales,
      active_titles: entry.titles.size,
      days_with_sales: entry.dates.size,
      daily_avg: entry.dates.size > 0 ? Math.round(entry.sales / entry.dates.size) : 0,
    }));

    return NextResponse.json({ monthly_health });
  } catch (err) {
    console.error('platform-health error:', err);
    return NextResponse.json({ monthly_health: [] });
  }
}
