import { createClient } from '@supabase/supabase-js';

async function main() {
  const sb = createClient(
    'https://irpyoubomgqcpftesldz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlycHlvdWJvbWdxY3BmdGVzbGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDkxNjIsImV4cCI6MjA4ODA4NTE2Mn0.7wUmMOiVFqDcNQogoTWXNTqUs7mViu1DcFj6YJ4LXTA'
  );

  const { data, error } = await sb.rpc('get_title_summaries');
  if (error) { console.error(error); process.exit(1); }

  const channelCounts = new Map<string, number>();
  for (const row of data as any[]) {
    for (const ch of row.channels) {
      channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);
    }
  }

  console.log('=== Distinct Channels ===');
  for (const [ch, cnt] of [...channelCounts.entries()].sort((a: [string, number], b: [string, number]) => b[1] - a[1])) {
    console.log(`  "${ch}": ${cnt} titles`);
  }
  console.log(`\nTotal channels: ${channelCounts.size}`);
  console.log(`Total titles: ${(data as any[]).length}`);
}
main();
