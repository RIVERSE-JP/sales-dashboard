import ExcelJS from 'exceljs';
import { config } from 'dotenv';
import * as path from 'node:path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(import.meta.dirname, '..', '.env.local') });
const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('/Volumes/SSD_MacMini/CLINK_YANGIL_GoogleDrive/리버스 제팬/매출 분석 시스템/2026_3월 최신데이터/RIVERSE_統合コンテンツリスト.xlsx');

  // Excel: title_jp → genre_jp
  const excelGenres = new Map<string, string>();
  for (const sheetName of ['日本(タテヨミ)', '日本(版面)', '日本(タテヨミ)準備作品', '日本(版面)準備作品']) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) continue;
    ws.eachRow((row, rowNum) => {
      if (rowNum <= 1) return;
      const title = String(row.getCell(3).value || '').trim();
      const genre = String(row.getCell(16).value || '').trim();
      if (title && genre && genre !== '-' && genre !== 'ジャンル') {
        excelGenres.set(title, genre);
      }
    });
  }
  console.log('Excel 장르 매핑:', excelGenres.size);

  // DB 장르
  const { data: genres } = await sb.from('genres').select('id, name_jp');
  const genreMap = new Map<string, number>();
  for (const g of genres ?? []) genreMap.set(g.name_jp, g.id);

  // 장르 없는 작품
  const { data: noGenre } = await sb.from('titles').select('id, title_jp').is('genre_id', null);
  console.log('장르 없는 작품:', (noGenre ?? []).length);

  let matched = 0;
  for (const t of noGenre ?? []) {
    let genreJp = excelGenres.get(t.title_jp);

    // base_title로 매칭
    if (!genreJp) {
      const base = t.title_jp
        .replace(/【分冊版】|【特装版】|【連載版】|【完全版】/g, '')
        .replace(/\[完全版\]|\[판면\/화별\]/g, '')
        .replace(/（ノベル）|\(ノベル\)/g, '')
        .replace(/\s*[\d]+$/, '')
        .replace(/（\d+）|\(\d+\)/g, '')
        .trim();
      genreJp = excelGenres.get(base);

      // prefix 매칭 (8글자 이상)
      if (!genreJp && base.length >= 4) {
        for (const [k, v] of excelGenres) {
          if (k.startsWith(base.slice(0, Math.min(base.length, 10)))) {
            genreJp = v;
            break;
          }
        }
      }
    }

    if (genreJp) {
      const gid = genreMap.get(genreJp);
      if (gid) {
        const { error } = await sb.from('titles').update({ genre_id: gid }).eq('id', t.id);
        if (!error) {
          matched++;
          console.log(`  ✓ ${t.title_jp.slice(0, 30)} → ${genreJp}`);
        }
      }
    }
  }
  console.log(`\n매칭: ${matched}/${(noGenre ?? []).length}`);

  const { count } = await sb.from('titles').select('*', { count: 'exact', head: true }).not('genre_id', 'is', null);
  const { count: total } = await sb.from('titles').select('*', { count: 'exact', head: true });
  console.log(`최종: 장르 ${count}/${total}`);
}

main().catch(console.error);
