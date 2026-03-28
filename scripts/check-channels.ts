import * as path from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(import.meta.dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

async function main() {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await sb.rpc('get_title_summaries');
  if (error) { console.error(error); process.exit(1); }

  const channelCounts = new Map<string, number>();
  for (const row of data as Record<string, unknown>[]) {
    for (const ch of row.channels) {
      channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);
    }
  }

  console.log('=== Distinct Channels ===');
  for (const [ch, cnt] of [...channelCounts.entries()].sort((a: [string, number], b: [string, number]) => b[1] - a[1])) {
    console.log(`  "${ch}": ${cnt} titles`);
  }
  console.log(`\nTotal channels: ${channelCounts.size}`);
  console.log(`Total titles: ${(data as Record<string, unknown>[]).length}`);
}
main();
