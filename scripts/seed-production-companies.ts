// ---------------------------------------------------------------------------
// seed-production-companies.ts — Populate production_companies table and
// update titles.production_company_id from Excel 制作会社 column
// Run: npx tsx scripts/seed-production-companies.ts
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
// Excel path — use the latest version
// ---------------------------------------------------------------------------
const EXCEL_PATHS = [
  '/Volumes/SSD_MacMini/CLINK_YANGIL_GoogleDrive/리버스 제팬/매출 분석 시스템/2026_3월 최신데이터/RIVERSE_統合コンテンツリスト.xlsx',
  '/Volumes/SSD_MacMini/WEBTOON Ranking/docs/RIVERSE_統合コンテンツリスト.xlsx',
];

function findExcelFile(): string {
  for (const p of EXCEL_PATHS) {
    try { fs.accessSync(p); return p; } catch { /* skip */ }
  }
  throw new Error('Excel file not found');
}

// ---------------------------------------------------------------------------
// Parse Excel
// ---------------------------------------------------------------------------
function parseExcel(filePath: string): Array<{ title_jp: string; company: string }> {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

  // Header row is index 1, data starts at 2
  // Col 2 = 作品名(JP), Col 5 = 制作会社
  const TITLE_COL = 2;
  const COMPANY_COL = 5;

  const results: Array<{ title_jp: string; company: string }> = [];

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[TITLE_COL]) continue;
    const title_jp = String(row[TITLE_COL]).trim();
    const company = row[COMPANY_COL] ? String(row[COMPANY_COL]).trim() : '';
    if (title_jp && company) {
      results.push({ title_jp, company });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------
async function main() {
  const filePath = findExcelFile();
  console.log('Reading Excel:', filePath);

  const titleCompanies = parseExcel(filePath);
  const uniqueCompanies = [...new Set(titleCompanies.map(t => t.company))].sort();

  console.log(`Found ${titleCompanies.length} titles with ${uniqueCompanies.length} unique companies`);
  console.log('Companies:', uniqueCompanies.join(', '));

  // Step 1: Upsert production_companies
  console.log('\n--- Step 1: Upsert production_companies ---');
  for (const name of uniqueCompanies) {
    const { error } = await supabase
      .from('production_companies')
      .upsert({ name }, { onConflict: 'name' });
    if (error) {
      console.error(`  Failed to upsert company "${name}":`, error.message);
    } else {
      console.log(`  ✓ ${name}`);
    }
  }

  // Step 2: Fetch production_companies to get id mapping
  const { data: companiesData, error: fetchErr } = await supabase
    .from('production_companies')
    .select('id, name');
  if (fetchErr) {
    console.error('Failed to fetch production_companies:', fetchErr.message);
    process.exit(1);
  }
  const companyMap = new Map<string, number>();
  for (const c of companiesData ?? []) {
    companyMap.set(c.name, c.id);
  }
  console.log(`\nLoaded ${companyMap.size} companies from DB`);

  // Step 3: Update titles.production_company_id
  console.log('\n--- Step 2: Update titles.production_company_id ---');
  let updated = 0;
  let notFound = 0;

  for (const { title_jp, company } of titleCompanies) {
    const companyId = companyMap.get(company);
    if (!companyId) {
      console.error(`  Company ID not found for "${company}"`);
      continue;
    }

    const { error, count } = await supabase
      .from('titles')
      .update({ production_company_id: companyId })
      .eq('title_jp', title_jp);

    if (error) {
      console.error(`  Failed to update "${title_jp}":`, error.message);
    } else if (count === 0) {
      notFound++;
    } else {
      updated++;
    }
  }

  console.log(`\nDone! Updated: ${updated}, Not found in titles table: ${notFound}`);

  // Step 4: Verify
  console.log('\n--- Verification ---');
  const { data: verifyData } = await supabase
    .from('titles')
    .select('title_jp, production_company_id')
    .not('production_company_id', 'is', null)
    .limit(10);
  console.log('Sample titles with production_company_id:');
  for (const t of verifyData ?? []) {
    const name = companyMap.size > 0
      ? [...companyMap.entries()].find(([, id]) => id === t.production_company_id)?.[0] ?? '?'
      : '?';
    console.log(`  ${t.title_jp} → ${name} (id: ${t.production_company_id})`);
  }

  const { count: totalWithCompany } = await supabase
    .from('titles')
    .select('*', { count: 'exact', head: true })
    .not('production_company_id', 'is', null);
  const { count: totalTitles } = await supabase
    .from('titles')
    .select('*', { count: 'exact', head: true });
  console.log(`\nTitles with company: ${totalWithCompany}/${totalTitles}`);
}

main().catch(console.error);
