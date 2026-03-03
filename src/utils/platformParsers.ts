/**
 * platformParsers.ts
 *
 * Auto-detect platform from filenames and parse raw sales data (속보치)
 * into DailySale[] format.
 *
 * Supported platforms:
 * - mechacomic: 4 Shift-JIS CSVs (sp/app × chapter/volume daily_sales_log)
 * - cmoa (シーモア): Monthly Excel with Q003_売上 sheet
 * - piccoma: Daily UTF-8 CSVs (TOTAL_Product_KPI_YYYYMMDD)
 * - generic: Any CSV/Excel with user-defined column mapping
 */
import * as XLSX from 'xlsx';
import type { DailySale } from '@/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ClassifiedFiles {
  mechacomic: File[];
  cmoa: File[];
  piccoma: File[];
  unknown: File[];
}

export interface ColumnMapping {
  platform: string;
  titleColumn: number;
  dateColumn: number | null;
  salesColumn: number;
  dateInHeaders: boolean;
  headerRowIndex: number;
  encoding: 'utf-8' | 'shift-jis';
}

export interface FilePreview {
  headers: string[];
  rows: string[][];
  sheetNames?: string[];
}

export interface ParseSummary {
  platform: string;
  count: number;
  dateRange: [string, string];
}

/* ------------------------------------------------------------------ */
/*  File classification (auto-detect)                                  */
/* ------------------------------------------------------------------ */

export async function classifyFiles(files: File[]): Promise<ClassifiedFiles> {
  const result: ClassifiedFiles = {
    mechacomic: [],
    cmoa: [],
    piccoma: [],
    unknown: [],
  };

  for (const file of files) {
    const name = file.name.toLowerCase();

    if (name.includes('daily_sales_log') && name.endsWith('.csv')) {
      result.mechacomic.push(file);
    } else if (name.includes('total_product_kpi') && name.endsWith('.csv')) {
      result.piccoma.push(file);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      // Check if it has a Q003 sheet
      const isSimoa = await checkSimoaFile(file);
      if (isSimoa) {
        result.cmoa.push(file);
      } else {
        result.unknown.push(file);
      }
    } else {
      result.unknown.push(file);
    }
  }

  return result;
}

async function checkSimoaFile(file: File): Promise<boolean> {
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', sheetRows: 1 });
    return wb.SheetNames.some((n) => n.includes('Q003'));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  CSV reading helpers                                                */
/* ------------------------------------------------------------------ */

async function readFileAsText(file: File, encoding: string = 'utf-8'): Promise<string> {
  const buffer = await file.arrayBuffer();
  const decoder = new TextDecoder(encoding);
  return decoder.decode(buffer);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map(parseCSVLine);
}

function formatDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  Mechacomic parser                                                  */
/* ------------------------------------------------------------------ */

export async function parseMechacomic(files: File[]): Promise<DailySale[]> {
  const salesMap = new Map<string, number>();

  for (const file of files) {
    const text = await readFileAsText(file, 'shift-jis');
    const rows = parseCSV(text);
    if (rows.length < 2) continue;

    const headers = rows[0];
    const dateIdx = headers.findIndex((h) => h === '日付');
    const titleIdx = headers.findIndex((h) => h === 'ブック名');
    const salesIdx = headers.findIndex((h) => h === '購入ポイント数');

    if (dateIdx === -1 || titleIdx === -1 || salesIdx === -1) continue;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[dateIdx] || !row[titleIdx]) continue;

      const dateRaw = row[dateIdx];
      const title = row[titleIdx];
      const sales = parseInt(row[salesIdx], 10) || 0;
      if (sales <= 0) continue;

      // Date format: "2026/02/23" or "2026-02-23"
      const dateStr = dateRaw.replace(/\//g, '-').slice(0, 10);
      const key = `${title}||${dateStr}`;
      salesMap.set(key, (salesMap.get(key) ?? 0) + sales);
    }
  }

  const result: DailySale[] = [];
  for (const [key, sales] of salesMap) {
    const [titleJP, date] = key.split('||');
    result.push({
      titleKR: titleJP,
      titleJP,
      channel: 'mechacomic',
      date,
      sales,
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/* ------------------------------------------------------------------ */
/*  Cmoa (シーモア) parser                                              */
/* ------------------------------------------------------------------ */

export async function parseCmoa(files: File[]): Promise<DailySale[]> {
  const salesMap = new Map<string, number>();

  for (const file of files) {
    // Extract year-month from filename (e.g., "202602.xlsx")
    const match = file.name.match(/(\d{4})(\d{2})/);
    if (!match) continue;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    const sheetName = wb.SheetNames.find((n) => n.includes('Q003'));
    if (!sheetName) continue;

    const sheet = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      header: 1,
      raw: true,
    }) as unknown as unknown[][];

    if (json.length < 2) continue;

    const headers = (json[0] as unknown[]).map((h) => String(h ?? '').trim());
    const titleIdx = headers.findIndex((h) => h === 'タイトル名');
    if (titleIdx === -1) continue;

    // Find day columns (1日, 2日, ..., 31日)
    const dayColumns: { idx: number; day: number }[] = [];
    for (let c = 0; c < headers.length; c++) {
      const dayMatch = headers[c].match(/^(\d{1,2})日$/);
      if (dayMatch) {
        dayColumns.push({ idx: c, day: parseInt(dayMatch[1], 10) });
      }
    }

    for (let i = 1; i < json.length; i++) {
      const row = json[i] as unknown[];
      if (!row) continue;
      const title = String(row[titleIdx] ?? '').trim();
      if (!title) continue;

      for (const { idx, day } of dayColumns) {
        const val = Number(row[idx]) || 0;
        if (val <= 0) continue;

        // Validate day for this month
        const maxDay = new Date(year, month, 0).getDate();
        if (day > maxDay) continue;

        const dateStr = formatDateStr(year, month, day);
        const key = `${title}||${dateStr}`;
        salesMap.set(key, (salesMap.get(key) ?? 0) + val);
      }
    }
  }

  const result: DailySale[] = [];
  for (const [key, sales] of salesMap) {
    const [titleJP, date] = key.split('||');
    result.push({
      titleKR: titleJP,
      titleJP,
      channel: 'cmoa',
      date,
      sales: Math.round(sales),
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/* ------------------------------------------------------------------ */
/*  Piccoma parser                                                     */
/* ------------------------------------------------------------------ */

export async function parsePiccoma(files: File[]): Promise<DailySale[]> {
  const result: DailySale[] = [];

  for (const file of files) {
    const text = await readFileAsText(file, 'utf-8');
    const rows = parseCSV(text);
    if (rows.length < 2) continue;

    const headers = rows[0];
    const titleIdx = headers.findIndex((h) => h === '作品名');
    if (titleIdx === -1) continue;

    // Find "[DATE] Total売上" column — date format in header like "2026/02/23 Total売上"
    let totalSalesIdx = -1;
    let dateStr = '';
    for (let c = 0; c < headers.length; c++) {
      const m = headers[c].match(/(\d{4}\/\d{2}\/\d{2})\s*Total売上/);
      if (m) {
        totalSalesIdx = c;
        dateStr = m[1].replace(/\//g, '-');
        break;
      }
    }

    // Fallback: try extracting date from filename (TOTAL_Product_KPI_YYYYMMDD_...)
    if (!dateStr) {
      const fnMatch = file.name.match(/(\d{4})(\d{2})(\d{2})/);
      if (fnMatch) {
        dateStr = `${fnMatch[1]}-${fnMatch[2]}-${fnMatch[3]}`;
      }
    }

    if (totalSalesIdx === -1 || !dateStr) continue;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const title = row[titleIdx]?.trim();
      if (!title) continue;

      const sales = parseInt(row[totalSalesIdx], 10) || 0;
      if (sales <= 0) continue;

      result.push({
        titleKR: title,
        titleJP: title,
        channel: 'piccoma',
        date: dateStr,
        sales,
      });
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/* ------------------------------------------------------------------ */
/*  Generic parser (for unknown platforms)                             */
/* ------------------------------------------------------------------ */

export async function parseGeneric(
  file: File,
  mapping: ColumnMapping,
): Promise<DailySale[]> {
  const isExcel = /\.xlsx?$/i.test(file.name);

  if (isExcel) {
    return parseGenericExcel(file, mapping);
  }
  return parseGenericCSV(file, mapping);
}

async function parseGenericCSV(file: File, mapping: ColumnMapping): Promise<DailySale[]> {
  const text = await readFileAsText(file, mapping.encoding);
  const allRows = parseCSV(text);
  if (allRows.length <= mapping.headerRowIndex + 1) return [];

  const headers = allRows[mapping.headerRowIndex];
  const dataRows = allRows.slice(mapping.headerRowIndex + 1);

  return convertGenericRows(headers, dataRows, mapping);
}

async function parseGenericExcel(file: File, mapping: ColumnMapping): Promise<DailySale[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: 1,
    raw: true,
  }) as unknown as unknown[][];

  if (json.length <= mapping.headerRowIndex + 1) return [];

  const headers = (json[mapping.headerRowIndex] as unknown[]).map((h) => String(h ?? ''));
  const dataRows = json.slice(mapping.headerRowIndex + 1).map((row) =>
    (row as unknown[]).map((c) => String(c ?? '')),
  );

  return convertGenericRows(headers, dataRows, mapping);
}

function convertGenericRows(
  headers: string[],
  dataRows: string[][],
  mapping: ColumnMapping,
): DailySale[] {
  const result: DailySale[] = [];

  if (mapping.dateInHeaders) {
    // Pivot mode: date columns in headers (like Cmoa)
    const dayColumns: { idx: number; dateStr: string }[] = [];
    for (let c = 0; c < headers.length; c++) {
      if (c === mapping.titleColumn || c === mapping.salesColumn) continue;
      const header = headers[c];
      const parsed = tryParseDate(header);
      if (parsed) {
        dayColumns.push({ idx: c, dateStr: parsed });
      }
    }

    for (const row of dataRows) {
      const title = row[mapping.titleColumn]?.trim();
      if (!title) continue;

      for (const { idx, dateStr } of dayColumns) {
        const val = parseFloat(row[idx]) || 0;
        if (val <= 0) continue;

        result.push({
          titleKR: title,
          titleJP: title,
          channel: mapping.platform,
          date: dateStr,
          sales: Math.round(val),
        });
      }
    }
  } else {
    // Normal mode: date in a column
    for (const row of dataRows) {
      const title = row[mapping.titleColumn]?.trim();
      if (!title) continue;

      const dateRaw = row[mapping.dateColumn!]?.trim();
      const dateStr = tryParseDate(dateRaw);
      if (!dateStr) continue;

      const sales = parseFloat(row[mapping.salesColumn]) || 0;
      if (sales <= 0) continue;

      result.push({
        titleKR: title,
        titleJP: title,
        channel: mapping.platform,
        date: dateStr,
        sales: Math.round(sales),
      });
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

function tryParseDate(str: string | undefined): string | null {
  if (!str) return null;
  const s = str.trim();

  // "2026-02-23" or "2026/02/23"
  const isoMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    return formatDateStr(parseInt(isoMatch[1]), parseInt(isoMatch[2]), parseInt(isoMatch[3]));
  }

  // "23日" (day only — needs context, return null for now)
  const dayOnlyMatch = s.match(/^(\d{1,2})日$/);
  if (dayOnlyMatch) {
    // Can't determine full date without year/month context
    return null;
  }

  // Try Date constructor as last resort
  const d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) {
    return formatDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  File preview (for generic parser UI)                               */
/* ------------------------------------------------------------------ */

export async function getFilePreview(
  file: File,
  encoding: string = 'utf-8',
): Promise<FilePreview> {
  const isExcel = /\.xlsx?$/i.test(file.name);

  if (isExcel) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', sheetRows: 6 });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      header: 1,
      raw: true,
    }) as unknown as unknown[][];

    const headers = (json[0] ?? []).map((h) => String(h ?? ''));
    const rows = json.slice(1, 6).map((row) =>
      (row as unknown[]).map((c) => String(c ?? '')),
    );

    return { headers, rows, sheetNames: wb.SheetNames };
  }

  // CSV
  const text = await readFileAsText(file, encoding);
  const allRows = parseCSV(text);
  const headers = allRows[0] ?? [];
  const rows = allRows.slice(1, 6);

  return { headers, rows };
}

/* ------------------------------------------------------------------ */
/*  Unified parsing                                                    */
/* ------------------------------------------------------------------ */

export async function parseAllPlatforms(
  classified: ClassifiedFiles,
  mappings: Map<File, ColumnMapping>,
): Promise<{
  sales: DailySale[];
  summary: ParseSummary[];
}> {
  const allSales: DailySale[] = [];
  const summary: ParseSummary[] = [];

  // Parse known platforms
  if (classified.mechacomic.length > 0) {
    const sales = await parseMechacomic(classified.mechacomic);
    allSales.push(...sales);
    if (sales.length > 0) {
      const dates = sales.map((s) => s.date).sort();
      summary.push({
        platform: 'mechacomic',
        count: new Set(sales.map((s) => s.titleJP)).size,
        dateRange: [dates[0], dates[dates.length - 1]],
      });
    }
  }

  if (classified.cmoa.length > 0) {
    const sales = await parseCmoa(classified.cmoa);
    allSales.push(...sales);
    if (sales.length > 0) {
      const dates = sales.map((s) => s.date).sort();
      summary.push({
        platform: 'cmoa',
        count: new Set(sales.map((s) => s.titleJP)).size,
        dateRange: [dates[0], dates[dates.length - 1]],
      });
    }
  }

  if (classified.piccoma.length > 0) {
    const sales = await parsePiccoma(classified.piccoma);
    allSales.push(...sales);
    if (sales.length > 0) {
      const dates = sales.map((s) => s.date).sort();
      summary.push({
        platform: 'piccoma',
        count: new Set(sales.map((s) => s.titleJP)).size,
        dateRange: [dates[0], dates[dates.length - 1]],
      });
    }
  }

  // Parse unknown files with user-provided mappings
  for (const file of classified.unknown) {
    const mapping = mappings.get(file);
    if (!mapping) continue;

    const sales = await parseGeneric(file, mapping);
    allSales.push(...sales);
    if (sales.length > 0) {
      const dates = sales.map((s) => s.date).sort();
      const existingSummary = summary.find((s) => s.platform === mapping.platform);
      if (existingSummary) {
        existingSummary.count += new Set(sales.map((s) => s.titleJP)).size;
        if (dates[0] < existingSummary.dateRange[0]) existingSummary.dateRange[0] = dates[0];
        if (dates[dates.length - 1] > existingSummary.dateRange[1]) {
          existingSummary.dateRange[1] = dates[dates.length - 1];
        }
      } else {
        summary.push({
          platform: mapping.platform,
          count: new Set(sales.map((s) => s.titleJP)).size,
          dateRange: [dates[0], dates[dates.length - 1]],
        });
      }
    }
  }

  return { sales: allSales, summary };
}
