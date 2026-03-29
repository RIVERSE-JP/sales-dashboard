// ---------------------------------------------------------------------------
// seed-genres.ts — Populate genres table and update titles.genre_id
// from Excel ジャンル column (Col 15)
// Run: npx tsx scripts/seed-genres.ts
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

config({ path: path.resolve(import.meta.dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------------
// Excel path
// ---------------------------------------------------------------------------
const EXCEL_PATH =
  '/Volumes/SSD_MacMini/CLINK_YANGIL_GoogleDrive/리버스 제팬/매출 분석 시스템/2026_3월 최신데이터/RIVERSE_統合コンテンツリスト.xlsx';

// ---------------------------------------------------------------------------
// Genre mapping: Excel ジャンル → genres.name_jp (slug)
// ---------------------------------------------------------------------------
const GENRE_CODE_MAP: Record<string, string> = {
  'アクション': 'action',
  'ファンタジー': 'fantasy',
  'ファンタジーSF': 'fantasy_sf',
  '恋愛': 'romance',
  'BL': 'bl',
  'ドラマ': 'drama',
  '女性マンガ': 'womens_manga',
  '少年マンガ': 'shonen',
  '少女マンガ': 'shojo',
  'TL': 'tl',
  'ミステリー・ホラー': 'mystery_horror',
  'スポーツ': 'sports',
  '武侠': 'martial_arts',
  '現代ロマンス': 'modern_romance',
  '異世界': 'isekai',
  '成人/青年': 'adult',
  'バトル・アクション': 'battle_action',
  '青年マンガ': 'seinen',
};

// Skip these values — they are not real genres
const SKIP_GENRES = new Set(['-', 'ジャンル']);

// ---------------------------------------------------------------------------
// Parse Excel
// ---------------------------------------------------------------------------
function parseExcel(filePath: string): Array<{ title_jp: string; genre_jp: string }> {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

  // Row 0 = header, data starts at row 1
  // Col 2 = 作品名(JP), Col 15 = ジャンル
  const TITLE_COL = 2;
  const GENRE_COL = 15;

  const results: Array<{ title_jp: string; genre_jp: string }> = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[TITLE_COL]) continue;
    const title_jp = String(row[TITLE_COL]).trim();
    const genre_jp = row[GENRE_COL] ? String(row[GENRE_COL]).trim() : '';
    if (title_jp && genre_jp && !SKIP_GENRES.has(genre_jp)) {
      results.push({ title_jp, genre_jp });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('Excel file not found:', EXCEL_PATH);
    process.exit(1);
  }

  console.log('Reading Excel:', EXCEL_PATH);
  const titleGenres = parseExcel(EXCEL_PATH);
  const uniqueGenres = [...new Set(titleGenres.map(t => t.genre_jp))].sort();

  console.log(`Found ${titleGenres.length} titles with ${uniqueGenres.length} unique genres`);
  console.log('Genres:', uniqueGenres.join(', '));

  // Step 1: Ensure all genres exist in genres table
  console.log('\n--- Step 1: Upsert genres ---');
  // Fetch existing genres first
  const { data: existingGenres } = await supabase.from('genres').select('id, name_jp, code');
  const existingByName = new Map((existingGenres ?? []).map(g => [g.name_jp, g]));

  for (const genreName of uniqueGenres) {
    const code = GENRE_CODE_MAP[genreName];
    if (!code) {
      console.warn(`  SKIP unknown genre: "${genreName}" — add it to GENRE_CODE_MAP`);
      continue;
    }
    if (existingByName.has(genreName)) {
      console.log(`  EXISTS ${genreName} (${code})`);
      continue;
    }
    // Insert new genre
    const { error } = await supabase
      .from('genres')
      .insert({ name_jp: genreName, code });
    if (error) {
      console.error(`  Failed to insert genre "${genreName}":`, error.message);
    } else {
      console.log(`  INSERTED ${genreName} (${code})`);
    }
  }

  // Step 2: Fetch genres to get id mapping
  const { data: genresData, error: fetchErr } = await supabase
    .from('genres')
    .select('id, name_jp');
  if (fetchErr) {
    console.error('Failed to fetch genres:', fetchErr.message);
    process.exit(1);
  }
  const genreMap = new Map<string, number>();
  for (const g of genresData ?? []) {
    genreMap.set(g.name_jp, g.id);
  }
  console.log(`\nLoaded ${genreMap.size} genres from DB`);

  // Step 3: Update titles.genre_id
  console.log('\n--- Step 2: Update titles.genre_id ---');
  let updated = 0;
  let notFound = 0;
  let failed = 0;

  for (const { title_jp, genre_jp } of titleGenres) {
    const genreId = genreMap.get(genre_jp);
    if (!genreId) {
      console.error(`  Genre ID not found for "${genre_jp}"`);
      failed++;
      continue;
    }

    const { error, count } = await supabase
      .from('titles')
      .update({ genre_id: genreId })
      .eq('title_jp', title_jp);

    if (error) {
      console.error(`  Failed to update "${title_jp}":`, error.message);
      failed++;
    } else if (count === 0) {
      notFound++;
    } else {
      updated++;
    }
  }

  console.log(`\nDone! Updated: ${updated}, Not found in titles: ${notFound}, Failed: ${failed}`);

  // Step 4: Verify
  console.log('\n--- Verification ---');
  const { count: totalWithGenre } = await supabase
    .from('titles')
    .select('*', { count: 'exact', head: true })
    .not('genre_id', 'is', null);
  const { count: totalTitles } = await supabase
    .from('titles')
    .select('*', { count: 'exact', head: true });
  console.log(`Titles with genre_id: ${totalWithGenre}/${totalTitles}`);

  const { data: sampleData } = await supabase
    .from('titles')
    .select('title_jp, genre_id')
    .not('genre_id', 'is', null)
    .limit(10);
  console.log('\nSample titles with genre_id:');
  for (const t of sampleData ?? []) {
    const name = [...genreMap.entries()].find(([, id]) => id === t.genre_id)?.[0] ?? '?';
    console.log(`  ${t.title_jp} → ${name} (id: ${t.genre_id})`);
  }
}

main().catch(console.error);
