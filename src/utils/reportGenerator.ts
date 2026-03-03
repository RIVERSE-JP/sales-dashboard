/**
 * reportGenerator.ts
 *
 * Generates a Weekly Report Excel file from ConvertedData.
 * Produces sheets: Daily_raw, Title, platform-specific sheets, PF별 주간매출추이
 */
import * as XLSX from 'xlsx';
import type { ConvertedData } from '@/utils/excelConverter';
import type { DailySale, TitleMaster } from '@/types';

/* ------------------------------------------------------------------ */
/*  Week helpers                                                       */
/* ------------------------------------------------------------------ */

/** Get Monday of the week containing the given date */
function getWeekMonday(dateStr: string): Date {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Generate weekly label like "2/16~2/22" */
function weekLabel(mondayStr: string): string {
  const mon = new Date(mondayStr);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const m1 = mon.getMonth() + 1;
  const d1 = mon.getDate();
  const m2 = sun.getMonth() + 1;
  const d2 = sun.getDate();
  return `${m1}/${d1}~${m2}/${d2}`;
}

/* ------------------------------------------------------------------ */
/*  Weekly aggregation per platform                                    */
/* ------------------------------------------------------------------ */

interface WeeklyRow {
  titleJP: string;
  titleKR: string;
  weeklyData: Record<string, number>; // weekLabel → sales
}

function buildWeeklyAggregation(
  dailySales: DailySale[],
  channel: string,
): WeeklyRow[] {
  const channelSales = dailySales.filter((s) => s.channel === channel);

  // Group by title → week → sum
  const titleMap = new Map<string, { titleKR: string; weeks: Map<string, number> }>();

  for (const s of channelSales) {
    const monday = formatDate(getWeekMonday(s.date));
    const label = weekLabel(monday);

    const entry = titleMap.get(s.titleJP) ?? { titleKR: s.titleKR, weeks: new Map() };
    entry.weeks.set(label, (entry.weeks.get(label) ?? 0) + s.sales);
    titleMap.set(s.titleJP, entry);
  }

  return [...titleMap.entries()].map(([titleJP, { titleKR, weeks }]) => ({
    titleJP,
    titleKR,
    weeklyData: Object.fromEntries(weeks),
  }));
}

/* ------------------------------------------------------------------ */
/*  Generate Weekly Report Excel                                       */
/* ------------------------------------------------------------------ */

export function generateWeeklyReport(data: ConvertedData): Blob {
  const wb = XLSX.utils.book_new();

  // 1. Daily_raw sheet
  addDailyRawSheet(wb, data.dailySales, data.titleMaster);

  // 2. Title sheet
  addTitleSheet(wb, data.titleMaster);

  // 3. Platform sheets
  const channels = [...new Set(data.dailySales.map((s) => s.channel))].sort();
  const channelNames: Record<string, string> = {
    mechacomic: '메챠코믹',
    cmoa: '코믹시모아',
    piccoma: '픽코마',
  };

  for (const ch of channels) {
    const sheetName = channelNames[ch] ?? ch;
    addPlatformSheet(wb, data.dailySales, ch, sheetName, data.titleMaster);
  }

  // 4. PF별 주간매출추이
  addPlatformWeeklyTrend(wb, data.dailySales, channels, channelNames);

  // Write to blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/* ------------------------------------------------------------------ */
/*  Sheet builders                                                     */
/* ------------------------------------------------------------------ */

function addDailyRawSheet(
  wb: XLSX.WorkBook,
  dailySales: DailySale[],
  titleMaster: TitleMaster[],
): void {
  const titleMap = new Map<string, TitleMaster>();
  for (const tm of titleMaster) {
    titleMap.set(tm.titleJP, tm);
  }

  const header = ['Title(JP)', 'Title(KR)', 'Channel Title(JP)', 'Channel', 'Date', 'Sales(without tax)'];
  const rows = dailySales.map((s) => [
    s.titleJP,
    titleMap.get(s.titleJP)?.titleKR ?? s.titleKR,
    s.titleJP, // Channel Title(JP) = titleJP for raw data
    s.channel,
    s.date,
    s.sales,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Daily_raw');
}

function addTitleSheet(wb: XLSX.WorkBook, titleMaster: TitleMaster[]): void {
  const header = ['Channel Title(JP)', 'Title(KR)', 'Title(JP)', 'シリーズ名', 'PF'];
  const rows = titleMaster.map((tm) => [
    tm.titleJP,
    tm.titleKR,
    tm.titleJP,
    tm.seriesName,
    tm.platforms.join(', '),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Title');
}

function addPlatformSheet(
  wb: XLSX.WorkBook,
  dailySales: DailySale[],
  channel: string,
  sheetName: string,
  titleMaster: TitleMaster[],
): void {
  const weeklyRows = buildWeeklyAggregation(dailySales, channel);

  // Collect all week labels sorted chronologically
  const allWeeks = new Set<string>();
  for (const r of weeklyRows) {
    for (const w of Object.keys(r.weeklyData)) allWeeks.add(w);
  }
  const sortedWeeks = [...allWeeks].sort((a, b) => {
    // Parse "M/D~M/D" to compare
    const parseWeek = (w: string) => {
      const [start] = w.split('~');
      const [m, d] = start.split('/').map(Number);
      return m * 100 + d;
    };
    return parseWeek(a) - parseWeek(b);
  });

  const titleMap = new Map<string, TitleMaster>();
  for (const tm of titleMaster) titleMap.set(tm.titleJP, tm);

  const header = ['작품명(JP)', '작품명(KR)', ...sortedWeeks, '전주대비%'];
  const rows = weeklyRows
    .map((r) => {
      const weekValues = sortedWeeks.map((w) => r.weeklyData[w] ?? 0);
      // 전주대비% = last week / second-to-last week
      let changePercent = '';
      if (sortedWeeks.length >= 2) {
        const last = r.weeklyData[sortedWeeks[sortedWeeks.length - 1]] ?? 0;
        const prev = r.weeklyData[sortedWeeks[sortedWeeks.length - 2]] ?? 0;
        if (prev > 0) {
          changePercent = `${Math.round((last / prev) * 100)}%`;
        }
      }
      return [
        r.titleJP,
        titleMap.get(r.titleJP)?.titleKR ?? r.titleKR,
        ...weekValues,
        changePercent,
      ];
    })
    .sort((a, b) => {
      // Sort by total sales desc
      const sumA = (a.slice(2, -1) as number[]).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
      const sumB = (b.slice(2, -1) as number[]).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
      return sumB - sumA;
    });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)); // Excel limit: 31 chars
}

function addPlatformWeeklyTrend(
  wb: XLSX.WorkBook,
  dailySales: DailySale[],
  channels: string[],
  channelNames: Record<string, string>,
): void {
  // Collect all week labels
  const allWeeks = new Set<string>();
  for (const s of dailySales) {
    const monday = formatDate(getWeekMonday(s.date));
    allWeeks.add(weekLabel(monday));
  }
  const sortedWeeks = [...allWeeks].sort((a, b) => {
    const parseWeek = (w: string) => {
      const [start] = w.split('~');
      const [m, d] = start.split('/').map(Number);
      return m * 100 + d;
    };
    return parseWeek(a) - parseWeek(b);
  });

  // Sum per channel per week
  const channelWeekMap = new Map<string, Map<string, number>>();
  for (const s of dailySales) {
    const monday = formatDate(getWeekMonday(s.date));
    const label = weekLabel(monday);
    const weekMap = channelWeekMap.get(s.channel) ?? new Map();
    weekMap.set(label, (weekMap.get(label) ?? 0) + s.sales);
    channelWeekMap.set(s.channel, weekMap);
  }

  const header = ['PF', ...sortedWeeks];
  const rows = channels.map((ch) => {
    const weekMap = channelWeekMap.get(ch) ?? new Map();
    return [channelNames[ch] ?? ch, ...sortedWeeks.map((w) => weekMap.get(w) ?? 0)];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'PF별 주간매출추이');
}
