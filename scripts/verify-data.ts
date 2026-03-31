import ExcelJS from 'exceljs';
import { config } from 'dotenv';
import * as path from 'node:path';
import { createClient } from '@supabase/supabase-js';

config({ path: path.resolve(import.meta.dirname, '..', '.env.local') });
const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const SHEET_CONFIG: Record<string, { titleCol: number; companyCol: number; genreCol: number }> = {
  '日本(タテヨミ)': { titleCol: 3, companyCol: 6, genreCol: 16 },
  '日本(版面)': { titleCol: 2, companyCol: 5, genreCol: 14 },
  '日本(タテヨミ)準備作品': { titleCol: 3, companyCol: 7, genreCol: 10 },
  '日本(版面)準備作品': { titleCol: 3, companyCol: 6, genreCol: 12 },
};

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('/Volumes/SSD_MacMini/CLINK_YANGIL_GoogleDrive/리버스 제팬/매출 분석 시스템/2026_3월 최신데이터/RIVERSE_統合コンテンツリスト.xlsx');

  interface ExcelTitle { title_jp: string; genre: string; company: string; sheet: string; }
  const excelTitles: ExcelTitle[] = [];

  for (const [sheetName, cols] of Object.entries(SHEET_CONFIG)) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) continue;
    ws.eachRow((row, rowNum) => {
      if (rowNum <= 2) return;
      let titleVal = row.getCell(cols.titleCol).value;
      if (titleVal && typeof titleVal === 'object' && 'richText' in (titleVal as object)) {
        titleVal = ((titleVal as { richText: { text: string }[] }).richText || []).map(r => r.text).join('');
      }
      const title = String(titleVal || '').trim();
      if (!title || title === '作品名(JP)' || title === 'JPタイトル(仮)') return;
      const genre = String(row.getCell(cols.genreCol).value || '').trim();
      const company = String(row.getCell(cols.companyCol).value || '').trim();
      excelTitles.push({ title_jp: title, genre, company, sheet: sheetName });
    });
  }

  console.log('Excel 총 작품:', excelTitles.length);
  console.log('Excel 장르 있음:', excelTitles.filter(t => t.genre && t.genre !== '-').length);
  console.log('Excel 제작사 있음:', excelTitles.filter(t => t.company && t.company !== '-').length);

  // DB
  const { data: dbTitles } = await sb.from('titles').select('title_jp, genre_id, production_company_id, genres(name_jp, name_kr), production_companies(name)');
  console.log('\nDB 총 작품:', (dbTitles ?? []).length);

  const dbMap = new Map<string, Record<string, unknown>>();
  for (const d of dbTitles ?? []) dbMap.set(d.title_jp, d as Record<string, unknown>);

  let genreOK = 0, genreFail = 0, companyOK = 0, companyFail = 0;
  const genreErrors: string[] = [];
  const companyErrors: string[] = [];

  for (const et of excelTitles) {
    const db = dbMap.get(et.title_jp);
    if (!db) continue;

    const dbGenre = db.genres as Record<string, string> | null;
    const dbGenreName = dbGenre?.name_jp || '';
    const dbCompany = db.production_companies as Record<string, string> | null;
    const dbCompanyName = dbCompany?.name || '';

    if (et.genre && et.genre !== '-' && et.genre !== 'ジャンル') {
      if (dbGenreName === et.genre) genreOK++;
      else {
        genreFail++;
        if (genreErrors.length < 10) genreErrors.push(`${et.title_jp.slice(0, 25)} → Excel:${et.genre} DB:${dbGenreName || '(없음)'} [${et.sheet}]`);
      }
    }

    if (et.company && et.company !== '-') {
      if (dbCompanyName === et.company) companyOK++;
      else {
        companyFail++;
        if (companyErrors.length < 10) companyErrors.push(`${et.title_jp.slice(0, 25)} → Excel:${et.company} DB:${dbCompanyName || '(없음)'} [${et.sheet}]`);
      }
    }
  }

  console.log('\n=== 장르 ===');
  console.log(`정확: ${genreOK}, 오류: ${genreFail}`);
  if (genreErrors.length > 0) {
    console.log('오류 샘플:');
    genreErrors.forEach(e => console.log('  ' + e));
  }

  console.log('\n=== 제작사 ===');
  console.log(`정확: ${companyOK}, 오류: ${companyFail}`);
  if (companyErrors.length > 0) {
    console.log('오류 샘플:');
    companyErrors.forEach(e => console.log('  ' + e));
  }

  // DB에만 있고 Excel에 없는 작품
  const excelSet = new Set(excelTitles.map(t => t.title_jp));
  const dbOnly = (dbTitles ?? []).filter(d => !excelSet.has(d.title_jp));
  console.log('\n=== DB에만 있는 작품 (Excel에 없음):', dbOnly.length, '===');
  for (const d of dbOnly.slice(0, 5)) console.log('  ' + d.title_jp.slice(0, 30));
}

main().catch(console.error);
