/**
 * Report Exporter — generates Excel/CSV files in various report formats.
 * The "Weekly Report" format matches the original [RVJP-RVKR] Weekly Report.xlsx layout.
 */
import type { CellFormulaValue } from 'exceljs';
import { saveAs } from 'file-saver';
import type { DailySale } from '@/types';

// ============================================================
// Types
// ============================================================

export interface ReportOptions {
  startDate: string;
  endDate: string;
  platforms?: string[];
  titles?: string[];
}

// ============================================================
// Weekly Report Format (matches original exactly)
// ============================================================

export async function generateWeeklyReport(
  data: DailySale[],
  options: ReportOptions,
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Daily_raw');

  const lastDataRow = data.length + 2;

  // ---------- Column widths (원본과 동일) ----------
  ws.getColumn(1).width = 25.57; // Title JP
  ws.getColumn(2).width = 31.29; // Title KR
  ws.getColumn(3).width = 36.57; // Channel Title
  ws.getColumn(4).width = 14.86; // Channel
  ws.getColumn(5).width = 15.43; // Date
  ws.getColumn(6).width = 22.43; // Sales

  // ---------- Row 1: SUBTOTAL formula ----------
  const row1 = ws.getRow(1);
  row1.getCell(6).value = {
    formula: `SUBTOTAL(9,F3:F${lastDataRow})`,
    result: undefined,
  } as CellFormulaValue;
  row1.getCell(6).numFmt = '#,##0';

  // ---------- Row 2: Headers ----------
  const headers = [
    'Title(JP)',
    'Title(KR)',
    'Channel Title(JP)',
    'Channel',
    'Date',
    'Sales(without tax)',
  ];
  const headerRow = ws.getRow(2);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { size: 10, color: { argb: 'FF000000' }, name: 'Arial' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E2F3' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 16.5;

  // ---------- Row 3+: Data rows (원본과 동일: 교대 행 없음, 보더 없음) ----------
  // 원본에 교대 행/보더 없음

  data.forEach((row, idx) => {
    const r = ws.getRow(idx + 3);
    r.getCell(1).value = row.title_jp;
    r.getCell(2).value = row.title_kr || '';
    r.getCell(3).value = row.title_jp; // channel_title_jp fallback
    r.getCell(4).value = row.channel;

    // Parse date properly
    const parts = row.sale_date.split('-');
    if (parts.length === 3) {
      r.getCell(5).value = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
        12, 0, 0,
      );
    } else {
      r.getCell(5).value = new Date(row.sale_date);
    }
    r.getCell(5).numFmt = 'yyyy/mm/dd';

    r.getCell(6).value = row.sales_amount;
    r.getCell(6).numFmt = '#,##0';

    // 원본에 교대 행 없음, 폰트 설정
    for (let c = 1; c <= 6; c++) {
      r.getCell(c).font = { size: 10, name: 'Arial' };
    }

    // 원본에 보더 없음
  });

  // ---------- Auto filter ----------
  ws.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: lastDataRow, column: 6 },
  };

  // ---------- Frozen Panes ----------
  ws.views = [
    {
      state: 'frozen',
      xSplit: 0,
      ySplit: 2,
      topLeftCell: 'A3',
      activeCell: 'A3',
    },
  ];

  // ---------- Download ----------
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileName = `[RVJP-RVKR] Weekly Report_${options.startDate}_${options.endDate}.xlsx`;
  saveAs(blob, fileName);
}

// ============================================================
// Platform Performance Report
// ============================================================

export async function generatePlatformReport(
  data: DailySale[],
  options: ReportOptions,
): Promise<void> {
  // Group by platform
  const platformMap = new Map<string, { sales: number; titles: Set<string>; days: Set<string> }>();
  data.forEach((row) => {
    const entry = platformMap.get(row.channel) ?? { sales: 0, titles: new Set(), days: new Set() };
    entry.sales += row.sales_amount;
    entry.titles.add(row.title_jp);
    entry.days.add(row.sale_date);
    platformMap.set(row.channel, entry);
  });

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Platform Performance');

  ws.getColumn(1).width = 25;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 15;
  ws.getColumn(4).width = 15;
  ws.getColumn(5).width = 18;

  const headers = ['Platform', 'Total Sales', 'Titles', 'Days', 'Daily Average'];
  const headerRow = ws.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  const sorted = [...platformMap.entries()].sort((a, b) => b[1].sales - a[1].sales);
  sorted.forEach(([platform, info], idx) => {
    const r = ws.getRow(idx + 2);
    r.getCell(1).value = platform;
    r.getCell(2).value = info.sales;
    r.getCell(2).numFmt = '#,##0';
    r.getCell(3).value = info.titles.size;
    r.getCell(4).value = info.days.size;
    r.getCell(5).value = info.days.size > 0 ? Math.round(info.sales / info.days.size) : 0;
    r.getCell(5).numFmt = '#,##0';
  });

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: sorted.length + 1, column: 5 } };
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }];

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Platform_Report_${options.startDate}_${options.endDate}.xlsx`,
  );
}

// ============================================================
// Title Performance Report
// ============================================================

export async function generateTitleReport(
  data: DailySale[],
  options: ReportOptions,
): Promise<void> {
  const titleMap = new Map<string, { title_kr: string | null; sales: number; channels: Set<string>; days: Set<string> }>();
  data.forEach((row) => {
    const entry = titleMap.get(row.title_jp) ?? { title_kr: row.title_kr, sales: 0, channels: new Set(), days: new Set() };
    entry.sales += row.sales_amount;
    entry.channels.add(row.channel);
    entry.days.add(row.sale_date);
    titleMap.set(row.title_jp, entry);
  });

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Title Performance');

  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 25;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 25;
  ws.getColumn(5).width = 15;
  ws.getColumn(6).width = 18;

  const headers = ['Title(JP)', 'Title(KR)', 'Total Sales', 'Platforms', 'Days', 'Daily Average'];
  const headerRow = ws.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  const sorted = [...titleMap.entries()].sort((a, b) => b[1].sales - a[1].sales);
  sorted.forEach(([title, info], idx) => {
    const r = ws.getRow(idx + 2);
    r.getCell(1).value = title;
    r.getCell(2).value = info.title_kr || '';
    r.getCell(3).value = info.sales;
    r.getCell(3).numFmt = '#,##0';
    r.getCell(4).value = [...info.channels].join(', ');
    r.getCell(5).value = info.days.size;
    r.getCell(6).value = info.days.size > 0 ? Math.round(info.sales / info.days.size) : 0;
    r.getCell(6).numFmt = '#,##0';
  });

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: sorted.length + 1, column: 6 } };
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }];

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Title_Report_${options.startDate}_${options.endDate}.xlsx`,
  );
}

// ============================================================
// CSV Export
// ============================================================

export function generateCSV(data: DailySale[], options: ReportOptions): void {
  const headers = ['Title(JP)', 'Title(KR)', 'Channel', 'Date', 'Sales(without tax)'];
  const csvRows = [headers.join(',')];

  data.forEach((row) => {
    csvRows.push([
      `"${(row.title_jp || '').replace(/"/g, '""')}"`,
      `"${(row.title_kr || '').replace(/"/g, '""')}"`,
      `"${row.channel}"`,
      row.sale_date,
      String(row.sales_amount),
    ].join(','));
  });

  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `RVJP_export_${options.startDate}_${options.endDate}.csv`);
}
