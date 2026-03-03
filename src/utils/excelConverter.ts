/**
 * excelConverter.ts
 *
 * Client-side Excel → JSON conversion that mirrors scripts/convert_excel.py.
 * Uses SheetJS (xlsx) to parse Excel files in the browser.
 */
import * as XLSX from 'xlsx';
import type {
  DailySale,
  MonthlySummary,
  TitleSummary,
  PlatformSummary,
  TitleMaster,
} from '@/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ConvertedData {
  dailySales: DailySale[];
  monthlySummary: MonthlySummary[];
  titleSummary: TitleSummary[];
  platformSummary: PlatformSummary[];
  titleMaster: TitleMaster[];
}

export interface PreviewInfo {
  totalRows: number;
  dateRange: { start: string; end: string };
  platformCount: number;
  platforms: string[];
  titleCount: number;
  hasTitleSheet: boolean;
}

interface RawRow {
  titleJP: string;
  titleKR: string;
  channel: string;
  date: string;
  month: string;
  sales: number;
}

interface TitleRow {
  titleJP: string;
  titleKR: string;
  seriesName: string;
  platform: string;
}

/* ------------------------------------------------------------------ */
/*  Channel normalization (matches convert_excel.py)                    */
/* ------------------------------------------------------------------ */

const CHANNEL_NORMALIZE: Record<string, string> = {
  piccoma: 'piccoma',
  Piccoma: 'piccoma',
  cmoa: 'cmoa',
  CMOA: 'cmoa',
};

function normalizeChannel(raw: unknown): string {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim();
  return CHANNEL_NORMALIZE[s] ?? s;
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

function parseExcelDate(val: unknown): string | null {
  if (val == null) return null;

  // SheetJS may return a JS Date or a serial number
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return formatDate(val);
  }

  if (typeof val === 'number') {
    // Excel serial date → JS Date
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return null;
    const mm = String(d.m).padStart(2, '0');
    const dd = String(d.d).padStart(2, '0');
    return `${d.y}-${mm}-${dd}`;
  }

  // Try string parsing
  const d = new Date(String(val));
  if (isNaN(d.getTime())) return null;
  return formatDate(d);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonth(dateStr: string): string {
  return dateStr.slice(0, 7); // "2025-03-01" → "2025-03"
}

/* ------------------------------------------------------------------ */
/*  Core: read Excel file                                              */
/* ------------------------------------------------------------------ */

export async function readExcelFile(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array', cellDates: true });
}

/* ------------------------------------------------------------------ */
/*  Preview: quick scan without full conversion                        */
/* ------------------------------------------------------------------ */

export function getPreview(workbook: XLSX.WorkBook): PreviewInfo {
  const dailyRows = parseDailyRaw(workbook);
  const hasTitleSheet = workbook.SheetNames.some(
    (n) => n.toLowerCase() === 'title',
  );

  const dates = dailyRows.map((r) => r.date).sort();
  const platforms = [...new Set(dailyRows.map((r) => r.channel))].filter(Boolean);
  const titles = new Set(dailyRows.map((r) => r.titleJP));

  return {
    totalRows: dailyRows.length,
    dateRange: {
      start: dates[0] ?? '',
      end: dates[dates.length - 1] ?? '',
    },
    platformCount: platforms.length,
    platforms,
    titleCount: titles.size,
    hasTitleSheet,
  };
}

/* ------------------------------------------------------------------ */
/*  Parse Daily_raw sheet                                              */
/* ------------------------------------------------------------------ */

function parseDailyRaw(workbook: XLSX.WorkBook): RawRow[] {
  const sheetName = workbook.SheetNames.find(
    (n) => n.toLowerCase().replace(/[_\s]/g, '') === 'dailyraw',
  );
  if (!sheetName) throw new Error('Daily_raw 시트를 찾을 수 없습니다');

  const sheet = workbook.Sheets[sheetName];
  // Header at row index 1 (second row in Excel)
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: 1,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  }) as unknown as unknown[][];

  // Find header row (row with "Title(JP)" in it)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(json.length, 5); i++) {
    const row = json[i];
    if (Array.isArray(row) && row.some((c) => String(c).includes('Title(JP)'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) throw new Error('Daily_raw 시트에서 헤더 행을 찾을 수 없습니다');

  const headers = (json[headerIdx] as unknown[]).map((h) => String(h ?? '').trim());

  const colIdx = {
    titleJP: headers.indexOf('Title(JP)'),
    titleKR: headers.indexOf('Title(KR)'),
    channel: headers.indexOf('Channel'),
    date: headers.indexOf('Date'),
    sales: headers.indexOf('Sales(without tax)'),
  };

  if (colIdx.date === -1 || colIdx.sales === -1) {
    throw new Error('필수 컬럼(Date, Sales)을 찾을 수 없습니다');
  }

  const rows: RawRow[] = [];
  // Re-read with raw values for proper date handling
  const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: 1,
    raw: true,
  }) as unknown as unknown[][];

  for (let i = headerIdx + 1; i < rawJson.length; i++) {
    const row = rawJson[i];
    if (!Array.isArray(row)) continue;

    const dateStr = parseExcelDate(row[colIdx.date]);
    if (!dateStr) continue;

    const salesVal = Number(row[colIdx.sales]);
    if (!salesVal || salesVal <= 0) continue;

    rows.push({
      titleJP: String(row[colIdx.titleJP] ?? ''),
      titleKR: String(row[colIdx.titleKR] ?? ''),
      channel: normalizeChannel(row[colIdx.channel]),
      date: dateStr,
      month: getMonth(dateStr),
      sales: Math.round(salesVal),
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Parse Title sheet                                                  */
/* ------------------------------------------------------------------ */

function parseTitleSheet(workbook: XLSX.WorkBook): TitleRow[] {
  const sheetName = workbook.SheetNames.find(
    (n) => n.toLowerCase() === 'title',
  );
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: 1,
    raw: true,
  }) as unknown as unknown[][];

  // Find header row (row with "Title(JP)" in it)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(json.length, 5); i++) {
    const row = json[i];
    if (Array.isArray(row) && row.some((c) => String(c).includes('Title(JP)'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = (json[headerIdx] as unknown[]).map((h) => String(h ?? '').trim());

  const colIdx = {
    titleJP: headers.indexOf('Title(JP)'),
    titleKR: headers.indexOf('Title(KR)'),
    seriesName: headers.findIndex((h) => h === 'シリーズ名'),
    platform: headers.indexOf('PF'),
  };

  const rows: TitleRow[] = [];
  for (let i = headerIdx + 1; i < json.length; i++) {
    const row = json[i];
    if (!Array.isArray(row)) continue;

    const titleJP = String(row[colIdx.titleJP] ?? '').trim();
    if (!titleJP) continue;

    rows.push({
      titleJP,
      titleKR: String(row[colIdx.titleKR] ?? ''),
      seriesName: colIdx.seriesName >= 0 ? String(row[colIdx.seriesName] ?? '') : '',
      platform: colIdx.platform >= 0 ? normalizeChannel(row[colIdx.platform]) : '',
    });
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Full conversion: Excel → all 5 JSON structures                     */
/* ------------------------------------------------------------------ */

export function convertExcel(workbook: XLSX.WorkBook): ConvertedData {
  const rawRows = parseDailyRaw(workbook);
  const titleRows = parseTitleSheet(workbook);

  // 1. dailySales
  const dailySales: DailySale[] = rawRows.map((r) => ({
    titleKR: r.titleKR,
    titleJP: r.titleJP,
    channel: r.channel,
    date: r.date,
    sales: r.sales,
  }));

  // 2. titleMaster (from Title sheet + supplement from daily data)
  const titleMaster = buildTitleMasterFromSheet(titleRows, rawRows);

  // 3-5. Use extracted builders
  const monthlySummary = buildMonthlySummary(dailySales);
  const titleSummary = buildTitleSummary(dailySales, titleMaster);
  const platformSummary = buildPlatformSummary(dailySales);

  return { dailySales, monthlySummary, titleSummary, platformSummary, titleMaster };
}

/* ------------------------------------------------------------------ */
/*  Internal: build TitleMaster from Title sheet                       */
/* ------------------------------------------------------------------ */

function buildTitleMasterFromSheet(titleRows: TitleRow[], rawRows: RawRow[]): TitleMaster[] {
  const masterMap = new Map<string, { titleKR: string; seriesName: string; platforms: Set<string> }>();

  for (const tr of titleRows) {
    const existing = masterMap.get(tr.titleJP);
    if (existing) {
      if (tr.platform) existing.platforms.add(tr.platform);
      if (!existing.titleKR && tr.titleKR) existing.titleKR = tr.titleKR;
      if (!existing.seriesName && tr.seriesName) existing.seriesName = tr.seriesName;
    } else {
      masterMap.set(tr.titleJP, {
        titleKR: tr.titleKR,
        seriesName: tr.seriesName,
        platforms: tr.platform ? new Set([tr.platform]) : new Set(),
      });
    }
  }

  if (titleRows.length === 0) {
    for (const r of rawRows) {
      const existing = masterMap.get(r.titleJP);
      if (existing) {
        if (r.channel) existing.platforms.add(r.channel);
      } else {
        masterMap.set(r.titleJP, {
          titleKR: r.titleKR,
          seriesName: '',
          platforms: r.channel ? new Set([r.channel]) : new Set(),
        });
      }
    }
  }

  return [...masterMap.entries()].map(([titleJP, { titleKR, seriesName, platforms }]) => ({
    titleKR,
    titleJP,
    seriesName,
    platforms: [...platforms].sort(),
  }));
}

/* ------------------------------------------------------------------ */
/*  Exported summary builders (reused by dataConsolidator)             */
/* ------------------------------------------------------------------ */

export function buildMonthlySummary(dailySales: DailySale[]): MonthlySummary[] {
  const monthMap = new Map<string, { total: number; platforms: Map<string, number> }>();
  for (const r of dailySales) {
    const month = r.date.slice(0, 7);
    const entry = monthMap.get(month) ?? { total: 0, platforms: new Map() };
    entry.total += r.sales;
    entry.platforms.set(r.channel, (entry.platforms.get(r.channel) ?? 0) + r.sales);
    monthMap.set(month, entry);
  }
  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { total, platforms }]) => ({
      month,
      totalSales: total,
      platforms: Object.fromEntries([...platforms.entries()].filter(([, v]) => v > 0)),
    }));
}

export function buildTitleSummary(
  dailySales: DailySale[],
  titleMaster: TitleMaster[],
): TitleSummary[] {
  const seriesMap = new Map<string, string>();
  const titleKRMap = new Map<string, string>();
  for (const tm of titleMaster) {
    if (tm.seriesName && !seriesMap.has(tm.titleJP)) {
      seriesMap.set(tm.titleJP, tm.seriesName);
    }
    if (tm.titleKR && !titleKRMap.has(tm.titleJP)) {
      titleKRMap.set(tm.titleJP, tm.titleKR);
    }
  }

  const titleGroupMap = new Map<string, DailySale[]>();
  for (const r of dailySales) {
    const arr = titleGroupMap.get(r.titleJP) ?? [];
    arr.push(r);
    titleGroupMap.set(r.titleJP, arr);
  }

  const result: TitleSummary[] = [];
  for (const [titleJP, rows] of titleGroupMap) {
    const titleKR = rows[0].titleKR || titleKRMap.get(titleJP) || '';
    const totalSales = rows.reduce((s, r) => s + r.sales, 0);

    const platMap = new Map<string, number>();
    for (const r of rows) {
      platMap.set(r.channel, (platMap.get(r.channel) ?? 0) + r.sales);
    }
    const platforms = [...platMap.entries()]
      .filter(([, s]) => s > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, sales]) => ({ name, sales }));

    const dailyMap = new Map<string, number>();
    for (const r of rows) {
      dailyMap.set(r.date, (dailyMap.get(r.date) ?? 0) + r.sales);
    }
    const uniqueDays = dailyMap.size;
    const dailyAvg = uniqueDays > 0 ? Math.round((totalSales / uniqueDays) * 100) / 100 : 0;

    let peakDate = '';
    let peakSales = 0;
    for (const [d, s] of dailyMap) {
      if (s > peakSales) {
        peakDate = d;
        peakSales = s;
      }
    }

    const dates = rows.map((r) => r.date).sort();
    const firstDate = dates[0] ?? '';
    const lastDate = dates[dates.length - 1] ?? '';

    const monthTrendMap = new Map<string, number>();
    for (const r of rows) {
      const month = r.date.slice(0, 7);
      monthTrendMap.set(month, (monthTrendMap.get(month) ?? 0) + r.sales);
    }
    const monthlyTrend = [...monthTrendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, sales]) => ({ month, sales }));

    result.push({
      titleKR,
      titleJP,
      seriesName: seriesMap.get(titleJP) ?? '',
      totalSales,
      platforms,
      dailyAvg,
      peakDate,
      peakSales,
      firstDate,
      lastDate,
      monthlyTrend,
    });
  }
  result.sort((a, b) => b.totalSales - a.totalSales);
  return result;
}

export function buildPlatformSummary(dailySales: DailySale[]): PlatformSummary[] {
  const platGroupMap = new Map<string, DailySale[]>();
  for (const r of dailySales) {
    const arr = platGroupMap.get(r.channel) ?? [];
    arr.push(r);
    platGroupMap.set(r.channel, arr);
  }

  const result: PlatformSummary[] = [];
  for (const [platform, rows] of platGroupMap) {
    const totalSales = rows.reduce((s, r) => s + r.sales, 0);
    const titleCount = new Set(rows.map((r) => r.titleJP)).size;

    const mtMap = new Map<string, number>();
    for (const r of rows) {
      const month = r.date.slice(0, 7);
      mtMap.set(month, (mtMap.get(month) ?? 0) + r.sales);
    }
    const monthlyTrend = [...mtMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, sales]) => ({ month, sales }));

    const titleSalesMap = new Map<string, { titleKR: string; titleJP: string; sales: number }>();
    for (const r of rows) {
      const existing = titleSalesMap.get(r.titleJP);
      if (existing) {
        existing.sales += r.sales;
      } else {
        titleSalesMap.set(r.titleJP, { titleKR: r.titleKR, titleJP: r.titleJP, sales: r.sales });
      }
    }
    const topTitles = [...titleSalesMap.values()]
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    result.push({ platform, totalSales, titleCount, monthlyTrend, topTitles });
  }
  result.sort((a, b) => b.totalSales - a.totalSales);
  return result;
}

/** Build TitleMaster from dailySales, optionally merging with existing master */
export function buildTitleMasterFromSales(
  dailySales: DailySale[],
  existingMaster?: TitleMaster[],
): TitleMaster[] {
  const masterMap = new Map<string, { titleKR: string; seriesName: string; platforms: Set<string> }>();

  if (existingMaster) {
    for (const tm of existingMaster) {
      masterMap.set(tm.titleJP, {
        titleKR: tm.titleKR,
        seriesName: tm.seriesName,
        platforms: new Set(tm.platforms),
      });
    }
  }

  for (const r of dailySales) {
    const existing = masterMap.get(r.titleJP);
    if (existing) {
      if (r.channel) existing.platforms.add(r.channel);
      if (!existing.titleKR && r.titleKR) existing.titleKR = r.titleKR;
    } else {
      masterMap.set(r.titleJP, {
        titleKR: r.titleKR || r.titleJP,
        seriesName: '',
        platforms: r.channel ? new Set([r.channel]) : new Set(),
      });
    }
  }

  return [...masterMap.entries()].map(([titleJP, { titleKR, seriesName, platforms }]) => ({
    titleKR,
    titleJP,
    seriesName,
    platforms: [...platforms].sort(),
  }));
}
