/**
 * One-time script to seed existing JSON data into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-supabase.ts
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const dataDir = resolve(__dirname, '../public/data');

const BATCH_SIZE = 1000;

async function seed() {
  console.log('Starting Supabase seed...');

  // 1. Create dataset record
  const { data: ds, error: dsErr } = await supabase
    .from('datasets')
    .insert({ name: 'initial-seed', row_count: 0, is_active: true })
    .select('id')
    .single();

  if (dsErr || !ds) {
    console.error('Failed to create dataset:', dsErr?.message);
    process.exit(1);
  }
  const dsId = ds.id;
  console.log(`Created dataset: ${dsId}`);

  // 2. daily_sales (large, batch insert)
  const daily = JSON.parse(readFileSync(`${dataDir}/daily_sales.json`, 'utf-8'));
  console.log(`Inserting daily_sales: ${daily.length} rows...`);
  for (let i = 0; i < daily.length; i += BATCH_SIZE) {
    const batch = daily.slice(i, i + BATCH_SIZE).map((r: Record<string, unknown>) => ({
      title_kr: r.titleKR,
      title_jp: r.titleJP,
      channel: r.channel,
      date: r.date,
      sales: r.sales,
      dataset_id: dsId,
    }));
    const { error } = await supabase.from('daily_sales').insert(batch);
    if (error) {
      console.error(`daily_sales batch ${i} error:`, error.message);
      process.exit(1);
    }
    console.log(`  daily_sales: ${Math.min(i + BATCH_SIZE, daily.length)} / ${daily.length}`);
  }

  // 3. monthly_summary
  const monthly = JSON.parse(readFileSync(`${dataDir}/monthly_summary.json`, 'utf-8'));
  console.log(`Inserting monthly_summary: ${monthly.length} rows...`);
  const { error: monthlyErr } = await supabase.from('monthly_summary').insert(
    monthly.map((r: Record<string, unknown>) => ({
      month: r.month,
      total_sales: r.totalSales,
      platforms: r.platforms,
      dataset_id: dsId,
    })),
  );
  if (monthlyErr) { console.error('monthly_summary error:', monthlyErr.message); process.exit(1); }

  // 4. title_summary
  const titles = JSON.parse(readFileSync(`${dataDir}/title_summary.json`, 'utf-8'));
  console.log(`Inserting title_summary: ${titles.length} rows...`);
  const { error: titleErr } = await supabase.from('title_summary').insert(
    titles.map((r: Record<string, unknown>) => ({
      title_kr: r.titleKR,
      title_jp: r.titleJP,
      series_name: r.seriesName,
      total_sales: r.totalSales,
      platforms: r.platforms,
      daily_avg: r.dailyAvg,
      peak_date: r.peakDate,
      peak_sales: r.peakSales,
      first_date: r.firstDate,
      last_date: r.lastDate,
      monthly_trend: r.monthlyTrend,
      dataset_id: dsId,
    })),
  );
  if (titleErr) { console.error('title_summary error:', titleErr.message); process.exit(1); }

  // 5. platform_summary
  const platforms = JSON.parse(readFileSync(`${dataDir}/platform_summary.json`, 'utf-8'));
  console.log(`Inserting platform_summary: ${platforms.length} rows...`);
  const { error: platErr } = await supabase.from('platform_summary').insert(
    platforms.map((r: Record<string, unknown>) => ({
      platform: r.platform,
      total_sales: r.totalSales,
      title_count: r.titleCount,
      monthly_trend: r.monthlyTrend,
      top_titles: r.topTitles,
      dataset_id: dsId,
    })),
  );
  if (platErr) { console.error('platform_summary error:', platErr.message); process.exit(1); }

  // 6. title_master
  const master = JSON.parse(readFileSync(`${dataDir}/title_master.json`, 'utf-8'));
  console.log(`Inserting title_master: ${master.length} rows...`);
  const { error: masterErr } = await supabase.from('title_master').insert(
    master.map((r: Record<string, unknown>) => ({
      title_kr: r.titleKR,
      title_jp: r.titleJP,
      series_name: r.seriesName,
      platforms: r.platforms,
      dataset_id: dsId,
    })),
  );
  if (masterErr) { console.error('title_master error:', masterErr.message); process.exit(1); }

  // Update row count
  await supabase
    .from('datasets')
    .update({ row_count: daily.length })
    .eq('id', dsId);

  console.log(`\nSeed complete! Dataset ${dsId} with ${daily.length} daily_sales rows.`);
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
