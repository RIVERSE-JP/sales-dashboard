// ---------------------------------------------------------------------------
// seed-v2.ts — Migrate Excel data into the new Supabase schema
// Run: npx tsx scripts/seed-v2.ts
// ---------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

config({ path: path.resolve(import.meta.dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------------
// File paths
// ---------------------------------------------------------------------------

const WEEKLY_REPORT_PATH =
  '/Volumes/SSD_MacMini/CLINK_YANGIL_GoogleDrive/리버스 제팬/매출 분석 시스템/2026_3월 최신데이터/[RVJP-RVKR] Weekly Report.xlsx';

const INITIAL_SALES_PATH =
  '/Volumes/SSD_MacMini/CLINK_YANGIL_GoogleDrive/리버스 제팬/매출 분석 시스템/2026_3월 최신데이터/[리버스]일본PF 초동매출 현황 (1).xlsx';

const DAILY_SALES_BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert Excel serial date number or JS Date to YYYY-MM-DD string */
function excelDateToString(value: unknown): string | null {
  if (value == null || value === '') return null;

  // Already a Date object (xlsx may return this)
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Excel serial number (days since 1900-01-00)
  if (typeof value === 'number' && value > 10000) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // String dates: "YY.MM.DD", "YYYY.MM.DD", "YYYY-MM-DD"
  const s = String(value).trim();

  const m2 = s.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (m2) {
    const yr = Number(m2[1]) >= 50 ? 1900 + Number(m2[1]) : 2000 + Number(m2[1]);
    return `${yr}-${m2[2]}-${m2[3]}`;
  }

  const m4 = s.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (m4) return `${m4[1]}-${m4[2]}-${m4[3]}`;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  return null;
}

/** Safely extract a number from a cell */
function toNum(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function log(msg: string) {
  console.log(`[seed-v2] ${msg}`);
}

function logError(msg: string) {
  console.error(`[seed-v2] ERROR: ${msg}`);
}

// ---------------------------------------------------------------------------
// Part 1: Weekly Report → daily_sales_v2
// ---------------------------------------------------------------------------

interface DailyRawRow {
  title_jp: string;
  title_kr: string | null;
  channel_title_jp: string | null;
  channel: string;
  sale_date: string;
  sales_amount: number;
}

function parseDailyRawSheet(wb: XLSX.WorkBook): DailyRawRow[] {
  const ws = wb.Sheets['Daily_raw'];
  if (!ws) {
    throw new Error('Sheet "Daily_raw" not found in Weekly Report');
  }

  // header: 1 = array-of-arrays, with row 0 = Excel row 1
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];

  // Headers are in row index 1 (Excel row 2), data starts at row index 2 (Excel row 3)
  const dataRows = rows.slice(2);
  const results: DailyRawRow[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row) continue;

    const excelRowNum = i + 3; // for logging (1-indexed, offset by header rows)

    // Column mapping: A=Title(JP), B=Title(KR), C=Channel Title(JP), D=Channel, E=Date, F=Sales
    const titleJP = String(row[0] ?? '').trim();
    if (!titleJP) {
      // Empty title = likely blank row, skip silently
      continue;
    }

    let channel = String(row[3] ?? '').trim();
    if (!channel) {
      skipped.push({ row: excelRowNum, reason: 'empty channel' });
      continue;
    }
    // 채널명 정규화 (대소문자 통일)
    const CHANNEL_NORMALIZE: Record<string, string> = {
      'piccoma': 'Piccoma',
      'cmoa': 'CMOA',
      'mechacomic': 'Mechacomic',
      'renta': 'Renta',
      'dmm': 'DMM',
      'u-next': 'U-NEXT',
      'ebookjapan': 'ebookjapan',
    };
    channel = CHANNEL_NORMALIZE[channel.toLowerCase()] ?? CHANNEL_NORMALIZE[channel] ?? channel;

    const dateStr = excelDateToString(row[4]);
    if (!dateStr) {
      skipped.push({ row: excelRowNum, reason: `invalid date: ${row[4]}` });
      continue;
    }

    const salesAmount = toNum(row[5]);

    results.push({
      title_jp: titleJP,
      title_kr: String(row[1] ?? '').trim() || null,
      channel_title_jp: String(row[2] ?? '').trim() || null,
      channel,
      sale_date: dateStr,
      sales_amount: Math.round(salesAmount),
    });
  }

  if (skipped.length > 0) {
    log(`Daily_raw: skipped ${skipped.length} rows:`);
    for (const s of skipped.slice(0, 20)) {
      log(`  Row ${s.row}: ${s.reason}`);
    }
    if (skipped.length > 20) {
      log(`  ... and ${skipped.length - 20} more`);
    }
  }

  return results;
}

async function seedDailySales(): Promise<void> {
  log('=== Part 1: Weekly Report → daily_sales_v2 ===');

  if (!fs.existsSync(WEEKLY_REPORT_PATH)) {
    logError(`File not found: ${WEEKLY_REPORT_PATH}`);
    return;
  }

  log(`Reading: ${path.basename(WEEKLY_REPORT_PATH)}`);
  const buf = fs.readFileSync(WEEKLY_REPORT_PATH);
  const wb = XLSX.read(buf, { type: 'buffer' });

  log(`Sheets: ${wb.SheetNames.join(', ')}`);

  const rawRows = parseDailyRawSheet(wb);
  log(`Parsed ${rawRows.length} valid rows from Daily_raw`);

  // 같은 배치 내 중복 키 제거 (마지막 값 유지)
  const deduped = new Map<string, typeof rawRows[0]>();
  for (const row of rawRows) {
    const key = `${row.title_jp}|${row.channel}|${row.sale_date}`;
    deduped.set(key, row);
  }
  const rows = Array.from(deduped.values());
  log(`After dedup: ${rows.length} unique rows (${rawRows.length - rows.length} duplicates removed)`);

  if (rows.length === 0) {
    log('No rows to insert. Skipping.');
    return;
  }

  // Insert in batches using the upsert_daily_sales RPC function
  let totalInserted = 0;
  let totalUpdated = 0;
  const totalBatches = Math.ceil(rows.length / DAILY_SALES_BATCH_SIZE);

  for (let i = 0; i < rows.length; i += DAILY_SALES_BATCH_SIZE) {
    const batch = rows.slice(i, i + DAILY_SALES_BATCH_SIZE);
    const batchNum = Math.floor(i / DAILY_SALES_BATCH_SIZE) + 1;

    const { data, error } = await supabase.rpc('upsert_daily_sales', {
      p_rows: batch,
      p_source: 'weekly_report',
      p_is_preliminary: false,
    });

    if (error) {
      logError(`Batch ${batchNum}/${totalBatches} failed: ${error.message}`);
      // Continue with next batch rather than failing entirely
      continue;
    }

    const result = data as { inserted: number; updated: number } | null;
    if (result) {
      totalInserted += result.inserted;
      totalUpdated += result.updated;
    }

    process.stdout.write(
      `\r  Batch ${batchNum}/${totalBatches} (${Math.min(i + DAILY_SALES_BATCH_SIZE, rows.length)} of ${rows.length} rows)`,
    );
  }

  console.log(''); // newline after progress
  log(`Daily sales complete: ${totalInserted} inserted, ${totalUpdated} updated`);
}

// ---------------------------------------------------------------------------
// Part 2: 초동매출 → initial_sales
// ---------------------------------------------------------------------------

/** Platform name from 초동매출 sheet → platform_code in our DB */
const PLATFORM_CODE_MAP: Record<string, string> = {
  '픽코마': 'piccoma',
  '메챠코믹': 'mechacomic',
  '코믹시모아': 'cmoa',
  '라인망가(LDF)': 'line_manga',
  '라인망가(NW)': 'line_manga',
  '코미코': 'comico',
  '레진': 'lezhin',
  'EBJ': 'ebookjapan',
  '벨툰': 'belltoon',
};

interface InitialSalesRow {
  title_kr: string;
  platform_code: string;
  genre_kr: string | null;
  pf_genre: string | null;
  launch_type: string;
  launch_date: string;
  launch_episodes: number;
  // D1-D8 or W1-W12
  d1: number; d2: number; d3: number; d4: number;
  d5: number; d6: number; d7: number; d8: number;
  w1: number; w2: number; w3: number; w4: number;
  w5: number; w6: number; w7: number; w8: number;
  w9: number; w10: number; w11: number; w12: number;
}

function parseInitialDailySheet(wb: XLSX.WorkBook): InitialSalesRow[] {
  const sheetName = wb.SheetNames.find((n) => n.includes('일별'));
  if (!sheetName) {
    log('Warning: 초동매출 일별 sheet not found');
    return [];
  }

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
  const results: InitialSalesRow[] = [];
  const skipped: { row: number; reason: string }[] = [];

  // Data starts at row index 2 (after 2 header rows)
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const titleKR = String(row[0] ?? '').trim();
    if (!titleKR) continue;

    const platformRaw = String(row[1] ?? '').trim();
    const platformCode = PLATFORM_CODE_MAP[platformRaw] ?? platformRaw.toLowerCase();

    const launchDate = excelDateToString(row[4]);
    if (!launchDate) {
      skipped.push({ row: i + 1, reason: `invalid launch date: ${row[4]}` });
      continue;
    }

    results.push({
      title_kr: titleKR,
      platform_code: platformCode,
      genre_kr: String(row[2] ?? '').trim() || null,
      pf_genre: String(row[3] ?? '').trim() || null,
      launch_type: String(row[5] ?? '비독점').trim() || '비독점',
      launch_date: launchDate,
      launch_episodes: toNum(row[6]),
      d1: toNum(row[7]),
      d2: toNum(row[8]),
      d3: toNum(row[9]),
      d4: toNum(row[10]),
      d5: toNum(row[11]),
      d6: toNum(row[12]),
      d7: toNum(row[13]),
      d8: toNum(row[14]),
      // Weekly columns not present in daily sheet — zero fill
      w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, w6: 0,
      w7: 0, w8: 0, w9: 0, w10: 0, w11: 0, w12: 0,
    });
  }

  if (skipped.length > 0) {
    log(`초동매출 일별: skipped ${skipped.length} rows`);
    for (const s of skipped.slice(0, 10)) {
      log(`  Row ${s.row}: ${s.reason}`);
    }
  }

  return results;
}

function parseInitialWeeklySheet(wb: XLSX.WorkBook): InitialSalesRow[] {
  const sheetName = wb.SheetNames.find((n) => n.includes('주간'));
  if (!sheetName) {
    log('Warning: 초동매출 주간 sheet not found');
    return [];
  }

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
  const results: InitialSalesRow[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const titleKR = String(row[0] ?? '').trim();
    if (!titleKR) continue;

    const platformRaw = String(row[1] ?? '').trim();
    const platformCode = PLATFORM_CODE_MAP[platformRaw] ?? platformRaw.toLowerCase();

    const launchDate = excelDateToString(row[4]);
    if (!launchDate) {
      skipped.push({ row: i + 1, reason: `invalid launch date: ${row[4]}` });
      continue;
    }

    results.push({
      title_kr: titleKR,
      platform_code: platformCode,
      genre_kr: String(row[2] ?? '').trim() || null,
      pf_genre: String(row[3] ?? '').trim() || null,
      launch_type: String(row[5] ?? '비독점').trim() || '비독점',
      launch_date: launchDate,
      launch_episodes: toNum(row[6]),
      // Daily columns not present in weekly sheet — zero fill
      d1: 0, d2: 0, d3: 0, d4: 0, d5: 0, d6: 0, d7: 0, d8: 0,
      w1: toNum(row[7]),
      w2: toNum(row[8]),
      w3: toNum(row[9]),
      w4: toNum(row[10]),
      w5: toNum(row[11]),
      w6: toNum(row[12]),
      w7: toNum(row[13]),
      w8: toNum(row[14]),
      w9: toNum(row[15]),
      w10: toNum(row[16]),
      w11: toNum(row[17]),
      w12: toNum(row[18]),
    });
  }

  if (skipped.length > 0) {
    log(`초동매출 주간: skipped ${skipped.length} rows`);
    for (const s of skipped.slice(0, 10)) {
      log(`  Row ${s.row}: ${s.reason}`);
    }
  }

  return results;
}

/**
 * Merge daily + weekly rows by (title_kr, platform_code, launch_date).
 * Daily sheet has D1-D8, weekly sheet has W1-W12.
 * Result is one combined row per unique key.
 */
function mergeInitialSalesRows(daily: InitialSalesRow[], weekly: InitialSalesRow[]): InitialSalesRow[] {
  const map = new Map<string, InitialSalesRow>();

  for (const row of daily) {
    const key = `${row.title_kr}|${row.platform_code}|${row.launch_date}`;
    map.set(key, { ...row });
  }

  for (const row of weekly) {
    const key = `${row.title_kr}|${row.platform_code}|${row.launch_date}`;
    const existing = map.get(key);
    if (existing) {
      // Merge weekly data into existing daily row
      existing.w1 = row.w1;
      existing.w2 = row.w2;
      existing.w3 = row.w3;
      existing.w4 = row.w4;
      existing.w5 = row.w5;
      existing.w6 = row.w6;
      existing.w7 = row.w7;
      existing.w8 = row.w8;
      existing.w9 = row.w9;
      existing.w10 = row.w10;
      existing.w11 = row.w11;
      existing.w12 = row.w12;
    } else {
      // Weekly-only row (no matching daily entry)
      map.set(key, { ...row });
    }
  }

  return Array.from(map.values());
}

async function seedInitialSales(): Promise<void> {
  log('');
  log('=== Part 2: 초동매출 → initial_sales ===');

  if (!fs.existsSync(INITIAL_SALES_PATH)) {
    logError(`File not found: ${INITIAL_SALES_PATH}`);
    return;
  }

  log(`Reading: ${path.basename(INITIAL_SALES_PATH)}`);
  const buf = fs.readFileSync(INITIAL_SALES_PATH);
  const wb = XLSX.read(buf, { type: 'buffer' });

  log(`Sheets: ${wb.SheetNames.join(', ')}`);

  const dailyRows = parseInitialDailySheet(wb);
  log(`Parsed ${dailyRows.length} rows from 초동매출 일별`);

  const weeklyRows = parseInitialWeeklySheet(wb);
  log(`Parsed ${weeklyRows.length} rows from 초동매출 주간`);

  const merged = mergeInitialSalesRows(dailyRows, weeklyRows);
  log(`Merged into ${merged.length} unique rows`);

  if (merged.length === 0) {
    log('No rows to insert. Skipping.');
    return;
  }

  // Insert in batches via upsert (ON CONFLICT)
  const BATCH_SIZE = 500;
  let totalInserted = 0;
  let totalErrors = 0;
  const totalBatches = Math.ceil(merged.length / BATCH_SIZE);

  for (let i = 0; i < merged.length; i += BATCH_SIZE) {
    const batch = merged.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const payload = batch.map((r) => ({
      title_kr: r.title_kr,
      platform_code: r.platform_code,
      genre_kr: r.genre_kr,
      pf_genre: r.pf_genre,
      launch_type: r.launch_type,
      launch_date: r.launch_date,
      launch_episodes: r.launch_episodes,
      d1: r.d1, d2: r.d2, d3: r.d3, d4: r.d4,
      d5: r.d5, d6: r.d6, d7: r.d7, d8: r.d8,
      w1: r.w1, w2: r.w2, w3: r.w3, w4: r.w4,
      w5: r.w5, w6: r.w6, w7: r.w7, w8: r.w8,
      w9: r.w9, w10: r.w10, w11: r.w11, w12: r.w12,
    }));

    const { error } = await supabase
      .from('initial_sales')
      .upsert(payload, { onConflict: 'title_kr,platform_code,launch_date' });

    if (error) {
      logError(`Batch ${batchNum}/${totalBatches} failed: ${error.message}`);
      totalErrors += batch.length;
      continue;
    }

    totalInserted += batch.length;

    process.stdout.write(
      `\r  Batch ${batchNum}/${totalBatches} (${Math.min(i + BATCH_SIZE, merged.length)} of ${merged.length} rows)`,
    );
  }

  console.log(''); // newline after progress
  log(`Initial sales complete: ${totalInserted} upserted, ${totalErrors} errors`);
}

// ---------------------------------------------------------------------------
// Part 3: Upload log
// ---------------------------------------------------------------------------

async function createUploadLog(
  uploadType: string,
  sourceFile: string,
  rowCount: number,
  status: string,
): Promise<void> {
  const { error } = await supabase.from('upload_logs').insert({
    upload_type: uploadType,
    source_file: sourceFile,
    row_count: rowCount,
    status,
  });
  if (error) {
    logError(`Failed to log upload: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now();
  log('Starting seed-v2...');
  log(`Supabase URL: ${SUPABASE_URL}`);
  log('');

  try {
    await seedDailySales();
    await createUploadLog('weekly_report', path.basename(WEEKLY_REPORT_PATH), 0, 'completed');
  } catch (err) {
    logError(`Daily sales seed failed: ${err instanceof Error ? err.message : String(err)}`);
    await createUploadLog('weekly_report', path.basename(WEEKLY_REPORT_PATH), 0, 'failed');
  }

  try {
    await seedInitialSales();
    await createUploadLog('initial_sales', path.basename(INITIAL_SALES_PATH), 0, 'completed');
  } catch (err) {
    logError(`Initial sales seed failed: ${err instanceof Error ? err.message : String(err)}`);
    await createUploadLog('initial_sales', path.basename(INITIAL_SALES_PATH), 0, 'failed');
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log('');
  log(`Done in ${elapsed}s`);
}

main().catch((err) => {
  logError(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
