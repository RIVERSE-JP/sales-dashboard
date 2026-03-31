import { config } from 'dotenv';
import * as path from 'node:path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(import.meta.dirname, '..', '.env.local') });
const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

function extractBase(title: string): string {
  return title
    .replace(/【分冊版】|【特装版】|【連載版】|【完全版】/g, '')
    .replace(/\[完全版\]|\[판면\/화별\]|\[판면\]/g, '')
    .replace(/（ノベル）|\(ノベル\)/g, '')
    .replace(/\[\d+권\]/g, '')
    .replace(/\s*（\d+）|\s*\(\d+\)/g, '')
    .replace(/\s*\d+$/, '')
    .replace(/～$/, '')
    .trim();
}

async function main() {
  // 장르 있는 작품 → base_title → genre_id, production_company_id
  const { data: allTitles } = await sb.from('titles').select('id, title_jp, genre_id, production_company_id');

  const baseGenre = new Map<string, number>();
  const baseCompany = new Map<string, number>();

  for (const t of allTitles ?? []) {
    const base = extractBase(t.title_jp);
    if (t.genre_id && !baseGenre.has(base)) baseGenre.set(base, t.genre_id);
    if (t.production_company_id && !baseCompany.has(base)) baseCompany.set(base, t.production_company_id);
  }

  console.log(`base_title 매핑: ${baseGenre.size} 장르, ${baseCompany.size} 제작사`);

  // 장르 없는 작품
  const noGenre = (allTitles ?? []).filter(t => !t.genre_id);
  console.log(`장르 없는 작품: ${noGenre.length}`);

  let fixed = 0;
  for (const t of noGenre) {
    const base = extractBase(t.title_jp);
    const gid = baseGenre.get(base);
    const cid = !t.production_company_id ? baseCompany.get(base) : undefined;

    if (gid || cid) {
      const updates: Record<string, number> = {};
      if (gid) updates.genre_id = gid;
      if (cid) updates.production_company_id = cid;

      const { error } = await sb.from('titles').update(updates).eq('id', t.id);
      if (!error) {
        fixed++;
        console.log(`  ✓ ${t.title_jp.slice(0, 35)} → base: ${base.slice(0, 20)}`);
      }
    }
  }

  console.log(`\n수정: ${fixed}/${noGenre.length}`);

  // 최종 현황
  const { count: withGenre } = await sb.from('titles').select('*', { count: 'exact', head: true }).not('genre_id', 'is', null);
  const { count: total } = await sb.from('titles').select('*', { count: 'exact', head: true });
  console.log(`최종: 장르 ${withGenre}/${total}`);
}

main().catch(console.error);
